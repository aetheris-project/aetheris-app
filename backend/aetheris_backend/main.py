"""Aetheris Python backend application.

A self-contained REST API for the control panel demo: authentication,
node management, server provisioning, billing and whitelabel themes on a
zero-configuration SQLite database.

Run with:

    uvicorn aetheris_backend.main:app --reload

Interactive docs at http://127.0.0.1:8000/docs
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routers import auth, billing, catalog, nodes, servers, system, theme
from .seed import seed


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seed()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Aetheris Backend API",
        version="1.0.0",
        description="REST API for the Aetheris billing and virtualization control panel.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(nodes.router)
    app.include_router(servers.router)
    app.include_router(billing.router)
    app.include_router(catalog.router)
    app.include_router(theme.router)
    app.include_router(system.router)

    @app.get("/health", tags=["system"])
    def health() -> dict:
        return {"status": "ok", "service": "aetheris-backend", "version": "1.0.0"}

    return app


app = create_app()
