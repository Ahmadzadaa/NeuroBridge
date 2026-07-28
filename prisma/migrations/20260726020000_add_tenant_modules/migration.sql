-- Per-tenant module entitlements.
--
-- Every flag defaults to true so organisations that existed before this
-- migration keep exactly the access they already had; the platform owner
-- narrows them deliberately, never by accident.

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tenant_type" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "teachers_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "hackathon_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "simulations_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trainings_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ai_tools_enabled" BOOLEAN NOT NULL DEFAULT true;
