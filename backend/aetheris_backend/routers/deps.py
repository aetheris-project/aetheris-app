"""Shared authentication dependencies."""

from __future__ import annotations

import sqlite3

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..db import get_db
from ..schemas import UserOut
from ..security import verify_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db=Depends(get_db),
) -> UserOut:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    row = db.execute(
        "SELECT id, email, name, role FROM users WHERE id = ?",
        (int(payload["sub"]),),
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return UserOut(id=row["id"], email=row["email"], name=row["name"], role=row["role"])


def require_admin(user: UserOut = Depends(get_current_user)) -> UserOut:
    if user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin role required",
        )
    return user
