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
    assert response.json()["transaction_id"].startswith("pi_demo_")


def test_pay_paid_invoice_conflicts(client, admin_token) -> None:
    headers = auth_headers(admin_token)
    invoices = client.get("/api/billing/invoices", headers=headers).json()
    paid = next(invoice for invoice in invoices if invoice["status"] == "paid")
    assert client.post(f"/api/billing/invoices/{paid['id']}/pay", headers=headers).status_code == 409


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
