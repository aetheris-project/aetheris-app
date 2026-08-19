"""SQLite persistence layer.

A single connection per call is cheap for the demo scale the backend
targets. Schema creation is idempotent so the database can be initialized
at import time without a migration tool.
"""

from __future__ import annotations

import sqlite3
from typing import Iterator

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'online',
    cpu INTEGER NOT NULL DEFAULT 0,
    ram INTEGER NOT NULL DEFAULT 0,
    disk INTEGER NOT NULL DEFAULT 0,
    cores INTEGER NOT NULL DEFAULT 4,
    memory_gb INTEGER NOT NULL DEFAULT 32,
    containers INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    vcpu INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    disk_gb INTEGER NOT NULL,
    price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    node_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    template TEXT NOT NULL,
    ipv4 TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'installing',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (node_id) REFERENCES nodes(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    client TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def connect(db_path: str | None = None) -> sqlite3.Connection:
    """Open a connection with row access by column name."""
    conn = sqlite3.connect(db_path or settings.db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db(db_path: str | None = None) -> Iterator[sqlite3.Connection]:
    """
    Generator dependency yielding a connection with a transaction scope.

    Intentionally a plain generator function (no @contextmanager decorator):
    FastAPI detects yield dependencies via inspect.isgeneratorfunction and
    manages enter/exit itself. Wrapping the function in @contextmanager would
    break that machinery with a double-wrap and raise
    'AttributeError: _GeneratorContextManager has no attribute throw'.
    """
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: str | None = None) -> None:
    """Create all tables if they do not exist yet."""
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
