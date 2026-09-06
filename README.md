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

Local dev uses **SQLite** (`file:./dev.db`) — no Docker required. First-time setup:

```bash
npm run db:setup
```

Then restart the dev server (`npm run dev`).

For production/AWS, switch the Prisma provider to `postgresql` in `prisma/schema.prisma` and set `DATABASE_URL` to your RDS connection string.

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
| Tenant Admin | admin@demo-teknopark.com | Demo123! |
| Participant | ahmet.yilmaz0@demo.com | Demo123! |
| Jury | jury@demo-teknopark.com | Demo123! |

> Demo data: `npm run db:seed-demo` (tenant, programs, trainings, exams), then `npm run db:seed-hackathon` (hackathon program, teams, jury users, criteria, sample PDF submissions).

> **Local dev:** Demo accounts skip 2FA automatically in development. Re-run `npx prisma db seed` to reset passwords and clear 2FA if you get locked out.

## Document Storage

Issued certificates are written through a storage adapter (`src/lib/storage/`),
selected by `STORAGE_DRIVER`:

| Driver | When | Where |
|--------|------|-------|
| `local` | development (default) | `uploads/` on disk |
| `s3` | production (default) | `S3_DOCUMENTS_BUCKET` |

The ECS container filesystem is ephemeral, so `local` in production loses every
issued certificate on the next deploy. The bucket is fully private: downloads
go through `/api/certificates/[id]/file`, which authorises the caller and then
redirects to a presigned URL (`STORAGE_SIGNED_URL_TTL`, default 300s).

Copy existing local certificates into the bucket with:

```bash
npx tsx scripts/migrate-certificates-to-s3.ts --dry-run
```

Drop `--dry-run` to apply. The script is idempotent and never deletes the local
original.

### Minimal IAM policy

The task role needs object-level access to one prefix, and nothing else:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BizSimCertificateObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<S3_DOCUMENTS_BUCKET>/certificates/*"
    }
  ]
}
```

`s3:ListBucket` is deliberately omitted — `exists()` uses `HeadObject`, which is
covered by `s3:GetObject`, so the role cannot enumerate the bucket. Add
`arn:aws:s3:::<bucket>/exports/*` only once something writes export archives.

## Panel Architecture

| Panel | Route | Roles |
|-------|-------|-------|
| Super Admin | `/super-admin` | SUPER_ADMIN |
| Tenant | `/tenant` | TENANT_ADMIN, TENANT_VIEWER |
| Participant | `/participant` | PARTICIPANT |
| Jury | `/jury` | JURY |

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
