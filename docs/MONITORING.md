# BizSim Monitoring & Observability

## Overview

Phase 3 monitoring stack:

| Component | Purpose |
|-----------|---------|
| **Sentry** | Error tracking and performance traces |
| **CloudWatch** | Business metric emission (AWS) |
| **Health endpoints** | Load balancer / orchestrator probes |
| **Metrics API** | Super-admin business dashboards |

## Health Endpoints

| Endpoint | Purpose | Success |
|----------|---------|---------|
| `GET /api/health` | Liveness — process is running | Always 200 |
| `GET /api/health/ready` | Readiness — DB connectivity | 200 if DB ok, 503 otherwise |

Example:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
```

Configure your load balancer to use `/api/health/ready` for target group health checks.

## Sentry

Set in `.env`:

```env
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=bizsim
SENTRY_ENVIRONMENT=production
```

Configuration files:

- `sentry.server.config.ts` — server-side errors
- `sentry.edge.config.ts` — edge runtime
- `src/instrumentation-client.ts` — browser errors
- `src/instrumentation.ts` — Next.js instrumentation hook

Errors are captured via `captureException()` in `src/lib/monitoring/metrics-service.ts`.

## CloudWatch Business Metrics

When deployed on AWS with IAM credentials:

```env
AWS_REGION=eu-central-1
CLOUDWATCH_NAMESPACE=BizSim/Production
```

Metrics emitted:

| Metric | Trigger |
|--------|---------|
| `RegistrationRate` | Participant/user registration audit events |
| `PaymentFailures` | Failed payment audit events |
| `AiUsage` | AI chat audit events |
| `SeatUtilization` | Metrics API refresh (platform average %) |

## Business Metrics Dashboard

Super admins access `/super-admin/system` which loads:

```
GET /api/metrics/business
```

Returns:

- Registration rate (24h, 7d, daily chart)
- Payment failures (24h, 7d, total)
- AI usage (24h, 7d, daily chart)
- Seat utilization (platform average + per-tenant breakdown)

## Audit Log Integration

Audit events feed business metrics. See `docs/PAYMENTS.md` and audit viewer at `/super-admin/audit`.

## Deployment Checklist

- [ ] Configure Sentry DSN for staging and production
- [ ] Set `CLOUDWATCH_NAMESPACE` and IAM role on ECS/Lambda
- [ ] Point ALB health check to `/api/health/ready`
- [ ] Create CloudWatch dashboard from emitted metrics
- [ ] Set Sentry alert rules for error rate spikes
