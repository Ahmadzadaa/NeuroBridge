-- Indexes for the tenant analytics dashboard.
--
-- The dashboard aggregates progress, attempts, enrolments and login events
-- over a date window for one tenant. Without these, each panel falls back to a
-- sequential scan of the whole table — which is fine on a seeded development
-- database and not fine once a tenant has a year of activity.
--
-- CONCURRENTLY is deliberately not used: these tables are small enough that
-- the brief lock is cheaper than the operational cost of a non-transactional
-- migration, and the deploy already runs migrations as a separate task.

-- Progress is read by lesson set and bucketed by week.
CREATE INDEX IF NOT EXISTS "lesson_progress_completed_at_idx"
  ON "lesson_progress" ("completed_at");
CREATE INDEX IF NOT EXISTS "lesson_progress_lesson_id_completed_at_idx"
  ON "lesson_progress" ("lesson_id", "completed_at");

-- Average scores are rolled up per exam.
CREATE INDEX IF NOT EXISTS "exam_attempts_exam_id_completed_at_idx"
  ON "exam_attempts" ("exam_id", "completed_at");

-- Enrolment counts filter on programme + ACTIVE, and on registration date.
CREATE INDEX IF NOT EXISTS "participants_program_id_status_idx"
  ON "participants" ("program_id", "status");
CREATE INDEX IF NOT EXISTS "participants_registration_date_idx"
  ON "participants" ("registration_date");

-- Active-user counts scan one tenant's LOGIN_SUCCESS rows over a window.
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_action_created_at_idx"
  ON "audit_logs" ("tenant_id", "action", "created_at");
