# BizSim production image — Next.js standalone on ECS Fargate
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl postgresql-client
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
# prisma generate (postinstall) runs later, once the schema is copied in.
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined at build time, server code included; without
# this PayTR would send buyers back to http://localhost:3000 after paying.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# prisma/schema.prisma is pinned to sqlite for local development. Generating
# from it here would ship a SQLite client to a container whose DATABASE_URL is
# PostgreSQL, and every query would fail on the first request.
RUN node scripts/gen-postgres-schema.mjs
RUN npx prisma generate --schema=prisma/schema.postgres.prisma
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Certificate backgrounds and the embedded fonts are read at runtime from
# `process.cwd()/assets`. Next's standalone tracing cannot see a path built at
# runtime, so without this line certificate rendering fails in production.
COPY --from=builder /app/assets ./assets
# The AI system prompts are Markdown files read at runtime, for the same reason.
COPY --from=builder /app/src/ai/prompts ./src/ai/prompts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# The Prisma CLI, so the entrypoint can bring the schema up to date on start.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/package.json ./package.json
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Local-storage uploads live on a mounted volume; it must be writable by nextjs.
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
