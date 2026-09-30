#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
  if [ -f "prisma/migrations/rls/001_enable_rls.sql" ] && [ "${APPLY_RLS:-false}" = "true" ]; then
    echo "[entrypoint] Applying RLS policies..."
    psql "${DATABASE_URL}" -f prisma/migrations/rls/001_enable_rls.sql
  fi
fi

exec "$@"
