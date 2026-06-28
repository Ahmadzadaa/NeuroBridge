# Seat Licensing & Payments

## Business Model

BizSim licenses seats per tenant. Each participant registration consumes one seat atomically. Seat capacity increases only through verified payment webhooks.

Flow:

1. Tenant admin purchases a seat package (50 / 100 / 250)
2. Payment provider redirects to checkout
3. Webhook confirms payment → `tenant.seatLimit += seatCount`
4. Participant registers via `/[locale]/apply/[token]` → `tenant.seatsUsed += 1`
5. When `seatsUsed >= seatLimit`, registration returns `409 SEAT_LIMIT_REACHED`

## Seat Upgrade Example

Starting state: `seatLimit = 50`, `seatsUsed = 10`

Purchase 50 additional seats → webhook `payment.completed` → `seatLimit = 100`

All seat limit changes happen in `src/lib/payment/webhook-processor.ts` inside database transactions with tenant row locking.

## Registration Concurrency

`registerParticipant()` in `src/lib/seats/registration-service.ts`:

- Locks program row (`FOR UPDATE`)
- Locks tenant row via `consumeSeat()` (`FOR UPDATE`)
- Creates user + participant in the same transaction
- Rejects when seat or program capacity is exhausted

Integration test: 500 concurrent registrations against a 50-seat tenant (requires PostgreSQL).

```bash
TEST_DATABASE_URL=postgresql://bizsim:bizsim@localhost:5432/bizsim_test npm run test:integration
```

## Payment Providers

| Provider | Checkout | Webhook |
|----------|----------|---------|
| Stripe | `STRIPE_SECRET_KEY` | `POST /api/webhooks/stripe` |
| Payriff | `PAYRIFF_*` | `POST /api/webhooks/payriff` |
| Iyzico | `IYZICO_*` | `POST /api/webhooks/iyzico` |

Adapter interface: `src/lib/payment/types.ts`  
Registry: `src/lib/payment/provider-registry.ts`

## Webhook Guarantees

- **Idempotency** — `webhook_events` unique on `(provider, external_event_id)`
- **Retry handling** — failed processing stores `FAILED` status; provider retries until success
- **Failed payments** — `payment.status = FAILED`, seat limits unchanged, `retryCount` incremented
- **Refunds** — `payment.status = REFUNDED`, seat limit reduced (never below `seatsUsed`)

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/registration` | Public | Participant signup + seat consume |
| GET | `/api/apply/[token]` | Public | Program availability check |
| POST | `/api/billing/checkout` | TENANT_ADMIN | Start seat purchase |
| POST | `/api/webhooks/stripe` | Signature | Stripe events |
| POST | `/api/webhooks/payriff` | Signature | Payriff events |
| POST | `/api/webhooks/iyzico` | Signature | Iyzico events |

## Environment Variables

See `.env.example` for `STRIPE_*`, `PAYRIFF_*`, `IYZICO_*`, and `TEST_DATABASE_URL`.

## Migrations

```bash
npm run db:migrate
```

Applies `prisma/migrations/20250613210000_phase2_payments`.
