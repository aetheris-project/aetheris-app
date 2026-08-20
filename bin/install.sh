#!/usr/bin/env bash
# =============================================================================
# Aetheris - Non-interactive installer
# =============================================================================
#
# Installs and configures the aetheris-app control panel on Ubuntu 22.04 LTS
# or Debian 12. Runs from the repository root:
#
#   bash bin/install.sh --yes
#
# Pipeline:
#   1. Preflight: bash, node >= 20, npm, openssl, curl, ~2 GB free RAM,
#      10 GB free disk.
#   2. Dependencies: npm install.
#   3. Database: reachability probe, Prisma generate, migrations.
#   4. Redis: reachability probe, authenticated ping.
#   5. Pterodactyl: Application API verification when credentials are set.
#   6. Super admin: idempotent creation of the initial administrator account.
#   7. Optional: Systemd units and an Nginx site template.
#
# The installer never prompts. Provide every value through flags or
# environment variables; anything missing causes a hard stop with the exact
# variable name, so the run stays reproducible in CI.
#
# Flags:
#   --yes                 Non-interactive mode (required for automation).
#   --skip-checks         Skip resource and reachability probes.
#   --systemd             Install systemd units (requires root).
#   --nginx               Write an Nginx site template (requires root).
#   -h, --help            Show this help.
#
# Environment:
#   DATABASE_URL, REDIS_URL, AETHERIS_APP_URL, AETHERIS_SECRET,
#   PTERODACTYL_URL, PTERODACTYL_APP_API_KEY, PTERODACTYL_CLIENT_API_KEY,
#   ADMIN_EMAIL, ADMIN_PASSWORD
#
# Exit codes:
#   0 success; 1 preflight failure; 2 dependency failure; 3 database failure;
#   4 redis failure; 5 pterodactyl verification failure; 6 super admin failure.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_CHECKS=false
INSTALL_SYSTEMD=false
INSTALL_NGINX=false
ASSUME_YES=false

log()  { printf "\033[1;32m[aetheris]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[aetheris] warning:\033[0m %s\n" "$*" >&2; }
die()  { printf "\033[1;31m[aetheris] error:\033[0m %s\n" "$*" >&2; exit "${2:-1}"; }

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) ASSUME_YES=true; shift ;;
      --skip-checks) SKIP_CHECKS=true; shift ;;
      --systemd) INSTALL_SYSTEMD=true; shift ;;
      --nginx) INSTALL_NGINX=true; shift ;;
      -h|--help) sed -n '1,40p' "${BASH_SOURCE[0]}"; exit 0 ;;
      *) die "unknown argument: $1" ;;
    esac
  done
}

require_env() {
  local name="$1" value="${!1:-}"
  if [[ -z "$value" ]]; then
    die "environment variable $name is required (set it before running or add it to .env)"
  fi
}

# ---------------------------------------------------------------------------
# Phase 1: Preflight
# ---------------------------------------------------------------------------

parse_args "$@"

if [[ "$ASSUME_YES" != "true" ]]; then
  die "this installer is non-interactive; pass --yes to run it"
fi

log "phase 1/7: preflight checks"

command -v bash >/dev/null 2>&1 || die "bash is required"
command -v node >/dev/null 2>&1 || die "node.js >= 20 is required"
command -v npm >/dev/null 2>&1 || die "npm is required"
command -v openssl >/dev/null 2>&1 || die "openssl is required"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 20 )); then
  die "node.js >= 20 required, found $NODE_MAJOR"
fi

if [[ "$SKIP_CHECKS" != "true" ]]; then
  TOTAL_MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  if (( TOTAL_MEM_KB > 0 && TOTAL_MEM_KB < 2097152 )); then
    die "at least 2 GB of RAM required, found $((TOTAL_MEM_KB / 1024)) MB"
  fi

  FREE_DISK_KB="$(df -Pk "$ROOT_DIR" | awk 'NR==2 {print $4}')"
  if (( FREE_DISK_KB < 10485760 )); then
    die "at least 10 GB of free disk is required, found $((FREE_DISK_KB / 1024)) MB"
  fi
fi

# ---------------------------------------------------------------------------
# Phase 2: Environment
# ---------------------------------------------------------------------------

