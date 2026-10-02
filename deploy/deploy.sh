#!/usr/bin/env bash
# Runs on the server (called by GitHub Actions): deploy one image version,
# keep the site up if it is bad.
#
#   ./deploy.sh <image-tag>
#
# 1. Backs up the database.
# 2. Starts the new app + worker.
# 3. Waits for the app's health check. If it never turns healthy, the previous
#    version is started again and the script fails, so the broken commit is
#    visible in GitHub while visitors keep using the last good version.
set -euo pipefail
cd "$(dirname "$0")"

NEW_TAG="${1:?usage: deploy.sh <image-tag>}"
PREV_TAG="$(grep -E '^APP_TAG=' .env | cut -d= -f2- || true)"

set_tag() { sed -i "s/^APP_TAG=.*/APP_TAG=$1/" .env; }

echo "==> Backing up the database"
mkdir -p backups
if docker compose ps --status running postgres | grep -q postgres; then
  docker compose exec -T postgres pg_dump -U bizsim bizsim | gzip > "backups/bizsim-$(date +%Y%m%d-%H%M%S)-before-${NEW_TAG:0:7}.sql.gz"
  # Keep the 20 most recent.
  ls -1t backups/*.sql.gz 2>/dev/null | tail -n +21 | xargs -r rm --
fi

echo "==> Starting version ${NEW_TAG:0:7} (previous: ${PREV_TAG:0:7})"
set_tag "$NEW_TAG"
docker compose pull app worker
docker compose up -d postgres caddy
docker compose up -d --no-deps app worker

echo "==> Waiting for the app to become healthy"
status="starting"
for _ in $(seq 1 48); do   # up to 4 minutes: schema sync + Next.js start
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' bizsim-app 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  sleep 5
done

if [ "$status" != "healthy" ]; then
  echo "!! New version is not healthy (status: $status). Last app logs:"
  docker compose logs --tail=100 app || true
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$NEW_TAG" ]; then
    echo "==> Rolling back to ${PREV_TAG:0:7}"
    set_tag "$PREV_TAG"
    docker compose up -d --no-deps app worker
  fi
  exit 1
fi

echo "==> Reference data (idempotent; never resets accounts or edited prices)"
# SEED_ADMIN_PASSWORD only matters on the first run, when no super admin exists yet.
docker compose exec -T -e SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-}" worker npx tsx prisma/seed.ts   || echo "!! Seed failed (first install needs the SEED_ADMIN_PASSWORD secret)"
docker compose exec -T worker npx tsx scripts/import-universities.ts || echo "!! University import failed"
# The scenario seed rebuilds its rounds, so it runs once per server.
if [ ! -f .seeded-simulation ]; then
  docker compose exec -T worker npx tsx prisma/seed-simulation.ts && touch .seeded-simulation     || echo "!! Simulation scenario seed failed"
fi

# Fills simulations that have no rounds yet; leaves existing ones untouched.
docker compose exec -T worker npx tsx prisma/seed-scenarios.ts || echo "!! Scenario seed failed"

echo "==> Deployed ${NEW_TAG:0:7}"
docker image prune -f >/dev/null
