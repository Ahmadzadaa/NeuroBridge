#!/usr/bin/env bash
# Switches the app's email to Amazon SES once the repository has it configured.
# Run by the deploy workflow with values from GitHub (never typed on the server):
#   EMAIL_FROM             e.g. "BizSim <no-reply@your-domain>" — a verified SES identity
#   SES_REGION             e.g. eu-north-1 — where that identity is verified
#   SES_ACCESS_KEY_ID      optional; omit when the instance has an IAM role with ses:SendEmail
#   SES_SECRET_ACCESS_KEY  optional, as above
#   SUPPORT_NOTIFICATION_EMAIL  optional; where new support requests are announced
#                          (falls back to LEADS_NOTIFICATION_EMAIL, then EMAIL_FROM)
# Without EMAIL_FROM nothing changes and emails stay in the log (EMAIL_PROVIDER=console).
set -euo pipefail

ENV_FILE=/opt/bizsim/app.env

if [ -z "${EMAIL_FROM:-}" ]; then
  echo "==> Email: EMAIL_FROM not set, keeping the current provider"
  exit 0
fi

# Replaces or appends KEY=VALUE without sed, so values may contain any character.
set_env() {
  grep -v "^$1=" "$ENV_FILE" > "$ENV_FILE.tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE.tmp"
  cat "$ENV_FILE.tmp" > "$ENV_FILE"
  rm -f "$ENV_FILE.tmp"
}

set_env EMAIL_PROVIDER ses
set_env EMAIL_FROM "$EMAIL_FROM"
set_env AWS_REGION "${SES_REGION:-eu-north-1}"
if [ -n "${SES_ACCESS_KEY_ID:-}" ] && [ -n "${SES_SECRET_ACCESS_KEY:-}" ]; then
  set_env AWS_ACCESS_KEY_ID "$SES_ACCESS_KEY_ID"
  set_env AWS_SECRET_ACCESS_KEY "$SES_SECRET_ACCESS_KEY"
fi
if [ -n "${SUPPORT_NOTIFICATION_EMAIL:-}" ]; then
  set_env SUPPORT_NOTIFICATION_EMAIL "$SUPPORT_NOTIFICATION_EMAIL"
fi
echo "==> Email: Amazon SES ($EMAIL_FROM, ${SES_REGION:-eu-north-1})"
