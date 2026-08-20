"""End-to-end tests for the Aetheris backend API.

Each test runs against an isolated temporary SQLite database; the app
module is imported after AETHERIS_BACKEND_DB is pointed at that file.
"""

from __future__ import annotations

import os
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient

# Point the backend at a temporary database before importing the app.
_TMP_DIR = tempfile.mkdtemp(prefix="aetheris-test-")
_DB_PATH = os.path.join(_TMP_DIR, "test.db")
os.environ["AETHERIS_BACKEND_DB"] = _DB_PATH
os.environ["AETHERIS_SECRET"] = "test-secret-not-for-production"
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["ADMIN_PASSWORD"] = "test-admin-password"

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from aetheris_backend.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def admin_token(client) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "test-admin-password"},
    )
    assert response.status_code == 200, response.text
    return response.json()["token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #

def test_health(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #

def test_login_rejects_bad_password(client) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_returns_token_and_user(client) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "test-admin-password"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["user"]["role"] == "superadmin"


def test_me_requires_token(client) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_token(client, admin_token) -> None:
    response = client.get("/api/auth/me", headers=auth_headers(admin_token))
    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"


# --------------------------------------------------------------------------- #
# Nodes
# --------------------------------------------------------------------------- #

def test_list_nodes_has_seeded_data(client) -> None:
    response = client.get("/api/nodes")
    assert response.status_code == 200
    names = {node["name"] for node in response.json()}
    assert "fra-01" in names and "iad-02" in names


def test_create_node_requires_admin(client, admin_token) -> None:
    response = client.post(
        "/api/nodes",
        json={"name": "ams-01", "location": "EU West - Amsterdam", "cores": 8, "memory_gb": 64},
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 201
    assert response.json()["name"] == "ams-01"


def test_create_duplicate_node_conflicts(client, admin_token) -> None:
    response = client.post(
        "/api/nodes",
        json={"name": "fra-01", "location": "EU West - Frankfurt"},
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 409


def test_telemetry(client) -> None:
    nodes = client.get("/api/nodes").json()
    node_id = nodes[0]["id"]
    response = client.get(f"/api/nodes/{node_id}/telemetry")
    assert response.status_code == 200
    assert 0 <= response.json()["cpu"] <= 99


# --------------------------------------------------------------------------- #
# Servers / provisioning
# --------------------------------------------------------------------------- #

def test_list_plans(client) -> None:
    response = client.get("/api/servers/plans")
    assert response.status_code == 200
    assert len(response.json()) == 4


def test_provision_server(client, admin_token) -> None:
    plans = client.get("/api/servers/plans").json()
    nodes = client.get("/api/nodes").json()
    response = client.post(
        "/api/servers",
        json={
            "plan_id": plans[0]["id"],
            "node_id": nodes[0]["id"],
            "template": "Node.js",
        },
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["state"] == "installing"
    assert body["ipv4"].startswith("10.40.0.")


def test_provision_rejects_draining_node(client, admin_token) -> None:
    nodes = client.get("/api/nodes").json()
    draining = next(node for node in nodes if node["status"] == "draining")
    plans = client.get("/api/servers/plans").json()
    response = client.post(
        "/api/servers",
        json={
            "plan_id": plans[0]["id"],
            "node_id": draining["id"],
            "template": "Node.js",
        },
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 409


def test_power_actions(client, admin_token) -> None:
    servers = client.get("/api/servers").json()
    server_id = servers[0]["id"]
    stopped = client.post(
        f"/api/servers/{server_id}/power",
        json={"action": "stop"},
        headers=auth_headers(admin_token),
    )
    assert stopped.status_code == 200
    assert stopped.json()["state"] == "stopped"
    restarted = client.post(
        f"/api/servers/{server_id}/power",
        json={"action": "restart"},
        headers=auth_headers(admin_token),
    )
    assert restarted.json()["state"] == "running"


def test_terminate_server(client, admin_token) -> None:
    servers = client.get("/api/servers").json()
    server_id = servers[0]["id"]
    assert client.delete(f"/api/servers/{server_id}", headers=auth_headers(admin_token)).status_code == 204
    remaining = client.get("/api/servers").json()
    assert all(server["id"] != server_id for server in remaining)


# --------------------------------------------------------------------------- #
# Billing
# --------------------------------------------------------------------------- #

def test_billing_summary_requires_auth(client) -> None:
    assert client.get("/api/billing/summary").status_code == 401


def test_billing_summary(client, admin_token) -> None:
    response = client.get("/api/billing/summary", headers=auth_headers(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert body["mrr_cents"] > 0
    assert body["active_subscriptions"] > 0


def test_list_invoices(client, admin_token) -> None:
    response = client.get("/api/billing/invoices", headers=auth_headers(admin_token))
    assert response.status_code == 200
    assert any(invoice["number"] == "INV-10421" for invoice in response.json())


def test_pay_invoice(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    invoices = client.get("/api/billing/invoices", headers=headers).json()
    pending = next(invoice for invoice in invoices if invoice["status"] == "pending")
    response = client.post(f"/api/billing/invoices/{pending['id']}/pay", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "paid"
    assert response.json()["transaction_id"].startswith("stripe_demo_")


def test_pay_paid_invoice_conflicts(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    invoices = client.get("/api/billing/invoices", headers=headers).json()
    paid = next(invoice for invoice in invoices if invoice["status"] == "paid")
    assert client.post(f"/api/billing/invoices/{paid['id']}/pay", headers=headers).status_code == 409


# --------------------------------------------------------------------------- #
# Billing engine
# --------------------------------------------------------------------------- #

def test_create_invoice_with_lines_and_tax(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    response = client.post(
        "/api/billing/invoices",
        json={
            "client": "NewCo",
            "description": "Game hosting - 2x Minecraft Pro",
            "currency": "EUR",
            "due_days": 14,
            "lines": [
                {"description": "Minecraft Pro - 4 vCPU / 8 GB", "quantity": 2, "unit_cents": 4990, "tax_rate_pct": 22},
                {"description": "Backup add-on", "quantity": 1, "unit_cents": 990, "tax_rate_pct": 22},
            ],
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["number"].startswith("INV-")
    assert body["status"] == "pending"
    assert body["subtotal_cents"] == 10970  # 2*4990 + 990
    assert body["tax_cents"] == 2413       # round(10970 * 0.22)
    assert body["amount_cents"] == 13383
    assert len(body["lines"]) == 2
    assert body["lines"][0]["tax_rate_pct"] == 22


def test_create_invoice_with_coupon(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    response = client.post(
        "/api/billing/invoices",
        json={
            "client": "CouponCo",
            "currency": "EUR",
            "due_days": 7,
            "coupon_code": "WELCOME10",
            "lines": [{"description": "VPS - Growth", "quantity": 1, "unit_cents": 1900, "tax_rate_pct": 22}],
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["discount_cents"] == 190
    assert body["subtotal_cents"] == 1900
    assert body["amount_cents"] == 1900 - 190 + round((1900 - 190) * 0.22)  # 1710 + 376 = 2086
    assert body["coupon_code"] == "WELCOME10"


def test_coupon_currency_mismatch_rejected(client, admin_token) -> None:
    response = client.post(
        "/api/billing/invoices",
        json={
            "client": "MismatchCo",
            "currency": "USD",
            "coupon_code": "WELCOME10",
            "lines": [{"description": "VPS", "quantity": 1, "unit_cents": 1000, "tax_rate_pct": 0}],
        },
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 422


def test_webhook_success_marks_invoice_paid(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    created = client.post(
        "/api/billing/invoices",
        json={
            "client": "WebhookCo",
            "currency": "EUR",
            "lines": [{"description": "Node", "quantity": 1, "unit_cents": 5000, "tax_rate_pct": 0}],
        },
        headers=headers,
    ).json()
    payload = {
        "event": "payment.succeeded",
        "payment_id": "pi_webhook_test_1",
        "invoice_number": created["number"],
        "amount_cents": created["amount_cents"],
        "currency": "EUR",
    }
    first = client.post("/api/billing/webhooks/stripe", json=payload)
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "paid"
    # Idempotent replay must not create a second payment.
    second = client.post("/api/billing/webhooks/stripe", json=payload)
    assert second.status_code == 200
    detail = client.get(f"/api/billing/invoices/{created['id']}", headers=headers).json()
    assert detail["status"] == "paid"
    assert len(detail["payments"]) == 1


def test_webhook_failure_marks_invoice_failed(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    created = client.post(
        "/api/billing/invoices",
        json={
            "client": "FailCo",
            "currency": "EUR",
            "lines": [{"description": "Node", "quantity": 1, "unit_cents": 4000, "tax_rate_pct": 0}],
        },
        headers=headers,
    ).json()
    response = client.post(
        "/api/billing/webhooks/paypal",
        json={
            "event": "payment.failed",
            "payment_id": "pay_webhook_fail_1",
            "invoice_number": created["number"],
            "amount_cents": 4000,
            "currency": "EUR",
            "failure_reason": "card_declined",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    detail = client.get(f"/api/billing/invoices/{created['id']}", headers=headers).json()
    assert detail["status"] == "failed"
    assert detail["payments"][0]["failure_reason"] == "card_declined"


def test_dunning_run_transitions_overdue(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    # Insert an invoice that is already past due, then let dunning escalate it.
    from aetheris_backend.db import connect

    conn = connect()
    try:
        conn.execute(
            """INSERT INTO invoices (number, client, description, amount_cents, subtotal_cents,
                                     discount_cents, tax_cents, currency, due_date, status)
               VALUES ('INV-TEST-PAST', 'SlowPayer', 'Past due test', 3000, 3000, 0, 0,
                       'EUR', '2020-01-01', 'pending')"""
        )
        conn.commit()
    finally:
        conn.close()
    result = client.post("/api/billing/dunning/run", headers=headers)
    assert result.status_code == 200
    body = result.json()
    assert body["reminded_count"] >= 1
    assert body["failed_count"] >= 1  # past grace -> failed
    detail = client.get("/api/billing/invoices", headers=headers).json()
    past = next(invoice for invoice in detail if invoice["number"] == "INV-TEST-PAST")
    assert past["status"] == "failed"


def test_refund_paid_invoice(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    invoices = client.get("/api/billing/invoices", headers=headers).json()
    paid = next(invoice for invoice in invoices if invoice["status"] == "paid")
    response = client.post(f"/api/billing/invoices/{paid['id']}/refund", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "refunded"
    detail = client.get(f"/api/billing/invoices/{paid['id']}", headers=headers).json()
    assert detail["status"] == "refunded"
    assert detail["payments"][-1]["status"] == "refunded"


def test_coupon_crud_admin_only(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    assert client.get("/api/billing/coupons", headers=headers).status_code == 200
    created = client.post(
        "/api/billing/coupons",
        json={"code": "TEST50", "description": "Test coupon", "percent_off": 50, "currency": "EUR"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    assert created.json()["percent_off"] == 50
    # Duplicate code conflicts.
    dup = client.post(
        "/api/billing/coupons",
        json={"code": "TEST50", "description": "dup", "percent_off": 10, "currency": "EUR"},
        headers=headers,
    )
    assert dup.status_code == 409
    # Disable.
    disabled = client.delete(f"/api/billing/coupons/{created.json()['id']}", headers=headers)
    assert disabled.status_code == 200
    assert disabled.json()["status"] == "disabled"


# --------------------------------------------------------------------------- #
# Game hosting catalog
# --------------------------------------------------------------------------- #

def test_catalog_lists_games(client) -> None:
    response = client.get("/api/catalog/games")
    assert response.status_code == 200
    games = response.json()
    assert len(games) >= 10
    slugs = {game["slug"] for game in games}
    assert "minecraft-java" in slugs and "cs2" in slugs and "rust" in slugs
    minecraft = next(game for game in games if game["slug"] == "minecraft-java")
    assert minecraft["default_port"] == 25565
    assert minecraft["presets"][0]["price_cents"] > 0


def test_catalog_game_detail_and_404(client) -> None:
    assert client.get("/api/catalog/games/vrising").status_code == 200
    assert client.get("/api/catalog/games/does-not-exist").status_code == 404


# --------------------------------------------------------------------------- #
# Theme
# --------------------------------------------------------------------------- #

def test_theme_defaults(client) -> None:
    response = client.get("/api/theme")
    assert response.status_code == 200
    assert response.json()["accent"] == "emerald"


def test_update_theme_requires_admin(client) -> None:
    response = client.put("/api/theme", json={"accent": "indigo", "radius": 12})
    assert response.status_code == 401


def test_update_theme(client, admin_token) -> None:
    response = client.put(
        "/api/theme",
        json={"accent": "amber", "radius": 14},
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["accent"] == "amber"
    assert client.get("/api/theme").json()["accent"] == "amber"
