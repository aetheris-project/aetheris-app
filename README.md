# Aetheris App

Enterprise billing and virtualization management control plane. Aetheris converges
WHMCS, FOSSBilling, Pterodactyl Panel, Proxmox VE and VirtFusion into a single
platform: one billing engine, one client portal, and one set of hypervisor
drivers, with total admin control and dynamic whitelabeling.

The codebase is strict-mode TypeScript end to end, modular around SOLID
principles, and ships SSR-first with a zero-layout-shift dark enterprise UI.

## Architecture

### System context

```mermaid
flowchart LR
  subgraph Clients
    Visitor[Marketing visitor]
    ClientUser[Client portal user]
    Admin[Platform administrator]
  end

  subgraph Vercel[Vercel edge]
    Site[aetheris-website]
    App[aetheris-app web]
  end

  subgraph Backend[Aetheris backend]
    Billing[Billing engine]
    AdminPlane[Admin control plane]
    Workers[BullMQ workers]
    Redis[(Redis)]
    Postgres[(PostgreSQL)]
  end

  subgraph Providers[External systems]
    Ptero[Pterodactyl Panel]
    PVE[Proxmox VE]
    VF[VirtFusion]
    CPanel[cPanel / WHM]
    DA[DirectAdmin]
    CF[Cloudflare]
    Pay[Stripe / PayPal / Mollie]
    Reg[Namecheap / Cloudflare Registrar]
  end

  Visitor --> Site
  ClientUser --> App
  Admin --> App

  App --> Billing
  App --> AdminPlane
  Billing --> Workers
  AdminPlane --> Workers
  Workers --> Redis
  Workers --> Postgres
  App --> Postgres
  App --> Redis

  AdminPlane --> Ptero
  AdminPlane --> PVE
  AdminPlane --> VF
  AdminPlane --> CPanel
  AdminPlane --> DA
  AdminPlane --> CF
  Billing --> Pay
  Billing --> Reg
```

### Provisioning sequence

```mermaid
sequenceDiagram
  participant C as Client portal
  participant A as API layer
  participant Q as BullMQ queue
  participant W as Provisioning worker
  participant D as Hypervisor driver
  participant P as Pterodactyl / Proxmox / VirtFusion

  C->>A: POST /api/servers (plan + node)
  A->>A: authorize, validate limits, create Server row
  A->>Q: enqueue provision job
  Q->>W: deliver job
  W->>D: provision(ProvisionRequest)
  D->>P: create workload (allocation, image, limits)
  P-->>D: serverExternalId
  D-->>W: ProvisionResult
  W->>A: mark Server installing -> running
  W->>Q: enqueue telemetry + billing start
  A-->>C: ServerInfo
```

### Billing flow

```mermaid
flowchart TD
  Cycle[Cron: billing cycle] -->|collect| Invoices[Generate invoices]
  Invoices --> Charge[Charge payment method]
  Charge -->|succeeded| Paid[Invoice paid, provision continues]
  Charge -->|failed| Dunning[Dunning: retry with backoff]
  Dunning -->|retry exhausted| Suspend[Suspend workload via driver]
  Suspend --> Notify[Email template: server.suspended]
  Paid --> Receipt[Email template: invoice.paid]
```

## Repository layout

```text
aetheris-app/
├── app/
│   ├── (admin)/              # Admin control plane routes
│   ├── (client)/             # Client portal routes
│   └── api/                  # Route handlers (whitelabel, webhooks, drivers)
├── bin/
│   └── install.sh            # Non-interactive production installer
├── prisma/
│   ├── schema.prisma         # PostgreSQL data model
│   └── seed.ts               # Initial plans and demo data
├── src/
│   ├── lib/
│   │   ├── adapters/
│   │   │   ├── hypervisors/  # Universal driver contract + backends
│   │   │   │   ├── types.ts          # HypervisorDriver interface
│   │   │   │   ├── pterodactyl.ts    # Application + Client API driver
│   │   │   │   ├── proxmox.ts        # Proxmox VE API v2 driver
│   │   │   │   ├── virtfusion.ts     # VirtFusion REST driver
│   │   │   │   └── index.ts          # Zod-validated factory/registry
│   │   │   └── payments/     # Stripe, PayPal, Mollie gateways
│   │   ├── config/env.ts     # Zod-validated environment
│   │   ├── db.ts             # Prisma singleton
│   │   ├── redis.ts          # ioredis singleton
│   │   └── queue.ts          # BullMQ queues and workers
│   └── workers/              # Billing, provisioning, telemetry processors
├── deploy/
│   └── aetheris.conf         # Nginx site template (installer-generated)
├── .env.example
└── README.md
```

## Features

- Unified billing engine: invoices, subscriptions, proration, dunning and tax,
  wired to Stripe, PayPal and Mollie.
- Universal hypervisor driver contract with native Pterodactyl (Application and
  Client API), Proxmox VE API v2, VirtFusion REST, cPanel/WHM and DirectAdmin.
- Client portal with server lifecycle, VNC console (WebSocket token issuance),
  backups and payment methods.
- Admin control plane: node management, allocation pools, nest/egg targeting,
  backup policies, per-client resource limits.
- Dynamic whitelabeling: brand, theme variables, navigation, email templates,
  custom domain routing and integration toggles stored in PostgreSQL and cached
  in Redis; no rebuild required.
- Background orchestration with BullMQ: provisioning, billing runs, telemetry
  collection and email delivery.
