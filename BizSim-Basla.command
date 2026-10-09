#!/bin/bash
# BizSim — iki dəfə klikləyib işə sal
cd "$(dirname "$0")"
clear
echo "=============================================="
echo "   BizSim — lokal server"
echo "=============================================="
echo ""

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "!! Node.js tapılmadı. Yükləmə səhifəsini açıram."
  open "https://nodejs.org/en/download" 2>/dev/null
  read -p "Bağlamaq üçün Enter..." x; exit 1
fi
echo "Node: $(node -v)   npm: $(npm -v)"
echo ""

# Köhnə server hələ arxada işləyirsə onu dayandır. İki server eyni .next
# qovluğunu paylaşa bilmir: biri keşi silir, o biri silinmiş chunk-ları
# axtarır və səhifə "Internal Server Error" verir.
OLD_PIDS=$(pgrep -f "next dev" 2>/dev/null)
if [ -n "$OLD_PIDS" ]; then
  echo "==> Arxada işləyən köhnə server dayandırılır..."
  kill $OLD_PIDS 2>/dev/null
  sleep 3
  kill -9 $(pgrep -f "next dev" 2>/dev/null) 2>/dev/null
fi

# İlk dəfə: Windows-dan gələn paketləri təmizlə
if [ ! -f ".mac-ready" ]; then
  echo "==> Köhnə (Windows) paketlər silinir..."
  rm -rf node_modules .next
  touch .mac-ready
fi

# Hər dəfə: çatışmayan paketləri yüklə (hər şey yerindədirsə bir neçə saniyə çəkir)
echo "==> Paketlər yoxlanılır..."
npm install || { echo ""; echo "!! npm install alınmadı — yuxarıdakı xətanı Claude-a göndər."
                 read -p "Enter..." x; exit 1; }

echo "==> Prisma client..."
npx prisma generate >/dev/null 2>&1

# Turbopack bundles the generated Prisma client into .next and does not always
# notice when node_modules changes underneath it. A stale bundle keeps the old
# database model alive and every query fails with "Unknown field". Compare a
# stamp against the client and throw the cache away when they disagree.
CLIENT_STAMP=""
if [ -f "node_modules/.prisma/client/index.js" ]; then
  CLIENT_STAMP=$(stat -f %m "node_modules/.prisma/client/index.js" 2>/dev/null)
fi
if [ -n "$CLIENT_STAMP" ] && [ "$CLIENT_STAMP" != "$(cat .next/.prisma-stamp 2>/dev/null)" ]; then
  echo "==> Baza modeli dəyişib — köhnə keş silinir (ilk açılış bir az uzun çəkəcək)..."
  rm -rf .next
  mkdir -p .next
  echo "$CLIENT_STAMP" > .next/.prisma-stamp
fi

echo ""
echo "=============================================="
echo "   Server: http://localhost:3000/az"
echo "   Sertifikatlar: /az/tenant/certificates"
echo "   Dayandırmaq: Control + C"
echo "=============================================="
echo ""

# Wait for a real page, not just an open port. After the cache is cleared the
# server answers immediately but Turbopack is still writing its manifests, so
# the first request comes back 500 — and the browser used to open straight
# onto that error. Only a 2xx/3xx counts as ready.
( for i in $(seq 1 90); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/az)
    if [ "$code" -ge 200 ] 2>/dev/null && [ "$code" -lt 400 ]; then
      open "http://localhost:3000/az"

      # Dev builds compile a route the first time it is opened, which is the
      # one to two second pause on the first click into each menu item. Warm
      # the common pages in the background so that pause is spent here rather
      # than while someone is waiting on a click. Auth redirects still compile
      # the route, so no login is needed.
      for page in \
        /az/login /az/tenant /az/tenant/participants /az/tenant/programs \
        /az/tenant/certificates /az/tenant/reports /az/tenant/settings \
        /az/tenant/teachers /az/tenant/billing /az/participant \
        /az/participant/simulations /az/participant/trainings \
        /az/participant/certificates /az/participant/leaderboard
      do
        curl -s -o /dev/null "http://localhost:3000${page}"
      done
      break
    fi
    sleep 2
  done ) &

npm run dev

# Server dayandırılandan sonra pəncərə bağlanmasın ki, xəta görünsün
echo ""
echo "Server dayandırıldı."
exec $SHELL
