#!/bin/sh
set -e

PRISMA="node node_modules/prisma/build/index.js"

# Single-server (EC2) mode: sync the schema without --accept-data-loss, so an
# additive change applies and a destructive one stops the start instead of
# dropping data — the deploy script then rolls back to the previous version.
if [ "${DB_SCHEMA_SYNC:-}" = "push" ]; then
  echo "[entrypoint] Syncing database schema (prisma db push)..."
  $PRISMA db push --skip-generate --schema=prisma/schema.postgres.prisma
elif [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Running Prisma migrations..."
  $PRISMA migrate deploy --schema=prisma/schema.postgres.prisma
  if [ -f "prisma/migrations/rls/001_enable_rls.sql" ] && [ "${APPLY_RLS:-false}" = "true" ]; then
    echo "[entrypoint] Applying RLS policies..."
    psql "${DATABASE_URL}" -f prisma/migrations/rls/001_enable_rls.sql
  fi
fi

exec "$@"
