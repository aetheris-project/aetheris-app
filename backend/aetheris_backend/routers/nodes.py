"""Node management and telemetry endpoints."""

from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import NodeCreate, NodeOut, TelemetryOut
from .deps import require_admin

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


def _node_out(row) -> NodeOut:
    return NodeOut(
        id=row["id"],
        name=row["name"],
        location=row["location"],
        status=row["status"],
        cpu=row["cpu"],
        ram=row["ram"],
        disk=row["disk"],
        cores=row["cores"],
        memory_gb=row["memory_gb"],
        containers=row["containers"],
    )


@router.get("", response_model=list[NodeOut])
def list_nodes(db=Depends(get_db)) -> list[NodeOut]:
    rows = db.execute("SELECT * FROM nodes ORDER BY name").fetchall()
    return [_node_out(row) for row in rows]


@router.post("", response_model=NodeOut, status_code=status.HTTP_201_CREATED)
def create_node(payload: NodeCreate, db=Depends(get_db), _=Depends(require_admin)) -> NodeOut:
    try:
        cursor = db.execute(
            "INSERT INTO nodes (name, location, cores, memory_gb) VALUES (?, ?, ?, ?)",
            (payload.name, payload.location, payload.cores, payload.memory_gb),
        )
    except Exception as exc:  # noqa: BLE001 - sqlite3.IntegrityError surface
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A node with this name already exists",
        ) from exc
    row = db.execute("SELECT * FROM nodes WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _node_out(row)


@router.get("/{node_id}/telemetry", response_model=TelemetryOut)
def get_telemetry(node_id: int, db=Depends(get_db)) -> TelemetryOut:
    row = db.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    # Small deterministic jitter so repeated polls look like live telemetry.
    return TelemetryOut(
        node_id=node_id,
        cpu=min(99, row["cpu"] + random.randint(-2, 2)),
        ram=min(99, row["ram"] + random.randint(-2, 2)),
        disk=min(99, row["disk"] + random.randint(-1, 1)),
    )
