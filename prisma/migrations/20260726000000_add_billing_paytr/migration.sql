-- Billing: PayTR seat-based subscriptions
--
-- Money columns are INTEGER kuruş (1 TRY = 100 kuruş) — never floating point.
-- Status columns are TEXT rather than native enums, matching the rest of this
-- schema (the SQLite connector used in local dev does not support enums).

-- CreateTable
CREATE TABLE IF NOT EXISTS "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_per_seat_monthly" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "min_seats" INTEGER NOT NULL DEFAULT 1,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "seats" INTEGER NOT NULL,
    "pending_seats" INTEGER,
    "price_per_seat_monthly" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "past_due_since" TIMESTAMP(3),
    "dunning_attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYTR',
    "utoken" TEXT NOT NULL,
    "ctoken" TEXT,
    "card_mask" TEXT,
    "card_brand" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "merchant_oid" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT 'PAYTR',
    "seat_count" INTEGER,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_transactions" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYTR',
    "merchant_oid" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "raw_response" TEXT,
    "failed_reason_code" TEXT,
    "failed_reason_msg" TEXT,
    "attempt_no" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seat_change_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "old_seats" INTEGER NOT NULL,
    "new_seats" INTEGER NOT NULL,
    "changed_by" TEXT,
    "invoice_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_change_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "webhook_events" ADD COLUMN IF NOT EXISTS "signature_valid" BOOLEAN;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plans_is_active_idx" ON "plans"("is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");
CREATE INDEX IF NOT EXISTS "subscriptions_next_retry_at_idx" ON "subscriptions"("next_retry_at");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_provider_utoken_ctoken_key" ON "payment_methods"("provider", "utoken", "ctoken");
CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_merchant_oid_key" ON "invoices"("merchant_oid");
CREATE INDEX IF NOT EXISTS "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_created_at_idx" ON "invoices"("created_at");

CREATE INDEX IF NOT EXISTS "payment_transactions_invoice_id_idx" ON "payment_transactions"("invoice_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_merchant_oid_idx" ON "payment_transactions"("merchant_oid");

CREATE INDEX IF NOT EXISTS "seat_change_logs_tenant_id_idx" ON "seat_change_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "seat_change_logs_created_at_idx" ON "seat_change_logs"("created_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seat_change_logs" ADD CONSTRAINT "seat_change_logs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seat_change_logs" ADD CONSTRAINT "seat_change_logs_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seat_change_logs" ADD CONSTRAINT "seat_change_logs_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
