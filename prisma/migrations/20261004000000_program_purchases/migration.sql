-- Programmes are bought, not self-created: a paid order creates a programme in
-- PENDING_SETUP that the platform team completes. Existing programmes are live.
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "setup_status" TEXT NOT NULL DEFAULT 'READY';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "order_id" TEXT;
CREATE INDEX IF NOT EXISTS "programs_setup_status_idx" ON "programs"("setup_status");
CREATE INDEX IF NOT EXISTS "programs_order_id_idx" ON "programs"("order_id");
ALTER TABLE "programs" ADD CONSTRAINT "programs_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'NEW_TENANT';

-- The AI Mentor is the only AI tool left; drop the retired ones from programmes.
DELETE FROM "program_ai_tools" WHERE "ai_tool" <> 'ai_mentor';
