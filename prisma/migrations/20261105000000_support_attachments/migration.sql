CREATE TABLE IF NOT EXISTS "support_attachments" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "support_attachments_message_id_idx" ON "support_attachments"("message_id");
