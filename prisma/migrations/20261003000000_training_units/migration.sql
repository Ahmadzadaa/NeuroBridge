-- Training units (phase 3): an existing Lesson becomes a unit (video +
-- project brief + points), its test is an existing Exam linked by lesson_id,
-- and project answers get their own table. Ordinary lessons keep NULL/0.

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "activity" TEXT;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "project_brief" TEXT;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "lesson_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "lesson_project_submissions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_project_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "exams_lesson_id_idx" ON "exams"("lesson_id");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_project_submissions_lesson_id_user_id_key" ON "lesson_project_submissions"("lesson_id", "user_id");
CREATE INDEX IF NOT EXISTS "lesson_project_submissions_user_id_idx" ON "lesson_project_submissions"("user_id");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lesson_project_submissions" ADD CONSTRAINT "lesson_project_submissions_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_project_submissions" ADD CONSTRAINT "lesson_project_submissions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
