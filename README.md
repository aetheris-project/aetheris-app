<p align="center">
 <picture>
 <img src="assets/icon.svg" alt="Aetheris" width="100" style="filter: drop-shadow(0 0 24px rgba(16,185,129,0.55))">
 </picture>
</p>

<h1 align="center">Aetheris App</h1>

<p align="center">
 <strong>Enterprise billing &amp; virtualization management control panel</strong>
</p>

<p align="center">
 <a href="https://aetheris-docs.vercel.app"><img src="https://img.shields.io/badge/Docs-Read%20the%20wiki-0EA5E9?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Docs"></a>
 <a href="https://aetheris-panel.vercel.app/admin"><img src="https://img.shields.io/badge/Demo-Open%20Panel-F59E0B?style=for-the-badge&logo=vercel&logoColor=white" alt="Demo"></a>
 <a href="https://discord.gg/6GcfebuT2A"><img src="https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
 <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
 <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
 <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma">
 <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
 <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis">
 <img src="https://img.shields.io/badge/BullMQ-5-CA4221?style=flat-square&logo=redis" alt="BullMQ">
 <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi" alt="FastAPI">
</p>

---

<br>

> **Aetheris App** is the billing core, control panel, hypervisor drivers and client
> portal rolled into a single monorepo. It converges **WHMCS, FOSSBilling,
> Pterodactyl Panel, Proxmox VE and VirtFusion** into one platform.
>
> Strict-mode TypeScript end to end, SOLID modular architecture, SSR-first and
> zero-layout-shift dark enterprise UI.

<br>

## Features

| Billing | Hypervisors | Client & Admin | Ops |
|---|---|---|---|
| **Unified billing engine** | **Universal driver contract** | **Client portal** | **BullMQ workers** |
| Invoices, Subscriptions | Pterodactyl (App + Client) | VNC console (WS) | Provisioning · Billing |
| Proration · Dunning · Tax | Proxmox VE API v2 (QEMU/LXC) | Backups · Power control | Telemetry · Email |
| Stripe / PayPal / Mollie | VirtFusion REST | **Admin panel** | Webhooks fan-out |
| | cPanel/WHM · DirectAdmin | Nodes · Allocations | **Encrypted secrets** |
| | | Nest/Egg targeting | AES-256-GCM credentials |
| | | **Whitelabel** | **Backend API** |
| | | Name · Logos · Colors | Python FastAPI |
| | | Email · Custom domain | Auth · Provisioning |
| | | **0 rebuilds — runtime only** | Billing callbacks |

<br>

## Architecture

### System Context
```mermaid
flowchart LR
 subgraph Clients
 Visitor[ Marketing visitor]
 ClientUser[ Client portal]
 Admin[ Platform admin]
 end

 subgraph Edge[Vercel Edge]
 Site[aetheris-website]
 App[aetheris-app web]
 end

 subgraph Core[Aetheris core]
 Billing[ Billing engine]
 AdminPlane[ Admin panel]
 Workers[ BullMQ workers]
 Redis[(Redis)]
 Postgres[(PostgreSQL)]
 end

 subgraph External[Integrations]
 Ptero[ Pterodactyl]
 PVE[ Proxmox VE]
 VF[ VirtFusion]
 Pay[ Stripe/PayPal/Mollie]
 CF[ Cloudflare]
 Reg[ Namecheap]
 end

 Visitor --> Site
 ClientUser --> App
 Admin --> App
 App --> Billing --> Workers
 App --> AdminPlane --> Workers
 Workers --> Redis & Postgres
 AdminPlane --> Ptero & PVE & VF
 Billing --> Pay & Reg & CF
```

### Provisioning Sequence
```mermaid
sequenceDiagram
 participant C as Client portal
 participant A as API layer
 participant Q as BullMQ queue
 participant W as Provisioning worker
 participant D as Hypervisor driver
 participant P as Panel/VM

 C->>A: POST /api/servers (plan + node)
 A->>A: Authorize, validate, create row
 A->>Q: enqueue provision job
 Q->>W: deliver
 W->>D: provision(request)
 D->>P: create workload
 P-->>D: externalId
 D-->>W: ProvisionResult
 W->>A: mark installing → running
 W->>Q: telemetry + billing start
 A-->>C: ServerInfo
```

<br>

## Quickstart

