-- Certificates v2 (issued documents with serials and public verify codes).
-- The schema change shipped without a migration; `db push` cannot add the new
-- required columns to a table that already has rows, so existing certificates
-- are backfilled here first. pdf_url is left in place for the legacy files.

-- CreateTable
CREATE TABLE IF NOT EXISTS "certificate_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "certificate_sequences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_sequences_tenant_id_year_key" ON "certificate_sequences"("tenant_id", "year");

-- AlterTable: add as nullable, backfill, then tighten.
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "program_id" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "template_id" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "serial_number" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "verify_code" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "recipient_name" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'az';
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revoked_reason" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "pdf_path" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "pdf_hash" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "issued_by_user_id" TEXT;

UPDATE "certificates" c
SET "tenant_id"      = COALESCE(c."tenant_id", u."tenant_id"),
    "recipient_name" = COALESCE(c."recipient_name", TRIM(u."first_name" || ' ' || u."last_name")),
    "title"          = COALESCE(c."title", c."type"),
    "locale"         = COALESCE(u."language", c."locale"),
    "serial_number"  = COALESCE(c."serial_number", 'LEGACY-' || c."id"),
    "verify_code"    = COALESCE(c."verify_code", md5(random()::text || c."id"))
FROM "users" u
WHERE u."id" = c."user_id";

-- A certificate must belong to a tenant; platform-level users never received one.
DELETE FROM "certificates" WHERE "tenant_id" IS NULL;

ALTER TABLE "certificates" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "serial_number" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "verify_code" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "recipient_name" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "title" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_serial_number_key" ON "certificates"("serial_number");
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_verify_code_key" ON "certificates"("verify_code");
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_user_id_type_program_id_key" ON "certificates"("user_id", "type", "program_id");
CREATE INDEX IF NOT EXISTS "certificates_tenant_id_issued_at_idx" ON "certificates"("tenant_id", "issued_at");
CREATE INDEX IF NOT EXISTS "certificates_verify_code_idx" ON "certificates"("verify_code");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certificate_sequences" ADD CONSTRAINT "certificate_sequences_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
