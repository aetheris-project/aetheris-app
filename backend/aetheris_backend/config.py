"""Environment configuration for the Aetheris Python backend.

Values are read once at import time so tests can point the database at a
temporary file before importing the application.
"""

from __future__ import annotations

import os

DEV_SECRET = "dev-only-secret-change-me-in-production"


class Settings:
    """Runtime configuration collected from environment variables."""

    def __init__(self) -> None:
        self.db_path: str = os.environ.get(
            "AETHERIS_BACKEND_DB",
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "aetheris.db"),
        )
        self.secret: str = os.environ.get("AETHERIS_SECRET") or DEV_SECRET
        self.token_ttl_seconds: int = int(os.environ.get("AETHERIS_TOKEN_TTL", "86400"))
        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.environ.get("AETHERIS_CORS_ORIGINS", "*").split(",")
            if origin.strip()
        ]
        self.admin_email: str = os.environ.get("ADMIN_EMAIL", "admin@example.com")
        self.admin_password: str = os.environ.get("ADMIN_PASSWORD", "admin-aetheris-2026")
        self.admin_name: str = os.environ.get("ADMIN_NAME", "Aetheris Administrator")


settings = Settings()


def is_dev_secret() -> bool:
    return settings.secret == DEV_SECRET
