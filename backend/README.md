# Aetheris Backend (Python)

Self-contained REST API for the Aetheris billing and virtualization control
plane: authentication, node management, server provisioning, billing and
whitelabel themes. Built with FastAPI on a zero-configuration SQLite
database — no PostgreSQL or Redis required for development and demos.

## Features

- Bearer-token auth (HMAC-signed, expiring) with scrypt password hashing.
- Node management with live telemetry (CPU / RAM / disk).
- Server provisioning with allocation-aware IP assignment and plan/node
  validation; power actions and termination.
- Billing summary, invoice listing and payment simulation.
- Whitelabel theme configuration (accent, radius, font) persisted to the
  database and editable via the API.
- Auto-generated interactive docs at `/docs`.

## Requirements

- Python 3.10+ (tested on 3.12)

## Install and run

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
python run.py --port 8000 --reload
```

The first start creates `aetheris.db` and seeds it with an admin user, four
nodes, four plans, demo servers and invoices.

Default admin credentials (change them in production):

```text
email:    admin@example.com
password: admin-aetheris-2026
```

Interactive API documentation: http://127.0.0.1:8000/docs

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `AETHERIS_BACKEND_DB` | `backend/aetheris.db` | SQLite database path |
| `AETHERIS_SECRET` | dev-only value | HMAC token signing secret; set a long random value in production |
| `AETHERIS_TOKEN_TTL` | `86400` | Token lifetime in seconds |
| `AETHERIS_CORS_ORIGINS` | `*` | Comma-separated CORS origins |
| `ADMIN_EMAIL` | `admin@example.com` | Seeded superadmin email |
| `ADMIN_PASSWORD` | `admin-aetheris-2026` | Seeded superadmin password |
| `ADMIN_NAME` | `Aetheris Administrator` | Seeded superadmin display name |

## API overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | - | Service health |
| POST | `/api/auth/login` | - | Login, returns bearer token |
| GET | `/api/auth/me` | user | Current user |
| GET | `/api/auth/users` | admin | List users |
| GET | `/api/nodes` | user | List nodes |
| POST | `/api/nodes` | admin | Create node |
| GET | `/api/nodes/{id}/telemetry` | user | Node telemetry |
| GET | `/api/servers` | user | List servers |
| GET | `/api/servers/plans` | user | List plans |
| POST | `/api/servers` | admin | Provision server |
| POST | `/api/servers/{id}/power` | user | start / stop / restart |
| DELETE | `/api/servers/{id}` | admin | Terminate server |
| GET | `/api/billing/summary` | user | Billing summary |
| GET | `/api/billing/invoices` | user | List invoices |
| POST | `/api/billing/invoices/{id}/pay` | user | Pay invoice |
| GET | `/api/theme` | - | Current whitelabel theme |
| PUT | `/api/theme` | admin | Update whitelabel theme |

## Tests

```bash
pip install -r requirements-dev.txt
pytest -q
```

Tests run against an isolated temporary database and cover auth, node
management, provisioning, power actions, billing and theme updates.
