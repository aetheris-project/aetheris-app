<p align="center">
  <img src="../../assets/icon.svg" alt="Aetheris Backend" width="88" style="filter: drop-shadow(0 0 20px rgba(59,130,246,0.55))">
</p>

<h1 align="center">Aetheris Backend (Python)</h1>

<p align="center">
  <strong>Self-contained FastAPI REST powering the Aetheris billing &amp; virtualization control plane — zero-config SQLite, no Postgres/Redis required</strong>
</p>

<p align="center">
  <a href="http://127.0.0.1:8000/docs"><img src="https://img.shields.io/badge/Swagger-Interactive%20Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger"></a>
  <a href="https://aetheris-docs.vercel.app/wiki/backend"><img src="https://img.shields.io/badge/Docs-Backend%20Guide-0EA5E9?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Docs"></a>
  <a href="https://discord.gg/6GcfebuT2A"><img src="https://img.shields.io/badge/Discord-Help-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/SQLite-Zero%20Setup-003B57?style=flat-square" alt="SQLite">
  <img src="https://img.shields.io/badge/Auth-HMAC--Bearer-10B981?style=flat-square" alt="Auth">
  <img src="https://img.shields.io/badge/CORS-Configurable-F59E0B?style=flat-square" alt="CORS">
  <img src="https://img.shields.io/badge/Tests-Passing-10B981?style=flat-square" alt="Tests">
</p>

---

<br>

> **Lightweight, self-contained REST API** for the Aetheris billing and
> virtualization control plane. Handles bearer-token auth (HMAC-signed
> with scrypt password hashing), node management with live CPU/RAM/disk
> telemetry, server provisioning with allocation-aware IP assignment,
> billing summaries, invoices and runtime-whitelabel themes — all on a
> zero-configuration SQLite database.
>
> No PostgreSQL, no Redis, no external message broker required for
> development, demos or small deployments. First-run auto-seeds 4 nodes,
> 4 plans, demo servers and a superadmin user.

<br>

## ✨ Features

<table>
  <tr>
    <td width="33%" align="center" valign="top">
      <h3>🔐 HMAC Bearer auth</h3>
      <p>scrypt password hashing + HMAC-SHA256 signed expiring tokens. Login endpoint returns a bearer for the Swagger / app client.</p>
    </td>
    <td width="33%" align="center" valign="top">
      <h3>🖥️ Node telemetry</h3>
      <p>Register nodes, fetch 1s-granularity live CPU / RAM / disk / load telemetry used by the admin status dashboard.</p>
    </td>
    <td width="33%" align="center" valign="top">
      <h3>🚀 Provisioning</h3>
      <p>Plan + node validation, allocation-aware IP assignment, power actions (start / stop / restart / kill), termination.</p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top">
      <h3>💰 Billing &amp; Invoices</h3>
      <p>Per-user running balance · invoice list · <code>/pay</code> simulation endpoint wired to the addons gateway contracts.</p>
    </td>
    <td align="center" valign="top">
      <h3>🎨 Whitelabel themes</h3>
      <p>Accent / radius / font + brand metadata persisted in DB and exposed via an anonymous GET + admin PUT endpoint.</p>
    </td>
    <td align="center" valign="top">
      <h3>🧭 Zero-config SQLite</h3>
      <p>First start creates <code>aetheris.db</code> + seeds demo data. Drop a single file to migrate a demo to production.</p>
    </td>
  </tr>
</table>

<br>

## 🚀 Install &amp; Run

```bash
cd backend

# 1. Virtual environment
python -m venv .venv
# Linux / macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\activate

# 2. Install runtime deps
pip install -r requirements.txt

# 3. Launch (auto-reload on code changes)
python run.py --port 8000 --reload
```

### Default seeded credentials (change in production!)

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | `admin-aetheris-2026` |
| Role | Superadmin |

### Endpoints once running

- **Interactive Swagger** — http://127.0.0.1:8000/docs
- **ReDoc** — http://127.0.0.1:8000/redoc
- **Health check** — http://127.0.0.1:8000/health
- **OpenAPI JSON** — http://127.0.0.1:8000/openapi.json

<br>

## ⚙️ Configuration

Every variable below can be set in the shell or via a `.env` file in `backend/`.

| Env var | Default | Purpose |
|---|---|---|
| `AETHERIS_BACKEND_DB` | `backend/aetheris.db` | SQLite database file path |
| `AETHERIS_SECRET` | *dev-only fixed value* | HMAC token-signing secret — **replace with 32+ random chars in prod** |
| `AETHERIS_TOKEN_TTL` | `86400` | Bearer-token lifetime in seconds (24 h) |
| `AETHERIS_CORS_ORIGINS` | `*` | Comma-separated CORS allow-list |
| `ADMIN_EMAIL` | `admin@example.com` | Seeded superadmin email on first run |
| `ADMIN_PASSWORD` | `admin-aetheris-2026` | Seeded superadmin password on first run |
| `ADMIN_NAME` | `Aetheris Administrator` | Seeded superadmin display name |

