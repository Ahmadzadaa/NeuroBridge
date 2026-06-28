# BizSim Performance Architecture

## Scale Targets

| Dimension | Target |
|-----------|--------|
| Enterprise customers | 100 |
| Participants | 50,000 |
| Concurrent users | 5,000 |

## Redis Caching

Shared Upstash client: `src/lib/redis/client.ts`  
Cache helpers: `src/lib/cache/cache-service.ts`

| Key | TTL | Invalidated on |
|-----|-----|----------------|
| `apply:token:{token}` | 60s | Registration |
| `tenant:{id}:programs:p{n}:s{m}` | 120s | Program create |
| `tenant:{id}:settings` | 300s | Settings PATCH |
| `metrics:business` | 120s | TTL expiry |

## Pagination

Standard params on all list endpoints:

```
?page=1&pageSize=25
```

Max page size: 100. Default: 25.

| Endpoint | Paginated |
|----------|-----------|
| `GET /api/programs` | Yes |
| `GET /api/programs/[id]/participants` | Yes |
| `GET /api/participants` | Yes |
| `GET /api/billing/payments` | Yes |
| `GET /api/audit` | Yes |

Programs list no longer embeds all participants — use the participants endpoint.

## Query Optimizations

- Report CSV export uses cursor-based batching (500 rows/batch)
- Business metrics use SQL `GROUP BY date_trunc` instead of loading all audit rows
- Registration hashes passwords **before** acquiring row locks
- Composite indexes: `prisma/migrations/20250613230000_phase4_performance`

## Background Jobs

Queue: `src/lib/queue/` (Upstash Redis list + hash)

| Job type | Trigger |
|----------|---------|
| `REPORT_EXPORT` | Export > 500 participants (async) |

Worker:

```bash
npm run worker          # continuous polling
npm run worker:once     # process one job
```

API:

- `POST /api/reports/export` → sync (<500 rows) or `202` with `jobId`
- `GET /api/jobs/[id]` → poll status
- `GET /api/jobs/[id]/download` → download CSV when complete

## Load Testing (k6)

Install [k6](https://k6.io/docs/get-started/installation/), then:

```bash
# Health endpoints — up to 500 VUs
k6 run scripts/load/health.js

# Public apply page (set token from a program)
k6 run -e APPLY_TOKEN=your-token scripts/load/apply.js

# Registration burst (requires token + available seats)
k6 run -e APPLY_TOKEN=your-token scripts/load/registration.js

# Authenticated programs list (set session cookie)
k6 run -e AUTH_COOKIE="next-auth.session-token=..." scripts/load/programs.js
```

## Benchmarks

Run unit performance tests:

```bash
npm run test:perf
npm run benchmark
```

## Deployment Checklist

- [ ] Upstash Redis configured (rate limit + cache + queue)
- [ ] Run Phase 4 migration for composite indexes
- [ ] Deploy queue worker as separate process (ECS sidecar or systemd)
- [ ] Run k6 health test against staging before release
- [ ] Monitor p95 latency via Sentry + CloudWatch
