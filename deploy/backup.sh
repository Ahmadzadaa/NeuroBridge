#!/usr/bin/env bash
# Daily backup on the server, run by cron (installed by bootstrap.sh):
#
#   /opt/bizsim/backup.sh
#
# - Database: gzipped pg_dump, kept 14 days, in backups/daily/.
# - Uploads (avatars, submissions, certificates): tar.gz, kept 7 days.
# - Off-server copy: when BACKUP_S3_BUCKET is set in .env and the AWS CLI is
#   installed, both files are copied to s3://$BACKUP_S3_BUCKET/bizsim/. The
#   instance role needs s3:PutObject on that bucket; no keys live on the server.
#
# Restore the database:
#   gunzip -c backups/daily/db-<stamp>.sql.gz | docker compose exec -T postgres psql -U bizsim bizsim
# Restore uploads:
#   docker run --rm -v bizsim_uploads:/data -v "$PWD/backups/daily:/in" alpine tar xzf /in/uploads-<stamp>.tar.gz -C /data
#   docker run --rm -v bizsim_uploads:/data -v "$PWD/backups/lesson-videos:/in" alpine sh -c 'mkdir -p /data/lesson-videos && cp -r /in/. /data/lesson-videos/'
set -euo pipefail
cd "$(dirname "$0")"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
DIR=backups/daily
mkdir -p "$DIR"

echo "[$(date -u +%FT%TZ)] backup $STAMP"

DB_FILE="$DIR/db-$STAMP.sql.gz"
docker compose exec -T postgres pg_dump -U bizsim bizsim | gzip > "$DB_FILE.part"
# A dump that ends early must not replace a good one.
gzip -t "$DB_FILE.part"
mv "$DB_FILE.part" "$DB_FILE"

UPLOADS_FILE="$DIR/uploads-$STAMP.tar.gz"
docker run --rm -v bizsim_uploads:/data:ro -v "$PWD/$DIR:/out" alpine \
  tar czf "/out/uploads-$STAMP.tar.gz" --exclude=./lesson-videos -C /data .

# Lesson videos are large and rarely change: one mirrored copy, not one per day.
docker run --rm -v bizsim_uploads:/data:ro -v "$PWD/backups:/out" alpine   sh -c 'mkdir -p /out/lesson-videos; [ ! -d /data/lesson-videos ] || cp -ru /data/lesson-videos/. /out/lesson-videos/'

ls -1t "$DIR"/db-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
ls -1t "$DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm --

BUCKET="$(grep -E '^BACKUP_S3_BUCKET=' .env 2>/dev/null | cut -d= -f2- || true)"
if [ -n "$BUCKET" ]; then
  if command -v aws >/dev/null; then
    aws s3 cp "$DB_FILE" "s3://$BUCKET/bizsim/db/" --only-show-errors
    aws s3 cp "$UPLOADS_FILE" "s3://$BUCKET/bizsim/uploads/" --only-show-errors
    aws s3 sync backups/lesson-videos "s3://$BUCKET/bizsim/lesson-videos/" --only-show-errors
    echo "copied to s3://$BUCKET/bizsim/"
  else
    echo "!! BACKUP_S3_BUCKET is set but the AWS CLI is not installed; kept on this server only" >&2
  fi
fi

echo "done: $(du -h "$DB_FILE" | cut -f1) database, $(du -h "$UPLOADS_FILE" | cut -f1) uploads"