### Development (local)
```bash
cp .env.example .env # fill DATABASE_URL and REDIS_URL
npm install
npx prisma migrate dev
npm run dev # → http://localhost:3000
npm run worker # background queue workers
```

### Docker (any OS)
```bash
docker compose up -d --build
# Web UI: http://localhost:3000
# Backend: http://localhost:8000/health
# PG: localhost:5432 · Redis: localhost:6379
```

**SQLite mode (no DB container):**
```bash
docker compose -f docker-compose.sqlite.yml up -d --build
```

### Production install
```bash
DATABASE_URL=postgresql://aetheris:secret@127.0.0.1:5432/aetheris \
REDIS_URL=redis://127.0.0.1:6379 \
AETHERIS_APP_URL=https://app.example.com \
ADMIN_EMAIL=ops@example.com \
ADMIN_PASSWORD='a-very-long-password' \
bash bin/install.sh --yes --systemd --nginx
```

### Cross-platform manager
```bash
# Linux / macOS / Git Bash
bash scripts/manage.sh status
bash scripts/manage.sh logs -f

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 status
powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 logs -Follow
```

> **Full walkthroughs** in [aetheris-docs → Installation](https://aetheris-docs.vercel.app/wiki/installation)

<br>

## Repository Layout

```text
aetheris-app/
├── app/
│ ├── (admin)/ # Admin CP routes
│ ├── (client)/ # Client portal
│ └── api/whitelabel/ # Runtime branding (PG → Redis)
├── backend/ # Python FastAPI + SQLite
├── bin/install.sh # Non-interactive production installer
├── prisma/
│ ├── schema.prisma # PostgreSQL schema
│ └── sqlite/ # SQLite variant + migrations
├── src/
│ ├── lib/
│ │ ├── adapters/
│ │ │ ├── hypervisors/ # Driver contract + backends
│ │ │ └── payments/ # Gateways
│ │ ├── config/env.ts # Zod-validated env
│ │ ├── db.ts / redis.ts / queue.ts
│ │ └── db-codec.ts # SQLite JSON → TEXT codec
│ └── workers/ # Billing · provisioning · telemetry
├── deploy/aetheris.conf # Nginx template (installer)
├── .env.example
└── docker-compose.yml / sqlite variant
```

<br>

## Hypervisor Drivers

| Backend | Interface | Console | Backups |
|---|---|---|---|
| **Pterodactyl** | Application + Client API | Client API tokens | |
| **Proxmox VE** | API v2 (QEMU + LXC) | VNC proxy | Snapshots |
| **VirtFusion** | REST API | Not public | Snapshots |
| **cPanel / WHM** | JSON API cPanel 2 | N/A | |
| **DirectAdmin** | Plugin API | N/A | |

Driver contract in [src/lib/adapters/hypervisors/types.ts](src/lib/adapters/hypervisors/types.ts).

<br>

## Prerequisites

| Component | Minimum | Notes |
|---|---|---|
| Node.js | **20.x LTS** | Requires native fetch · AbortSignal.timeout |
| PostgreSQL | **16** | 15 works; 16 recommended |
| Redis | **7.x** | BullMQ requirement; 6.2+ also works |
| Pterodactyl | **1.11+** | App + Client API keys, admin scope |
| Proxmox VE | **7.x / 8.x** | API v2 · VM + container perms |
| VirtFusion | **2.x** | Bearer token |
| Ubuntu | **22.04 LTS** | Debian 12 supported |

---

<p align="center">
 <strong>Made with care by <a href="https://github.com/Leo-Galli">Leonardo Galli</a></strong>
</p>

<p align="center">
 <a href="https://github.com/aetheris-project/aetheris-docs">Docs</a>
 ·
 <a href="https://github.com/aetheris-project/aetheris-website">Website</a>
 ·
 <a href="https://github.com/aetheris-project/aetheris-installer">Installer</a>
 ·
 <a href="https://discord.gg/6GcfebuT2A">Discord</a>
 ·
 <a href="https://paypal.me/LeonardoGalliITA">Donate</a>
</p>

## License

Aetheris is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
See [LICENSE.md](LICENSE.md).

> Any distributed or network-served modified version must keep this license,
> preserve the copyright notice of the original author
> (**Leonardo Galli / Leo-Galli**) and release source code under AGPL-3.0.
> The Aetheris core and the author's credit may not be removed.
