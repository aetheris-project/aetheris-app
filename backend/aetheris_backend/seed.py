"""Idempotent seed data for development and demos.

Safe to run repeatedly: every insert is guarded by an existence check or
uses INSERT OR IGNORE on unique columns.
"""

from __future__ import annotations

import sqlite3

from .config import settings
from .security import hash_password

NODES = [
    ("fra-01", "EU West - Frankfurt", "online", 62, 74, 58, 8, 64, 23),
    ("iad-02", "US East - Ashburn", "online", 41, 52, 47, 16, 128, 41),
    ("sin-01", "AP South - Singapore", "online", 23, 38, 29, 8, 64, 17),
    ("syd-01", "AP East - Sydney", "draining", 12, 15, 21, 4, 32, 6),
]

PLANS = [
    ("starter", 1, 2, 20, 900),
    ("growth", 2, 4, 40, 1900),
    ("pro", 4, 8, 80, 3900),
    ("dedicated", 8, 16, 160, 7900),
]

SERVERS = [
    ("Production-01", "fra-01", "pro", "Node.js", "10.40.0.11", "running"),
    ("Web-02", "fra-01", "growth", "Node.js", "10.40.0.12", "running"),
    ("Staging-API", "fra-01", "growth", "Python", "10.40.0.13", "stopped"),
    ("Cache-Redis", "fra-01", "starter", "Redis", "10.40.0.14", "running"),
]

INVOICES = [
    ("INV-10421", "Acme Corp", "Monthly hosting - 4x Production-01", 24900, "2026-08-01", "paid"),
    ("INV-10422", "Northwind Ltd", "Monthly hosting - 2x Web-02", 8900, "2026-08-22", "pending"),
    ("INV-10423", "Globex", "Overages - bandwidth (1.2 TB)", 41200, "2026-08-05", "overdue"),
    ("INV-10424", "Initech", "Monthly hosting - 1x Staging-API", 12900, "2026-08-10", "failed"),
    ("INV-10425", "Umbrella Corp", "Dedicated - 8x Cache-Redis", 124900, "2026-07-28", "paid"),
]


def seed(db_path: str | None = None) -> None:
    """Insert the demo dataset. Missing tables are created first."""
    from .db import init_db

    init_db(db_path)
    conn = sqlite3.connect(db_path or settings.db_path)
    try:
        conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)",
            (
                settings.admin_email,
                hash_password(settings.admin_password),
                "superadmin",
                settings.admin_name,
            ),
        )
        for node in NODES:
            conn.execute(
                "INSERT OR IGNORE INTO nodes (name, location, status, cpu, ram, disk, cores, memory_gb, containers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                node,
            )
        for plan in PLANS:
            conn.execute(
                "INSERT OR IGNORE INTO plans (name, vcpu, memory_gb, disk_gb, price_cents) VALUES (?, ?, ?, ?, ?)",
                plan,
            )
        for server in SERVERS:
            conn.execute(
                """INSERT OR IGNORE INTO servers (name, node_id, plan_id, template, ipv4, state)
                   SELECT ?, n.id, p.id, ?, ?, ?
                   FROM nodes n, plans p
                   WHERE n.name = ? AND p.name = ?""",
                (server[0], server[3], server[4], server[5], server[1], server[2]),
            )
        for invoice in INVOICES:
            conn.execute(
                "INSERT OR IGNORE INTO invoices (number, client, description, amount_cents, due_date, status) VALUES (?, ?, ?, ?, ?, ?)",
                invoice,
            )
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '{\"accent\":\"emerald\",\"radius\":10,\"font_family\":\"\"}')"
        )
        conn.commit()
    finally:
        conn.close()
