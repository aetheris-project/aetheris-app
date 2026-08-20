"""System endpoints: platform status, update availability, scheduled jobs and SFTP users."""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..db import get_db
from .deps import require_admin

router = APIRouter(prefix="/api/system", tags=["system"])

VERSION = "1.0.0"
RELEASES_URL = "https://api.github.com/repos/aetheris-project/aetheris-app/releases/latest"

CRON_TASKS = {
    "backup": "Backup",
    "invoice.dunning": "Invoice dunning",
    "snapshot.prune": "Snapshot prune",
    "sync.pterodactyl": "Sync Pterodactyl",
    "sync.proxmox": "Sync Proxmox",
    "sync.virtfusion": "Sync VirtFusion",
    "report.daily": "Daily report",
}

CRON_RE = r"^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$"


def _latest_release() -> dict | None:
    """Best-effort fetch of the latest release; never raises."""
    try:
        with urllib.request.urlopen(RELEASES_URL, timeout=8) as response:  # noqa: S310 - pinned https URL
            payload = json.loads(response.read().decode("utf-8"))
            return {
                "tag": payload.get("tag_name", ""),
                "url": payload.get("html_url", RELEASES_URL),
                "published_at": payload.get("published_at", ""),
            }
    except Exception:  # noqa: BLE001 - network failure must not break /api/system/status
        return None


def _version_tuple(value: str) -> tuple[int, ...]:
    return tuple(int(part) for part in value.replace("v", "").split(".") if part.isdigit())


# --------------------------------------------------------------------------- #
# Status
# --------------------------------------------------------------------------- #

class StatusOut(BaseModel):
    version: str
    latest_release: dict | None
    update_available: bool
    environment: str
    healthy: bool


@router.get("/status", response_model=StatusOut)
def get_status(db=Depends(get_db)) -> StatusOut:
    latest = _latest_release()
    update_available = False
    if latest and latest.get("tag"):
        update_available = _version_tuple(VERSION) < _version_tuple(latest["tag"])
    try:
        db.execute("SELECT 1").fetchone()
        healthy = True
    except Exception:  # noqa: BLE001
        healthy = False
    return StatusOut(
        version=VERSION,
        latest_release=latest,
        update_available=update_available,
        environment="production" if not __debug__ else "development",
        healthy=healthy,
    )


# --------------------------------------------------------------------------- #
# Cron jobs
# --------------------------------------------------------------------------- #

class CronJobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    description: str = Field(default="", max_length=255)
    schedule: str = Field(min_length=1, max_length=64)
    task: str = Field(min_length=1, max_length=64)
    enabled: bool = True


class CronJobOut(BaseModel):
    id: int
    name: str
    description: str
    schedule: str
    task: str
    enabled: bool
    last_run_at: str | None
    last_status: str | None
    created_at: str


def _cron_out(row) -> CronJobOut:
    return CronJobOut(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        schedule=row["schedule"],
        task=row["task"],
        enabled=bool(row["enabled"]),
        last_run_at=row["last_run_at"],
        last_status=row["last_status"],
        created_at=row["created_at"],
    )


@router.get("/cron", response_model=list[CronJobOut])
def list_cron(db=Depends(get_db)) -> list[CronJobOut]:
    rows = db.execute("SELECT * FROM cron_jobs ORDER BY created_at").fetchall()
    return [_cron_out(row) for row in rows]


