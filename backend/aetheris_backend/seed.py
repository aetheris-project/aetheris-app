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
    # number, client, description, total, subtotal, discount, tax, currency, due_date, status, paid_at
    ("INV-10421", "Acme Corp", "Monthly hosting - 4x Production-01", 24900, 20410, 0, 4490, "EUR", "2026-08-01", "paid", "2026-07-28 09:12:00"),
    ("INV-10422", "Northwind Ltd", "Monthly hosting - 2x Web-02", 8900, 7295, 0, 1605, "EUR", "2026-08-22", "pending", None),
    ("INV-10423", "Globex", "Overages - bandwidth (1.2 TB)", 41200, 41200, 0, 0, "USD", "2026-08-05", "overdue", None),
    ("INV-10424", "Initech", "Monthly hosting - 1x Staging-API", 12900, 10574, 0, 2326, "EUR", "2026-08-10", "failed", None),
    ("INV-10425", "Umbrella Corp", "Dedicated - 8x Cache-Redis", 124900, 102377, 0, 22523, "EUR", "2026-07-28", "paid", "2026-07-21 14:40:00"),
]

INVOICE_LINES = {
    "INV-10421": [("Production-01 - Pro plan", 4, 4200, 22), ("Managed backups", 4, 900, 22)],
    "INV-10422": [("Web-02 - Growth plan", 2, 3000, 22)],
    "INV-10423": [("Bandwidth overage (GB)", 1200, 34, 0)],
    "INV-10424": [("Staging-API - Growth plan", 1, 3000, 22), ("Additional storage (GB)", 50, 85, 22)],
    "INV-10425": [("Cache-Redis - Dedicated", 8, 10500, 22)],
}

COUPONS = [
    # code, description, percent_off, amount_off_cents, currency, max_uses, active, expires_at
    ("WELCOME10", "10% off the first invoice", 10, None, "EUR", 500, 1, None),
    ("LAUNCH50", "50 EUR credit at launch", None, 5000, "EUR", 200, 1, "2026-12-31"),
    ("FLASH25", "25% flash sale", 25, None, "USD", 100, 1, "2026-09-30"),
    ("RETIRED", "Deprecated promo", 5, None, "EUR", 0, 0, None),
]

CRON_JOBS = [
    ("Nightly backups", "Snapshot every server and prune old backups", "0 3 * * *", "backup", 1),
    ("Invoice dunning", "Send payment reminders for pending and overdue invoices", "0 9 * * *", "invoice.dunning", 1),
    ("Snapshot prune", "Remove backups past retention", "30 4 * * *", "snapshot.prune", 1),
    ("Pterodactyl sync", "Reconcile server state with the Pterodactyl panel", "*/15 * * * *", "sync.pterodactyl", 1),
    ("Proxmox sync", "Reconcile nodes and VMs with Proxmox VE", "*/10 * * * *", "sync.proxmox", 1),
    ("VirtFusion sync", "Reconcile nodes with VirtFusion", "*/10 * * * *", "sync.virtfusion", 1),
    ("Daily report", "Compile and deliver the daily operations report", "0 7 * * *", "report.daily", 0),
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
                """INSERT OR IGNORE INTO invoices
                   (number, client, description, amount_cents, subtotal_cents, discount_cents,
                    tax_cents, currency, due_date, status, paid_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                invoice,
            )
        for number, lines in INVOICE_LINES.items():
            row = conn.execute("SELECT id FROM invoices WHERE number = ?", (number,)).fetchone()
            if row is None:
                continue
            invoice_id = row[0]
            for description, quantity, unit_cents, tax_rate_pct in lines:
                conn.execute(
                    """INSERT OR IGNORE INTO invoice_lines
                       (invoice_id, description, quantity, unit_cents, tax_rate_pct, total_cents)
                       SELECT ?, ?, ?, ?, ?, ?
                       WHERE NOT EXISTS (
                           SELECT 1 FROM invoice_lines
                           WHERE invoice_id = ? AND description = ? AND quantity = ?
                       )""",
                    (invoice_id, description, quantity, unit_cents, tax_rate_pct,
                     quantity * unit_cents, invoice_id, description, quantity),
                )
        for coupon in COUPONS:
            conn.execute(
                """INSERT OR IGNORE INTO coupons
                   (code, description, percent_off, amount_off_cents, currency, max_uses, active, expires_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                coupon,
            )
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '{\"accent\":\"emerald\",\"radius\":10,\"font_family\":\"\"}')"
        )
        for job in CRON_JOBS:
            conn.execute(
                "INSERT OR IGNORE INTO cron_jobs (name, description, schedule, task, enabled) VALUES (?, ?, ?, ?, ?)",
                job,
            )
        conn.commit()
    finally:
        conn.close()
