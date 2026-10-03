ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMP(3);
ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