<br>

## 🧭 API Overview

| Method | Path | Role | Auth |
|---|---|---|---|
| `GET` | `/health` | Liveness probe | — |
| `GET` | `/openapi.json` | OpenAPI schema | — |
| `POST` | `/api/auth/login` | Exchange email/password → bearer token | — |
| `GET` | `/api/auth/me` | Current authenticated user | user |
| `GET` | `/api/auth/users` | List all users + roles | **admin** |
| `GET` | `/api/nodes` | List registered nodes | user |
| `POST` | `/api/nodes` | Register a new node | **admin** |
| `GET` | `/api/nodes/{id}/telemetry` | Live CPU/RAM/disk/load | user |
| `GET` | `/api/servers` | List servers visible to caller | user |
| `GET` | `/api/servers/plans` | Available plans (billing catalog) | user |
| `POST` | `/api/servers` | Provision a server on a node | **admin** |
| `POST` | `/api/servers/{id}/power` | Start / stop / restart / kill | user |
| `DELETE` | `/api/servers/{id}` | Terminate (deallocate + wipe) | **admin** |
| `GET` | `/api/billing/summary` | Running balance + last 3 invoices | user |
| `GET` | `/api/billing/invoices` | Paginated invoice list | user |
| `POST` | `/api/billing/invoices/{id}/pay` | Pay invoice (simulated / gateway-hook) | user |
| `GET` | `/api/theme` | Current whitelabel theme | — |
| `PUT` | `/api/theme` | Update accent / radius / font / brand | **admin** |

<br>

## 🧩 Repository Layout (backend/)

```text
backend/
├── aetheris_backend/
│   ├── __init__.py
│   ├── main.py            # FastAPI app · routers · lifespan · seed on startup
│   ├── config.py          # Environment-variable → settings parsing
│   ├── db.py              # SQLite connection + schema + prepared-statement helpers
│   ├── security.py        # scrypt hashing · HMAC token sign/verify · get_current_user
│   ├── schemas.py         # Pydantic request/response models
│   ├── seed.py            # First-run demo data (nodes, plans, servers, invoices, admin)
│   └── routers/
│       ├── auth.py        # /api/auth/*
│       ├── nodes.py       # /api/nodes/*  + telemetry
│       ├── servers.py     # /api/servers/* + power + plans
│       ├── billing.py     # /api/billing/*
│       ├── theme.py       # /api/theme GET/PUT
│       ├── catalog.py     # Plan & product catalog helpers
│       ├── system.py      # /health + version + diagnostics
│       └── deps.py        # Common Depends() (db, current_user, admin_required)
├── tests/
│   └── test_api.py        # Auth · nodes · provisioning · power · billing · theme — on temp DB
├── requirements.txt       # Runtime deps (FastAPI, uvicorn, pydantic, scrypt wrapper)
├── requirements-dev.txt   # + pytest
├── run.py                 # CLI launcher (port / reload flag)
├── Dockerfile
└── README.md
```

<br>

## 🧪 Tests

```bash
pip install -r requirements-dev.txt
pytest -q
```

Every test runs against a **temporary isolated SQLite database** and covers:
login flow + token expiry, node CRUD + telemetry ingestion, server
provisioning + plan/node validation + power actions, billing summary
and invoice payment simulation, whitelabel theme round-trip.

---

<p align="center">
  <strong>Made with 💚 by <a href="https://github.com/Leo-Galli">Leonardo Galli</a></strong>
</p>

<p align="center">
  <a href="https://github.com/aetheris-project/aetheris-app">App (frontend)</a>
  ·
  <a href="https://github.com/aetheris-project/aetheris-docs">Docs</a>
  ·
  <a href="https://github.com/aetheris-project/aetheris-installer">Installer</a>
  ·
  <a href="https://discord.gg/6GcfebuT2A">Discord</a>
  ·
  <a href="https://paypal.me/LeonardoGalliITA">Donate</a>
</p>

## 📄 License

Licensed under **GNU Affero General Public License v3.0 (AGPL-3.0)**.
See [../LICENSE.md](../LICENSE.md). You may use, study, modify and redistribute
for any purpose provided distributed or network-served modified versions
keep this license, preserve Leonardo Galli's copyright notice and release
source under AGPL-3.0. The Aetheris core and author credit may not be removed.
