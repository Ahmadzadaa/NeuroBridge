#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${S3_BUCKET:-}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
FILENAME="bizsim_${TIMESTAMP}.sql.gz"
OUTPUT_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting PostgreSQL dump..."
pg_dump "${DATABASE_URL}" --no-owner --no-acl | gzip > "${OUTPUT_PATH}"
echo "[backup] Created ${OUTPUT_PATH} ($(du -h "${OUTPUT_PATH}" | cut -f1))"

if [[ -n "${S3_BUCKET}" ]]; then
  echo "[backup] Uploading to s3://${S3_BUCKET}/daily/${FILENAME}..."
  aws s3 cp "${OUTPUT_PATH}" "s3://${S3_BUCKET}/daily/${FILENAME}" \
    --storage-class STANDARD
  echo "[backup] Upload complete"
fi

echo "[backup] Done"
