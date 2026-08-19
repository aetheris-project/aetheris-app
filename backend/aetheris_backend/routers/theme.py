"""Whitelabel theme configuration endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import ThemeConfig, ThemeConfigOut
from .deps import require_admin

router = APIRouter(prefix="/api/theme", tags=["theme"])

DEFAULT_THEME = {"accent": "emerald", "radius": 10, "font_family": ""}


def _load(db) -> dict:
    row = db.execute("SELECT value FROM settings WHERE key = 'theme'").fetchone()
    if row is None:
        return dict(DEFAULT_THEME)
    try:
        payload = json.loads(row["value"])
    except (ValueError, TypeError):
        return dict(DEFAULT_THEME)
    return {**DEFAULT_THEME, **payload}


@router.get("", response_model=ThemeConfigOut)
def get_theme(db=Depends(get_db)) -> ThemeConfigOut:
    return ThemeConfigOut(**_load(db))


@router.put("", response_model=ThemeConfigOut)
def update_theme(payload: ThemeConfig, db=Depends(get_db), _=Depends(require_admin)) -> ThemeConfigOut:
    db.execute(
        "INSERT INTO settings (key, value) VALUES ('theme', ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (payload.model_dump_json(),),
    )
    return ThemeConfigOut(**payload.model_dump())
