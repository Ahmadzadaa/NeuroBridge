#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: DATABASE_URL=... $0 <backup-file.sql.gz>"
  exit 1
fi

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "[restore] Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[restore] WARNING: This will overwrite data in the target database."
echo "[restore] Target: ${DATABASE_URL}"
read -r -p "Type RESTORE to continue: " CONFIRM

if [[ "${CONFIRM}" != "RESTORE" ]]; then
  echo "[restore] Aborted"
  exit 1
fi

echo "[restore] Restoring from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}" --single-transaction --set ON_ERROR_STOP=on

echo "[restore] Re-applying RLS policies..."
psql "${DATABASE_URL}" -f prisma/migrations/rls/001_enable_rls.sql

echo "[restore] Done. Verify with: curl http://localhost:3000/api/health/ready"
