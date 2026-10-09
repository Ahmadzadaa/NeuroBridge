-- Student flow, phase 2: certificate name, baseline assessments, university
-- notifications. Localized text columns hold JSON {"tr","en","az"} as TEXT so
-- the same schema works on the SQLite dev database.

-- AlterTable
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "certificate_name" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "assessments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scale_min" INTEGER NOT NULL DEFAULT 1,
    "scale_max" INTEGER NOT NULL DEFAULT 5,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "assessment_dimensions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "low_text" TEXT NOT NULL,
    "mid_text" TEXT NOT NULL,
    "high_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "assessment_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "dimension_code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reverse" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "assessment_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "assessment_version" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "assessments_code_key" ON "assessments"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_dimensions_assessment_id_code_key" ON "assessment_dimensions"("assessment_id", "code");
CREATE INDEX IF NOT EXISTS "assessment_questions_assessment_id_sort_order_idx" ON "assessment_questions"("assessment_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_results_user_id_program_id_assessment_id_key" ON "assessment_results"("user_id", "program_id", "assessment_id");
CREATE INDEX IF NOT EXISTS "assessment_results_program_id_idx" ON "assessment_results"("program_id");
CREATE INDEX IF NOT EXISTS "tenant_notifications_tenant_id_read_at_created_at_idx" ON "tenant_notifications"("tenant_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "assessment_dimensions" ADD CONSTRAINT "assessment_dimensions_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_notifications" ADD CONSTRAINT "tenant_notifications_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
