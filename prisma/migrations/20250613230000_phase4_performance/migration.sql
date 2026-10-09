-- Phase 4: Composite indexes for list queries at scale

CREATE INDEX IF NOT EXISTS "programs_tenant_id_created_at_idx"
  ON "programs"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "participants_program_id_registration_date_idx"
  ON "participants"("program_id", "registration_date" DESC);

CREATE INDEX IF NOT EXISTS "payments_tenant_id_created_at_idx"
  ON "payments"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_created_at_idx"
  ON "audit_logs"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx"
  ON "audit_logs"("action", "created_at" DESC);
