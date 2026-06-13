# BizSim — Entrepreneurship Simulation Platform

Multi-tenant B2B SaaS platform for entrepreneurship simulation, training, gamification, and AI-powered learning.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **next-intl** (TR / EN / AZ)
- **NextAuth.js v5** (RBAC)
- **Prisma** + PostgreSQL
- **Framer Motion** + Recharts
- **TanStack Query** + Zustand

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` and `AUTH_SECRET` in `.env`.

Local dev uses **SQLite** (`file:./dev.db`) — no PostgreSQL install needed. For production, switch the Prisma provider to `postgresql` and update `DATABASE_URL`.

### 3. Set up database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000/tr](http://localhost:3000/tr)

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@bizsim.com | Admin123! |
| Tenant Admin | tenant@demo-tekno.com | Admin123! |
| Participant | participant@demo.com | Admin123! |

## Panel Architecture

| Panel | Route | Roles |
|-------|-------|-------|
| Super Admin | `/super-admin` | SUPER_ADMIN |
| Tenant | `/tenant` | TENANT_ADMIN, TENANT_VIEWER |
| Participant | `/participant` | PARTICIPANT |

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # i18n routes (tr, en, az)
│   │   ├── super-admin/   # Platform owner panel
│   │   ├── tenant/        # Organization admin panel
│   │   └── participant/   # Student/entrepreneur panel
│   └── api/               # API routes
├── components/
│   ├── layout/            # Dashboard layout, nav, theme
│   └── ui/                # shadcn/ui components
├── i18n/                  # next-intl config
└── lib/                   # Prisma, auth, constants
messages/                  # tr.json, en.json, az.json
prisma/                    # Schema + seed (67 badges)
```

## Implementation Status

- [x] Enterprise RBAC + PostgreSQL RLS + 2FA
- [x] Seat licensing + payment webhooks (Stripe/Payriff/Iyzico)
- [x] Monitoring (Sentry, CloudWatch, health endpoints)
- [x] Audit logging + backup runbooks
- [x] Redis caching, pagination, background jobs
- [x] Unit / integration / E2E tests (~90% coverage)
- [x] AWS deployment (Docker, ECS/Fargate, RDS, CloudFront, S3, Secrets Manager)

See `docs/DEPLOYMENT.md` for AWS setup and `docs/PRODUCTION_AUDIT_REPORT.md` for readiness scores.
