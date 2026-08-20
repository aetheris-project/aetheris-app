#!/usr/bin/env bash
# =============================================================================
# Aetheris - Stack manager (Linux, macOS, Git Bash on Windows)
# =============================================================================
# Companion to scripts/manage.ps1. Every subcommand maps to a `docker
# compose` call so the same workflows work on Windows and Linux.
#
# Usage (from the repository root):
#   bash scripts/manage.sh status
#   bash scripts/manage.sh start
#   bash scripts/manage.sh stop
#   bash scripts/manage.sh restart
#   bash scripts/manage.sh down
#   bash scripts/manage.sh logs --tail 300
#   bash scripts/manage.sh logs -f
#   bash scripts/manage.sh pull
#
# The stack targets the SQLite compose file when AETHERIS_DB_MODE=sqlite is
# set in .env (or with --sqlite), otherwise the full PostgreSQL stack.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker-compose.yml"
if [[ -f .env ]] && grep -q '^AETHERIS_DB_MODE=sqlite' .env; then
  COMPOSE="docker-compose.sqlite.yml"
fi

usage() {
  cat <<'EOF'
Aetheris stack manager

  status   - show container states (docker compose ps)
  start    - bring the stack up (docker compose up -d)
  stop     - stop containers, keep volumes (docker compose stop)
  restart  - stop then start the stack
  down     - stop containers and remove volumes (docker compose down -v)
  logs     - print the last lines; pass -f to tail live, --tail N to change
  pull     - refresh all images (docker compose pull)

Options: --sqlite (force the SQLite compose file), --tail N, -f (follow)
EOF
}

COMPOSE_FILE="$COMPOSE"
TAIL=200
FOLLOW=0
ACTION="${1:-status}"
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sqlite) COMPOSE_FILE="docker-compose.sqlite.yml" ;;
    --tail) TAIL="$2"; shift ;;
    -f) FOLLOW=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: $COMPOSE_FILE not found - run this script from the repository root." >&2
  exit 1
fi

case "$ACTION" in
  status)  docker compose -f "$COMPOSE_FILE" ps ;;
  start)   docker compose -f "$COMPOSE_FILE" up -d ;;
  stop)    docker compose -f "$COMPOSE_FILE" stop ;;
  restart) docker compose -f "$COMPOSE_FILE" stop && docker compose -f "$COMPOSE_FILE" up -d ;;
  down)    docker compose -f "$COMPOSE_FILE" down -v --remove-orphans ;;
  pull)    docker compose -f "$COMPOSE_FILE" pull ;;
  logs)
    if [[ "$FOLLOW" == "1" ]]; then
      docker compose -f "$COMPOSE_FILE" logs -f --tail "$TAIL" --timestamps
    else
      docker compose -f "$COMPOSE_FILE" logs --tail "$TAIL" --timestamps
    fi
    ;;
  *) usage ;;
esac
