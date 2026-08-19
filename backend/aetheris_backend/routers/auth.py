"""Authentication endpoints."""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import LoginRequest, LoginResponse, UserOut
from ..security import create_token, verify_password
from .deps import get_current_user, require_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(row: sqlite3.Row) -> UserOut:
    return UserOut(id=row["id"], email=row["email"], name=row["name"], role=row["role"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db=Depends(get_db)) -> LoginResponse:
    row = db.execute("SELECT * FROM users WHERE email = ?", (payload.email,)).fetchone()
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_token(str(row["id"]), row["role"])
    return LoginResponse(token=token, user=_user_out(row))


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)) -> UserOut:
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(db=Depends(get_db), _=Depends(require_admin)) -> list[UserOut]:
    rows = db.execute("SELECT id, email, name, role FROM users ORDER BY id").fetchall()
    return [_user_out(row) for row in rows]
