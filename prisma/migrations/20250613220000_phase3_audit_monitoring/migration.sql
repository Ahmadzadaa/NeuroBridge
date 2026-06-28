-- Phase 3: Audit log IP + indexes

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip" TEXT;

CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
