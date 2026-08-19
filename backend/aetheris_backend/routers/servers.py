"""Server lifecycle endpoints."""

from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..db import get_db
from ..schemas import PlanOut, PowerAction, ProvisionRequest, ServerOut
from .deps import require_admin

router = APIRouter(prefix="/api/servers", tags=["servers"])


def _server_out(row) -> ServerOut:
    return ServerOut(
        id=row["id"],
        name=row["name"],
        node_id=row["node_id"],
        plan_id=row["plan_id"],
        template=row["template"],
        ipv4=row["ipv4"],
        state=row["state"],
    )


@router.get("", response_model=list[ServerOut])
def list_servers(db=Depends(get_db)) -> list[ServerOut]:
    rows = db.execute("SELECT * FROM servers ORDER BY id").fetchall()
    return [_server_out(row) for row in rows]


@router.get("/plans", response_model=list[PlanOut])
def list_plans(db=Depends(get_db)) -> list[PlanOut]:
    rows = db.execute("SELECT * FROM plans ORDER BY price_cents").fetchall()
    return [
        PlanOut(
            id=row["id"],
            name=row["name"],
            vcpu=row["vcpu"],
            memory_gb=row["memory_gb"],
            disk_gb=row["disk_gb"],
            price_cents=row["price_cents"],
        )
        for row in rows
    ]


@router.post("", response_model=ServerOut, status_code=status.HTTP_201_CREATED)
def provision(payload: ProvisionRequest, db=Depends(get_db), _=Depends(require_admin)) -> ServerOut:
    plan = db.execute("SELECT * FROM plans WHERE id = ?", (payload.plan_id,)).fetchone()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    node = db.execute("SELECT * FROM nodes WHERE id = ?", (payload.node_id,)).fetchone()
    if node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    if node["status"] != "online":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Node {node['name']} is not accepting workloads",
        )
    # Simulate allocation: pick the next free address on the 10.40.0.0/24 block.
    used = {
        row["ipv4"] for row in db.execute("SELECT ipv4 FROM servers").fetchall()
    }
    octet = 21
    while f"10.40.0.{octet}" in used and octet < 254:
        octet += 1
    ipv4 = f"10.40.0.{octet}"
    slug = payload.template.lower().replace(" ", "").replace("/", "-")
    name = f"{slug}-{random.randint(100, 999)}"
    cursor = db.execute(
        "INSERT INTO servers (name, node_id, plan_id, template, ipv4, state) VALUES (?, ?, ?, ?, ?, 'installing')",
        (name, payload.node_id, payload.plan_id, payload.template, ipv4),
    )
    db.execute("UPDATE nodes SET containers = containers + 1 WHERE id = ?", (payload.node_id,))
    row = db.execute("SELECT * FROM servers WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _server_out(row)


@router.post("/{server_id}/power", response_model=ServerOut)
def power(server_id: int, action: PowerAction, db=Depends(get_db)) -> ServerOut:
    row = db.execute("SELECT * FROM servers WHERE id = ?", (server_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    next_state = {
        "start": "running",
        "restart": "running",
        "stop": "stopped",
    }[action.action]
    db.execute("UPDATE servers SET state = ? WHERE id = ?", (next_state, server_id))
    row = db.execute("SELECT * FROM servers WHERE id = ?", (server_id,)).fetchone()
    return _server_out(row)


@router.delete("/{server_id}")
def terminate(server_id: int, db=Depends(get_db), _=Depends(require_admin)) -> Response:
    row = db.execute("SELECT * FROM servers WHERE id = ?", (server_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    db.execute("DELETE FROM servers WHERE id = ?", (server_id,))
    db.execute("UPDATE nodes SET containers = MAX(0, containers - 1) WHERE id = ?", (row["node_id"],))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
