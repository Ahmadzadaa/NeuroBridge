-- Student flow, phase 1: reference lists, consents, program calendar.
--
-- universities / departments: rows with a NULL tenant_id are the shared list
-- (imported by scripts/import-universities.ts); tenants may add their own.
-- user_consents is append-only: the latest row per (user, type) is current.

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "university_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department_id" TEXT;

ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "program_start" TIMESTAMP(3);
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "program_end" TIMESTAMP(3);
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "finalist_count" INTEGER;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "jury_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'TR',
    "tenant_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field" TEXT,
    "tenant_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "program_schedule_items" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "starts_on" TIMESTAMP(3) NOT NULL,
    "ends_on" TIMESTAMP(3) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "program_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "universities_tenant_id_idx" ON "universities"("tenant_id");
CREATE INDEX IF NOT EXISTS "universities_country_name_idx" ON "universities"("country", "name");
CREATE INDEX IF NOT EXISTS "departments_tenant_id_idx" ON "departments"("tenant_id");
CREATE INDEX IF NOT EXISTS "departments_field_name_idx" ON "departments"("field", "name");
CREATE INDEX IF NOT EXISTS "user_consents_user_id_type_created_at_idx" ON "user_consents"("user_id", "type", "created_at");
CREATE INDEX IF NOT EXISTS "program_schedule_items_program_id_sort_order_idx" ON "program_schedule_items"("program_id", "sort_order");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_university_id_fkey"
    FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "universities" ADD CONSTRAINT "universities_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "program_schedule_items" ADD CONSTRAINT "program_schedule_items_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
