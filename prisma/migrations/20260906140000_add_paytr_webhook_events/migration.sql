-- Raw log of every PayTR notification.
--
-- `webhook_events` holds one row per merchant_oid because that is what makes
-- the callback idempotent. That design cannot answer the questions a disputed
-- payment actually raises: how many times did PayTR call, did an earlier call
-- carry a different status, was a call rejected for a bad hash and never seen
-- again. This table answers them — one row per HTTP request, including
-- duplicates and rejections.
--
-- `raw_payload` is stored with secrets masked (src/lib/payment/paytr/paytr-log.ts).
-- The callback `hash` in particular is never persisted: it is valid signing
-- material for its own notification, so a stored copy is replayable. Whether it
-- verified is kept as `hash_valid` instead.

CREATE TABLE IF NOT EXISTS "paytr_webhook_events" (
  "id"                 TEXT PRIMARY KEY,
  "merchant_oid"       TEXT NOT NULL,
  "status"             TEXT,
  "hash_valid"         BOOLEAN NOT NULL,
  "mode"               TEXT NOT NULL,
  "total_amount"       TEXT,
  "payment_type"       TEXT,
  "failed_reason_code" TEXT,
  "failed_reason_msg"  TEXT,
  "outcome"            TEXT NOT NULL,
  "error_message"      TEXT,
  "remote_ip"          TEXT,
  "raw_payload"        TEXT NOT NULL,
  "received_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at"       TIMESTAMP(3)
);

-- Deliberately not unique: duplicates are the point of the table.
CREATE INDEX IF NOT EXISTS "paytr_webhook_events_merchant_oid_idx"
  ON "paytr_webhook_events" ("merchant_oid");
-- Support tooling reads the newest first.
CREATE INDEX IF NOT EXISTS "paytr_webhook_events_received_at_idx"
  ON "paytr_webhook_events" ("received_at");
-- "show me everything rejected today" must not scan the table.
CREATE INDEX IF NOT EXISTS "paytr_webhook_events_outcome_idx"
  ON "paytr_webhook_events" ("outcome");
