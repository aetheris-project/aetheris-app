"""Authentication primitives.

Passwords are hashed with scrypt (per-user salt, constant-time compare).
Sessions use compact HMAC-SHA256 signed bearer tokens:
    payload = base64url(json{sub, role, exp})
    token   = payload.hmac(secret, payload)
No third-party dependencies are required beyond the standard library.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from .config import settings

_HASH_ALGO = "sha256"


# --------------------------------------------------------------------------- #
# Passwords
# --------------------------------------------------------------------------- #

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=64)
    return f"scrypt:{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt_hex, digest_hex = stored.split(":", 2)
        if algo != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (ValueError, AttributeError):
        return False
    actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=64)
    return hmac.compare_digest(actual, expected)


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64url(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def create_token(subject: str, role: str, ttl_seconds: int | None = None) -> str:
    ttl = ttl_seconds if ttl_seconds is not None else settings.token_ttl_seconds
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "exp": int(time.time()) + ttl,
    }
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(settings.secret.encode("utf-8"), payload_b64.encode("ascii"), _HASH_ALGO).digest()
    return f"{payload_b64}.{_b64url(signature)}"


def verify_token(token: str) -> dict[str, Any] | None:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError:
        return None
    expected = hmac.new(
        settings.secret.encode("utf-8"), payload_b64.encode("ascii"), _HASH_ALGO
    ).digest()
    provided = _unb64url(signature_b64)
    if not hmac.compare_digest(expected, provided):
        return None
    try:
        payload = json.loads(_unb64url(payload_b64))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload
