#!/usr/bin/env bash
# Server setup for BizSim on Ubuntu (EC2). GitHub Actions runs it before every
# deploy (see .github/workflows/deploy-ec2.yml), so a fresh instance needs no
# manual steps; it can also be run by hand:
#
#   bash bootstrap.sh "<public URL, e.g. http://51.20.65.0>" ["<extra ssh public key>"]
#
# Installs Docker, adds swap, frees port 80 from an old nginx and creates
# /opt/bizsim with generated secrets. Idempotent: existing secrets are kept.
set -euo pipefail

PUBLIC_URL="${1:?public URL required, e.g. http://51.20.65.0}"
DEPLOY_KEY="${2:-}"
APP_DIR=/opt/bizsim

echo "==> Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi

echo "==> Swap (small instances run out of memory without it)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Freeing ports 80/443 (the previous site's nginx)"
if systemctl list-unit-files | grep -q '^nginx'; then
  sudo systemctl disable --now nginx || true
fi

echo "==> $APP_DIR"
sudo mkdir -p "$APP_DIR/backups"
sudo chown -R "$USER":"$USER" "$APP_DIR"

secret() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48; }

if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<EOF
# Compose settings. APP_TAG is managed by deploy.sh.
IMAGE=ghcr.io/REPLACE_OWNER/REPLACE_REPO
APP_TAG=none
SITE_ADDRESS=:80
POSTGRES_PASSWORD=$(secret)
EOF
fi

if [ ! -f "$APP_DIR/app.env" ]; then
  PG_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$APP_DIR/.env" | cut -d= -f2-)"
  cat > "$APP_DIR/app.env" <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://bizsim:${PG_PASSWORD}@postgres:5432/bizsim
AUTH_SECRET=$(secret)
TOTP_ENCRYPTION_KEY=$(secret)
TWO_FACTOR_ENABLED=false
APP_BASE_URL=${PUBLIC_URL}
NEXT_PUBLIC_APP_URL=${PUBLIC_URL}
# One server: in-memory rate limiting is fine (no Redis needed).
ALLOW_IN_MEMORY_RATE_LIMIT=true
STORAGE_DRIVER=local
# Emails are only logged until a provider (e.g. SES) is configured.
EMAIL_PROVIDER=console
EMAIL_FROM=BizSim <no-reply@bizsim.az>
# PayTR: sandbox until the site has a domain with HTTPS (live requires https).
PAYTR_MODE=sandbox
PAYTR_SANDBOX_MERCHANT_ID=
PAYTR_SANDBOX_MERCHANT_KEY=
PAYTR_SANDBOX_MERCHANT_SALT=
ANTHROPIC_API_KEY=
EOF
  chmod 600 "$APP_DIR/app.env" "$APP_DIR/.env"
fi

if [ -n "$DEPLOY_KEY" ]; then
  echo "==> Authorising extra SSH key"
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
  grep -qxF "$DEPLOY_KEY" ~/.ssh/authorized_keys || echo "$DEPLOY_KEY" >> ~/.ssh/authorized_keys
fi

echo "==> Server ready ($APP_DIR). Secrets live in $APP_DIR/app.env."
