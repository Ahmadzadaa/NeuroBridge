ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "issuer_name" TEXT;