log "phase 2/7: environment"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  if [[ -f "$ROOT_DIR/.env.example" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    warn ".env created from .env.example; review every value before production use"
  fi
fi

# shellcheck source=/dev/null
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

require_env DATABASE_URL
require_env REDIS_URL
require_env AETHERIS_APP_URL

if [[ -z "${AETHERIS_SECRET:-}" ]]; then
  AETHERIS_SECRET="$(openssl rand -hex 32)"
  export AETHERIS_SECRET
  warn "AETHERIS_SECRET was not set; generated a random value. Persist it in .env now."
fi

log "application url: $AETHERIS_APP_URL"
log "database url: ${DATABASE_URL%%@*}@***"

# ---------------------------------------------------------------------------
# Phase 3: Dependencies
# ---------------------------------------------------------------------------

log "phase 3/7: dependencies"
(
  cd "$ROOT_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
) || die "npm install failed" 2

# ---------------------------------------------------------------------------
# Phase 4: Database
# ---------------------------------------------------------------------------

log "phase 4/7: database"

db_host() {
  local url="$1"
  url="${url#*://}"
  url="${url%%/*}"
  url="${url##*@}"
  printf '%s' "${url%:*}"
}

db_port() {
  local url="$1"
  url="${url#*://}"
  url="${url%%/*}"
  url="${url##*@}"
  if [[ "$url" == *:* ]]; then printf '%s' "${url##*:}"; else printf '5432'; fi
}

if [[ "$SKIP_CHECKS" != "true" ]]; then
  HOST="$(db_host "$DATABASE_URL")"
  PORT="$(db_port "$DATABASE_URL")"
  log "probing postgres at $HOST:$PORT"
  node -e "
    const net = require('net');
    const socket = net.connect($PORT, '$HOST');
    socket.setTimeout(8000);
    socket.on('connect', () => { console.log('postgres reachable'); process.exit(0); });
    socket.on('timeout', () => { console.error('postgres connection timed out'); process.exit(1); });
    socket.on('error', (error) => { console.error('postgres unreachable:', error.message); process.exit(1); });
  " || die "postgres is not reachable at $HOST:$PORT" 3
fi

log "generating prisma client"
(
  cd "$ROOT_DIR"
  DATABASE_URL="$DATABASE_URL" npx prisma generate
) || die "prisma generate failed" 3

log "applying migrations"
(
  cd "$ROOT_DIR"
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
) || die "prisma migrate deploy failed" 3

# ---------------------------------------------------------------------------
# Phase 5: Redis
# ---------------------------------------------------------------------------

log "phase 5/7: redis"

redis_host() {
  local url="$1"
  url="${url#*://}"
  url="${url%%/*}"
  url="${url##*@}"
  printf '%s' "${url%:*}"
}

redis_port() {
  local url="$1"
  url="${url#*://}"
  url="${url%%/*}"
  url="${url##*@}"
  if [[ "$url" == *:* ]]; then printf '%s' "${url##*:}"; else printf '6379'; fi
}

if [[ "$SKIP_CHECKS" != "true" ]]; then
  HOST="$(redis_host "$REDIS_URL")"
  PORT="$(redis_port "$REDIS_URL")"
  log "probing redis at $HOST:$PORT"
  node -e "
    const net = require('net');
    const socket = net.connect($PORT, '$HOST');
    socket.setTimeout(8000);
    socket.on('connect', () => {
      socket.write('PING\r\n');
      socket.on('data', (data) => {
        if (String(data).includes('PONG')) { console.log('redis reachable (PONG)'); process.exit(0); }
        process.exit(1);
      });
    });
    socket.on('timeout', () => { console.error('redis connection timed out'); process.exit(1); });
    socket.on('error', (error) => { console.error('redis unreachable:', error.message); process.exit(1); });
  " || die "redis is not reachable at $HOST:$PORT" 4
fi

# ---------------------------------------------------------------------------
# Phase 6: Pterodactyl verification and super admin
# ---------------------------------------------------------------------------

if [[ -n "${PTERODACTYL_URL:-}" && -n "${PTERODACTYL_APP_API_KEY:-}" ]]; then
  log "phase 6/7: verifying pterodactyl application api"
  if ! command -v curl >/dev/null 2>&1; then
    die "curl is required for the pterodactyl verification step" 5
  fi
  HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $PTERODACTYL_APP_API_KEY" \
    -H "Accept: application/vnd.pterodactyl.v1+json" \
    --max-time 15 \
    "$PTERODACTYL_URL/api/application/nodes?per_page=1" || true)"
  if [[ "$HTTP_CODE" != "200" ]]; then
    die "pterodactyl application api returned HTTP $HTTP_CODE (expected 200); check PTERODACTYL_URL and PTERODACTYL_APP_API_KEY" 5
  fi
  log "pterodactyl application api verified"
else
  warn "skipping pterodactyl verification (set PTERODACTYL_URL and PTERODACTYL_APP_API_KEY)"
fi

log "phase 7/7: super admin account"
require_env ADMIN_EMAIL
require_env ADMIN_PASSWORD
(
  cd "$ROOT_DIR"
  DATABASE_URL="$DATABASE_URL" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    node --input-type=module <<'NODE'
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const derived = scryptSync(password, salt, 64).toString("hex");
const passwordHash = `scrypt:${salt}:${derived}`;

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const [scheme, storedSalt, storedHash] = existing.passwordHash?.split(":") ?? [];
    if (scheme === "scrypt" && storedSalt && storedHash) {
      const candidate = scryptSync(password, storedSalt, 64);
      const expected = Buffer.from(storedHash, "hex");
      if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
        console.log(`super admin ${email} already exists with matching credentials`);
        process.exit(0);
      }
    }
    console.error(`a user with email ${email} already exists; provide a different ADMIN_EMAIL or remove the user`);
    process.exit(1);
  }

  await prisma.user.create({
    data: { email, passwordHash, role: "superadmin", name: "Aetheris Administrator" }
  });
  console.log(`super admin created: ${email}`);
} finally {
  await prisma.$disconnect();
}
NODE
) || die "super admin setup failed" 6

