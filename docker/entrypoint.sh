#!/usr/bin/env sh
# Aetheris container entrypoint.
#   docker run aetheris-app web     -> Next.js production server
#   docker run aetheris-app worker  -> BullMQ background workers
#
# Applies pending Prisma migrations before either process starts so a fresh
# database is ready on first boot. Migrations are idempotent (prisma migrate
# deploy only applies pending ones).

set -eu

mode="${1:-web}"

db_mode="${AETHERIS_DB_MODE:-postgres}"
case "${DATABASE_URL:-}" in
  file:*) db_mode=sqlite ;;
esac

if [ "$db_mode" = "sqlite" ]; then
  echo "[aetheris] applying sqlite migrations (mode=${mode})"
  npx prisma migrate deploy --schema prisma/sqlite/schema.prisma
else
  echo "[aetheris] applying database migrations (mode=${mode})"
  npx prisma migrate deploy
fi

case "${mode}" in
  web)
    echo "[aetheris] starting web server on :${PORT:-3000}"
    exec node node_modules/next/dist/bin/next start -p "${PORT:-3000}"
    ;;
  worker)
    echo "[aetheris] starting background workers"
    exec node node_modules/tsx/dist/cli.mjs src/workers/index.ts
    ;;
  *)
    echo "unknown mode '${mode}' (expected web or worker)" >&2
    exit 1
    ;;
esac
