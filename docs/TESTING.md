# BizSim Testing Guide

## Test Pyramid

| Layer | Tool | Location | Command |
|-------|------|----------|---------|
| Unit | Vitest | `src/lib/**/__tests__/*.test.ts` | `npm test` |
| Integration | Vitest + PostgreSQL | `src/lib/**/*.integration.test.ts` | `npm run test:integration` |
| E2E | Playwright | `e2e/*.spec.ts` | `npm run test:e2e` |
| Coverage | Vitest v8 | — | `npm run test:coverage` |

## Prerequisites

### Unit tests
No database required. Redis uses in-memory fallback in test mode.

### Integration tests
Set `TEST_DATABASE_URL` to a PostgreSQL database (separate from production):

```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/bizsim_test npm run test:integration
```

### E2E tests
Requires PostgreSQL (`DATABASE_URL` or `TEST_DATABASE_URL`) and Playwright browsers:

```bash
npx playwright install chromium
npm run test:e2e
```

Global setup seeds E2E fixtures (`e2e-tenant`, `e2e-program-token`, test users).

## Coverage Target

Minimum **80%** line coverage on core `src/lib/**` business logic (enforced in `vitest.config.ts`). Current baseline:

| Metric | Target | Measured |
|--------|--------|----------|
| Lines | 80% | ~90% |
| Statements | 80% | ~88% |
| Functions | 80% | ~87% |

```bash
npm run test:coverage
```

## Critical Flow Coverage

| Flow | Unit | Integration | E2E |
|------|------|-------------|-----|
| Tenant seat purchase | payment-service | checkout-flow | tenant-purchase.spec.ts |
| Program creation | schemas | program-creation | program-creation.spec.ts |
| Participant registration | schemas | registration-flow | participant-registration.spec.ts |
| Seat exhaustion | seat-service | registration-flow | seat-exhaustion.spec.ts |
| Payment success | webhook-processor | checkout-flow | payment-success.spec.ts |
| Payment failure | webhook-processor | webhook-processor | payment-failure.spec.ts |
| Certificate generation | certificate-service | certificate-service | certificate-generation.spec.ts |
| Multi-language | — | — | multi-language.spec.ts |

## E2E Test Users

| Email | Password | Role |
|-------|----------|------|
| `e2e-participant@bizsim.com` | `Admin123!` | PARTICIPANT |
| `e2e-tenant@bizsim.com` | `Admin123!` | TENANT_ADMIN |

Seeded by `e2e/global-setup.ts` on each E2E run.

## CI Recommendations

```yaml
- run: npm test
- run: npm run test:coverage
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```