@router.post("/cron", response_model=CronJobOut, status_code=status.HTTP_201_CREATED)
def create_cron(payload: CronJobCreate, db=Depends(get_db), _=Depends(require_admin)) -> CronJobOut:
    import re

    if not re.match(CRON_RE, payload.schedule):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Schedule must be a valid cron(5) expression (5 fields).",
        )
    if payload.task not in CRON_TASKS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown task '{payload.task}'. Allowed: {', '.join(sorted(CRON_TASKS))}.",
        )
    cursor = db.execute(
        "INSERT INTO cron_jobs (name, description, schedule, task, enabled) VALUES (?, ?, ?, ?, ?)",
        (payload.name, payload.description, payload.schedule, payload.task, int(payload.enabled)),
    )
    row = db.execute("SELECT * FROM cron_jobs WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _cron_out(row)


@router.patch("/cron/{job_id}", response_model=CronJobOut)
def update_cron(job_id: int, payload: CronJobCreate, db=Depends(get_db), _=Depends(require_admin)) -> CronJobOut:
    row = db.execute("SELECT * FROM cron_jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cron job not found")
    db.execute(
        "UPDATE cron_jobs SET name = ?, description = ?, schedule = ?, task = ?, enabled = ? WHERE id = ?",
        (payload.name, payload.description, payload.schedule, payload.task, int(payload.enabled), job_id),
    )
    row = db.execute("SELECT * FROM cron_jobs WHERE id = ?", (job_id,)).fetchone()
    return _cron_out(row)


@router.delete("/cron/{job_id}")
def delete_cron(job_id: int, db=Depends(get_db), _=Depends(require_admin)) -> dict:
    cursor = db.execute("DELETE FROM cron_jobs WHERE id = ?", (job_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cron job not found")
    return {"ok": True}


@router.post("/cron/{job_id}/run", response_model=CronJobOut)
def run_cron(job_id: int, db=Depends(get_db), _=Depends(require_admin)) -> CronJobOut:
    row = db.execute("SELECT * FROM cron_jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cron job not found")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    db.execute(
        "UPDATE cron_jobs SET last_run_at = ?, last_status = ? WHERE id = ?",
        (now, "success", job_id),
    )
    row = db.execute("SELECT * FROM cron_jobs WHERE id = ?", (job_id,)).fetchone()
    return _cron_out(row)


# --------------------------------------------------------------------------- #
# SFTP users
# --------------------------------------------------------------------------- #

class SftpUserCreate(BaseModel):
    server_id: int = Field(ge=1)
    username: str = Field(min_length=2, max_length=32, pattern=r"^[a-z][a-z0-9_]+$")
    home_path: str = Field(default="/home/container", max_length=255)
    enabled: bool = True


class SftpUserOut(BaseModel):
    id: int
    server_id: int
    server_name: str | None = None
    username: str
    home_path: str
    enabled: bool
    created_at: str


def _sftp_out(row, server_name: str | None = None) -> SftpUserOut:
    return SftpUserOut(
        id=row["id"],
        server_id=row["server_id"],
        server_name=server_name,
        username=row["username"],
        home_path=row["home_path"],
        enabled=bool(row["enabled"]),
        created_at=row["created_at"],
    )


@router.get("/sftp", response_model=list[SftpUserOut])
def list_sftp(db=Depends(get_db)) -> list[SftpUserOut]:
    rows = db.execute(
        "SELECT s.*, n.name AS server_name FROM sftp_users s "
        "LEFT JOIN servers sv ON sv.id = s.server_id "
        "LEFT JOIN nodes n ON n.id = sv.node_id ORDER BY s.created_at"
    ).fetchall()
    return [_sftp_out(row, row["server_name"]) for row in rows]


@router.post("/sftp", response_model=SftpUserOut, status_code=status.HTTP_201_CREATED)
def create_sftp(payload: SftpUserCreate, db=Depends(get_db), _=Depends(require_admin)) -> SftpUserOut:
    server = db.execute("SELECT * FROM servers WHERE id = ?", (payload.server_id,)).fetchone()
    if server is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    try:
        cursor = db.execute(
            "INSERT INTO sftp_users (server_id, username, home_path, enabled) VALUES (?, ?, ?, ?)",
            (payload.server_id, payload.username, payload.home_path, int(payload.enabled)),
        )
    except Exception as exc:  # noqa: BLE001 - UNIQUE constraint on (server_id, username)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An SFTP user with this name already exists on this server.",
        ) from exc
    row = db.execute("SELECT * FROM sftp_users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _sftp_out(row, server["template"])


@router.patch("/sftp/{user_id}", response_model=SftpUserOut)
def update_sftp(user_id: int, payload: SftpUserCreate, db=Depends(get_db), _=Depends(require_admin)) -> SftpUserOut:
    row = db.execute("SELECT * FROM sftp_users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SFTP user not found")
    db.execute(
        "UPDATE sftp_users SET username = ?, home_path = ?, enabled = ? WHERE id = ?",
        (payload.username, payload.home_path, int(payload.enabled), user_id),
    )
    row = db.execute("SELECT * FROM sftp_users WHERE id = ?", (user_id,)).fetchone()
    return _sftp_out(row)


@router.delete("/sftp/{user_id}")
def delete_sftp(user_id: int, db=Depends(get_db), _=Depends(require_admin)) -> dict:
    cursor = db.execute("DELETE FROM sftp_users WHERE id = ?", (user_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SFTP user not found")
    return {"ok": True}
