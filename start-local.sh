#!/usr/bin/env bash
# BizSim — Mac-də lokal işə salma skripti
set -e
cd "$(dirname "$0")"

echo "==> Node yoxlanılır..."
if ! command -v node >/dev/null 2>&1; then
  echo "!! Node.js tapılmadı. Quraşdır: https://nodejs.org (LTS) və ya: brew install node"
  exit 1
fi
node -v

echo "==> Köhnə (Windows) node_modules silinir..."
rm -rf node_modules .next

echo "==> Paketlər quraşdırılır (bir neçə dəqiqə çəkə bilər)..."
npm install

echo "==> Prisma client yaradılır..."
npx prisma generate

echo "==> Baza sinxronlaşdırılır..."
npx prisma db push --accept-data-loss

echo ""
echo "==> Server başladılır: http://localhost:3000/az"
npm run dev