# ---------------------------------------------------------------------------
# Phase 8: Systemd and Nginx (optional, root-only)
# ---------------------------------------------------------------------------

if [[ "$INSTALL_SYSTEMD" == "true" ]]; then
  if [[ "$(id -u)" != "0" ]]; then
    die "--systemd requires root; re-run with sudo" 1
  fi

  log "writing systemd units"
  NODE_BIN="$(command -v node)"
  cat > /etc/systemd/system/aetheris-web.service <<UNIT
[Unit]
Description=Aetheris control panel (Next.js)
After=network.target postgresql.service redis-server.service
Wants=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
EnvironmentFile=$ROOT_DIR/.env
ExecStart=$NODE_BIN $ROOT_DIR/node_modules/next/dist/bin/next start -p 3000
Restart=on-failure
RestartSec=3
User=$USER
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

  cat > /etc/systemd/system/aetheris-worker.service <<UNIT
[Unit]
Description=Aetheris background workers (BullMQ)
After=network.target redis-server.service
Wants=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
EnvironmentFile=$ROOT_DIR/.env
ExecStart=$NODE_BIN $ROOT_DIR/node_modules/.bin/tsx $ROOT_DIR/src/workers/index.ts
Restart=on-failure
RestartSec=5
User=$USER
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  log "systemd units written; start with: systemctl enable --now aetheris-web aetheris-worker"
fi

if [[ "$INSTALL_NGINX" == "true" ]]; then
  if [[ "$(id -u)" != "0" ]]; then
    die "--nginx requires root; re-run with sudo" 1
  fi
  mkdir -p "$ROOT_DIR/deploy"
  cat > "$ROOT_DIR/deploy/aetheris.conf" <<NGINX
# Aetheris - Nginx site template
# Enable with: ln -s $ROOT_DIR/deploy/aetheris.conf /etc/nginx/sites-enabled/
# Run certbot --nginx -d <domain> after enabling.

server {
    listen 80;
    listen [::]:80;
    server_name aetheris.example.com;

    client_max_body_size 32m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
    }
}
NGINX
  log "nginx template written to $ROOT_DIR/deploy/aetheris.conf"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

log "installation complete"
log "  web:        $AETHERIS_APP_URL"
log "  super admin: $ADMIN_EMAIL"
log "  next steps:"
log "    1. Review $ROOT_DIR/.env and rotate AETHERIS_SECRET if it was generated."
log "    2. Start the web server: npm run start (or systemctl start aetheris-web)."
log "    3. Start the workers: npm run worker (or systemctl start aetheris-worker)."
log "    4. Configure hypervisor credentials and whitelabeling in the Admin Panel."
