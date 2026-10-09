-- Demo requests captured by the public marketing site.
--
-- Leads sit outside the tenant graph on purpose: the person filling in the
-- form has no organisation on the platform yet, so there is nothing to scope
-- the row to. Row-level security therefore does not apply here; access is
-- controlled by the fact that only sales tooling reads the table.

CREATE TABLE IF NOT EXISTS "leads" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "company"    TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "phone"      TEXT,
  "seatCount"  TEXT,
  "message"    TEXT,
  "locale"     TEXT NOT NULL DEFAULT 'az',
  "source"     TEXT,
  "status"     TEXT NOT NULL DEFAULT 'NEW',
  "ip"         TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sales reads the newest first, and filters by pipeline state.
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" ("created_at");
CREATE INDEX IF NOT EXISTS "leads_status_created_at_idx" ON "leads" ("status", "created_at");
-- Not unique: the same person may legitimately ask twice.
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" ("email");
