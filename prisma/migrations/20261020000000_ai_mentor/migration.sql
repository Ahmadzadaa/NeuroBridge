-- AI Mentor: conversation memory, usage log and security events.
CREATE TABLE IF NOT EXISTS "ai_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "simulation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_messages_tenant_id_user_id_simulation_id_created_at_idx" ON "ai_messages"("tenant_id", "user_id", "simulation_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_messages_tenant_id_created_at_idx" ON "ai_messages"("tenant_id", "created_at");
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ai_conversation_summaries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "simulation_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "covered_until" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_conversation_summaries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_conversation_summaries_tenant_id_user_id_simulation_id_key" ON "ai_conversation_summaries"("tenant_id", "user_id", "simulation_id");

CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_hash" TEXT NOT NULL,
    "simulation_id" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prefilter" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_usage_logs_tenant_id_created_at_idx" ON "ai_usage_logs"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at");

CREATE TABLE IF NOT EXISTS "ai_security_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_hash" TEXT,
    "simulation_id" TEXT,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_security_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_security_events_tenant_id_created_at_idx" ON "ai_security_events"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_security_events_type_created_at_idx" ON "ai_security_events"("type", "created_at");
CREATE INDEX IF NOT EXISTS "ai_security_events_user_hash_type_created_at_idx" ON "ai_security_events"("user_hash", "type", "created_at");