- SSR-first rendering, dynamic sitemap/robots, OpenGraph generation and JSON-LD
  structured data.
- Strict-mode TypeScript, zod-validated configuration, zero layout shifts.

## Prerequisites

| Component | Minimum | Notes |
| --- | --- | --- |
| Node.js | 20.x LTS | 18 is unsupported; requires native fetch and AbortSignal.timeout |
| PostgreSQL | 16 | 15 works; 16 recommended |
| Redis | 7.x | Required by BullMQ; 6.2+ also works |
| Pterodactyl Panel | 1.11+ | Application and Client API keys with admin scope |
| Proxmox VE | 7.x / 8.x | API v2, user with VM and container permissions |
| VirtFusion | 2.x | Bearer token from the account area |
| Ubuntu | 22.04 LTS | Debian 12 also supported |

## Quickstart (development)

```bash
cp .env.example .env          # fill DATABASE_URL and REDIS_URL
npm install
npx prisma migrate dev
npm run dev                   # web on http://localhost:3000
```

Background workers run separately:

```bash
npm run worker
```

## Production installation

The non-interactive installer performs system checks, database migrations,
Redis verification, Pterodactyl API verification and super-admin creation:

```bash
DATABASE_URL=postgresql://aetheris:secret@127.0.0.1:5432/aetheris \
REDIS_URL=redis://127.0.0.1:6379 \
AETHERIS_APP_URL=https://app.example.com \
ADMIN_EMAIL=ops@example.com \
ADMIN_PASSWORD='a-very-long-password' \
PTERODACTYL_URL=https://panel.example.com \
PTERODACTYL_APP_API_KEY=ptla_... \
bash bin/install.sh --yes --systemd --nginx
```

Full guidance, including the manual Nginx and Certbot walkthrough, lives in the
[aetheris-docs installation guide](../aetheris-docs/wiki/installation.md).

## Environment variables

All variables are validated at boot by `src/lib/config/env.ts`; an invalid or
missing required value aborts startup with the exact field name.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | - | PostgreSQL connection string |
| `REDIS_URL` | yes | `redis://127.0.0.1:6379` | Redis connection string |
| `AETHERIS_APP_URL` | yes | - | Public base URL of the control plane |
| `AETHERIS_SECRET` | yes | - | Platform signing secret (>= 32 chars) |
| `NEXTAUTH_URL` | no | - | NextAuth callback base URL |
| `NEXTAUTH_SECRET` | no | - | NextAuth encryption secret |
| `STRIPE_SECRET_KEY` | no | - | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | no | - | Stripe webhook signing secret |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | no | - | PayPal REST credentials |
| `MOLLIE_API_KEY` | no | - | Mollie API key |
| `PTERODACTYL_URL` | no | - | Panel base URL |
| `PTERODACTYL_APP_API_KEY` | no | - | Panel Application API key |
| `PTERODACTYL_CLIENT_API_KEY` | no | - | Panel Client API key |
| `PROXMOX_URL` / `PROXMOX_USER` / `PROXMOX_PASSWORD` | no | - | Proxmox API v2 credentials |
| `PROXMOX_VERIFY_TLS` | no | `true` | Verify Proxmox TLS certificates |
| `VIRTFUSION_URL` / `VIRTFUSION_API_KEY` | no | - | VirtFusion REST credentials |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` | no | - | Cloudflare DNS and registrar |
| `NAMECHEAP_API_USER` / `NAMECHEAP_API_KEY` | no | - | Namecheap registrar |
| `BULLMQ_CONCURRENCY` | no | `8` | Worker concurrency per queue |

## Hypervisor drivers

Every backend implements the `HypervisorDriver` interface in
`src/lib/adapters/hypervisors/types.ts`, covering provisioning, rebuild,
suspend, unsuspend, terminate, power actions, telemetry, WebSocket console
sessions and backups. See the driver files for backend-specific notes:

- `pterodactyl.ts` - Application API for lifecycle and eggs, Client API for
  power, resources, console tokens and backups. Token-bucket rate limiting
  included.
- `proxmox.ts` - QEMU and LXC lifecycle over API v2, ticket authentication,
  VNC proxy console sessions, snapshot backups.
- `virtfusion.ts` - VM lifecycle over the REST API, snapshot backups; console
  WebSocket is not part of the public API and raises `NOT_SUPPORTED`.

The registry (`index.ts`) validates stored configurations with zod and
instantiates drivers; the Admin Panel persists encrypted credentials in the
`HypervisorCredential` table.

## Workers

BullMQ queues and their processors live in `src/workers`. Each queue has
exponential backoff and retry policies defined in `src/lib/queue.ts`:

- `aetheris.billing` - invoice finalization, charging, dunning.
- `aetheris.provisioning` - server creation and post-provision setup.
- `aetheris.telemetry` - periodic resource sampling for dashboards.
- `aetheris.email` - transactional email rendering and delivery.
- `aetheris.webhooks` - outbound webhook fan-out.

## Security

- Secrets are validated, never logged (the installer redacts credentials).
- Hypervisor credentials are encrypted at rest with AES-256-GCM before being
  written to the `HypervisorCredential` table.
- Security headers (CSP, HSTS, frame and referrer policies) are applied at the
  edge in `vercel.json`.
- Password hashes use scrypt with per-user salt and constant-time comparison.

## License

Proprietary enterprise software. See the license agreement distributed with
the organization account.
