# BizSim Security Architecture

## Overview

BizSim implements defense-in-depth for a multi-tenant B2B SaaS platform:

1. **Application-layer RBAC** — role-permission matrix enforced on every API route
2. **Database-layer RLS** — PostgreSQL row-level security scoped by session variables
3. **Input validation** — Zod schemas on all API payloads
4. **Rate limiting** — Upstash Redis (production) with in-memory fallback (development)
5. **Two-factor authentication** — TOTP required for `SUPER_ADMIN` and `TENANT_ADMIN`

## Roles & Permissions

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | Platform-wide administration |
| `TENANT_ADMIN` | Full tenant management |
| `TENANT_VIEWER` | Read-only tenant access |
| `PARTICIPANT` | Own programs, AI tools, badges |

Permission definitions live in `src/lib/auth/permissions.ts`. API routes use `withAuthorizedHandler()` from `src/lib/auth/authorize.ts`.

## Multi-Tenant Isolation

### Application layer

- `buildTenantContext()` derives tenant scope from the authenticated session
- `assertTenantScope()` blocks cross-tenant resource access
- Participant API responses exclude other users' PII

### Database layer (PostgreSQL RLS)

Session variables set per transaction via `withTenantContext()`:

- `app.current_tenant_id`
- `app.current_user_id`
- `app.current_role`
- `app.is_super_admin`

RLS policies are defined in `prisma/migrations/rls/001_enable_rls.sql`. Apply after running Prisma migrations:

```bash
psql $DATABASE_URL -f prisma/migrations/rls/001_enable_rls.sql
```

## Authentication

- NextAuth v5 with JWT sessions (8-hour max age)
- Account lockout after 5 failed attempts (15-minute lockout)
- Inactive tenants cannot authenticate (except super admin)
- Admin roles must complete 2FA setup before accessing protected routes

### Two-Factor Authentication Flow

1. Admin logs in with email/password → redirected to `/settings/security` if 2FA not configured
2. `POST /api/auth/2fa/setup` — generates encrypted TOTP secret + QR code
3. `POST /api/auth/2fa/enable` — verifies TOTP, enables 2FA, returns recovery codes
4. Subsequent logins require TOTP code or recovery code
5. `POST /api/auth/2fa/disable` — disables 2FA (requires active TOTP)

Secrets are encrypted at rest with AES-256-GCM using `TOTP_ENCRYPTION_KEY`.

## Rate Limiting

| Bucket | Limit | Window |
|--------|-------|--------|
| login | 10 | 60s |
| registration | 5 | 60s |
| ai | 20 | 60s |
| webhook | 100 | 60s |
| api | 120 | 60s |

Production requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## Environment Variables

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=                    # 32+ chars
TOTP_ENCRYPTION_KEY=            # 32+ chars (falls back to AUTH_SECRET)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ANTHROPIC_API_KEY=
```

## Deployment Checklist

- [ ] PostgreSQL with RLS policies applied
- [ ] Strong `AUTH_SECRET` and `TOTP_ENCRYPTION_KEY`
- [ ] Upstash Redis configured
- [ ] `.env` excluded from version control
- [ ] Run `npm run test` and `npm run build`
- [ ] Enable HTTPS and secure cookie settings in production
- [ ] Configure Stripe/webhook secrets before enabling billing

## Testing

```bash
npm run test           # RBAC matrix, tenant isolation, 2FA crypto
npm run test:coverage  # Coverage report
```
