-- Phase 2: Payment hardening + webhook idempotency

-- CreateTable
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "payload" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_type" TEXT NOT NULL DEFAULT 'UPGRADE';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "payments" SET "idempotency_key" = "id" WHERE "idempotency_key" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_provider_ref_key" ON "payments"("provider", "provider_ref");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_external_event_id_key" ON "webhook_events"("provider", "external_event_id");
CREATE INDEX IF NOT EXISTS "webhook_events_provider_idx" ON "webhook_events"("provider");
