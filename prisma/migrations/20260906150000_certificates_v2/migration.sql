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

-- Types were lowercase before v2 (participation…); the code now uses
-- PARTICIPATION | ACHIEVEMENT | COMPLETION.
UPDATE "certificates" SET "type" = UPPER("type") WHERE "type" <> UPPER("type");

UPDATE "certificates" c
SET "tenant_id"      = COALESCE(c."tenant_id", u."tenant_id"),
    "recipient_name" = COALESCE(c."recipient_name", TRIM(u."first_name" || ' ' || u."last_name")),
    "locale"         = COALESCE(u."language", c."locale"),
    "verify_code"    = COALESCE(c."verify_code", md5(random()::text || c."id"))
FROM "users" u
WHERE u."id" = c."user_id";

-- A certificate must belong to a tenant; platform-level users never received one.
DELETE FROM "certificates" WHERE "tenant_id" IS NULL;

-- Legacy rows name no programme: attach the holder's latest one in the tenant.
UPDATE "certificates" c
SET "program_id" = (
  SELECT pa."program_id" FROM "participants" pa
  JOIN "programs" p ON p."id" = pa."program_id"
  WHERE pa."user_id" = c."user_id" AND p."tenant_id" = c."tenant_id"
  ORDER BY pa."registration_date" DESC LIMIT 1
)
WHERE c."program_id" IS NULL AND c."title" IS NULL
  -- Only when unambiguous: two of a kind would collide on (user, type, program).
  AND NOT EXISTS (
    SELECT 1 FROM "certificates" c2
    WHERE c2."user_id" = c."user_id" AND c2."type" = c."type" AND c2."id" <> c."id"
  );

-- Title is the programme name; without one, the certificate kind in its language.
UPDATE "certificates" c
SET "title" = COALESCE(
  (SELECT p."name" FROM "programs" p WHERE p."id" = c."program_id"),
  CASE c."type"
    WHEN 'PARTICIPATION' THEN CASE c."locale" WHEN 'tr' THEN 'Katılım Sertifikası' WHEN 'en' THEN 'Certificate of Participation' ELSE 'İştirak Sertifikatı' END
    WHEN 'ACHIEVEMENT' THEN CASE c."locale" WHEN 'tr' THEN 'Başarı Sertifikası' WHEN 'en' THEN 'Certificate of Achievement' ELSE 'Uğur Sertifikatı' END
    ELSE CASE c."locale" WHEN 'tr' THEN 'Program Tamamlama Sertifikası' WHEN 'en' THEN 'Certificate of Completion' ELSE 'Proqram Tamamlama Sertifikatı' END
  END)
WHERE c."title" IS NULL;

-- Serials in the issuing format (BIZ-<year>-<tenant code>-<000001>), numbered
-- per tenant and year in issue order; tenant code as in lib/certificates/serial.ts.
WITH numbered AS (
  SELECT c."id",
         EXTRACT(YEAR FROM c."issued_at")::int AS yr,
         RPAD(COALESCE(NULLIF(LEFT(REGEXP_REPLACE(TRANSLATE(UPPER(t."name"), 'ÇĞİÖŞÜƏ', 'CGIOSUE'), '[^A-Z]', '', 'g'), 3), ''), 'ORG'), 3, 'X') AS code,
         ROW_NUMBER() OVER (PARTITION BY c."tenant_id", EXTRACT(YEAR FROM c."issued_at") ORDER BY c."issued_at", c."id") AS n
  FROM "certificates" c
  JOIN "tenants" t ON t."id" = c."tenant_id"
  WHERE c."serial_number" IS NULL
)
UPDATE "certificates" c
SET "serial_number" = 'BIZ-' || numbered.yr || '-' || numbered.code || '-' || LPAD(numbered.n::text, 6, '0')
FROM numbered
WHERE numbered."id" = c."id";

ALTER TABLE "certificates" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "serial_number" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "verify_code" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "recipient_name" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "title" SET NOT NULL;

-- The issuing sequence continues after the backfilled numbers.
INSERT INTO "certificate_sequences" ("id", "tenant_id", "year", "last_value")
SELECT md5(random()::text || c."tenant_id" || y.yr), c."tenant_id", y.yr, COUNT(*)
FROM "certificates" c
CROSS JOIN LATERAL (SELECT EXTRACT(YEAR FROM c."issued_at")::int AS yr) y
GROUP BY c."tenant_id", y.yr
ON CONFLICT ("tenant_id", "year") DO UPDATE SET "last_value" = GREATEST("certificate_sequences"."last_value", EXCLUDED."last_value");

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
