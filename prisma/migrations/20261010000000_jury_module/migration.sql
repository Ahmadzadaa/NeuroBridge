-- Jury module: juror profiles, jurors per programme, finalists and their scores.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "headline" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;

ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "finalists_confirmed_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "program_jurors" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "program_jurors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "program_jurors_program_id_user_id_key" ON "program_jurors"("program_id", "user_id");
CREATE INDEX IF NOT EXISTS "program_jurors_user_id_idx" ON "program_jurors"("user_id");
ALTER TABLE "program_jurors" ADD CONSTRAINT "program_jurors_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_jurors" ADD CONSTRAINT "program_jurors_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "program_finalists" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform_score" INTEGER NOT NULL,
    "platform_rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "program_finalists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "program_finalists_program_id_user_id_key" ON "program_finalists"("program_id", "user_id");
CREATE INDEX IF NOT EXISTS "program_finalists_user_id_idx" ON "program_finalists"("user_id");
ALTER TABLE "program_finalists" ADD CONSTRAINT "program_finalists_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_finalists" ADD CONSTRAINT "program_finalists_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "finalist_scores" (
    "id" TEXT NOT NULL,
    "finalist_id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "jury_user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "finalist_scores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "finalist_scores_finalist_id_criterion_id_jury_user_id_key"
    ON "finalist_scores"("finalist_id", "criterion_id", "jury_user_id");
CREATE INDEX IF NOT EXISTS "finalist_scores_jury_user_id_idx" ON "finalist_scores"("jury_user_id");
ALTER TABLE "finalist_scores" ADD CONSTRAINT "finalist_scores_finalist_id_fkey"
    FOREIGN KEY ("finalist_id") REFERENCES "program_finalists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finalist_scores" ADD CONSTRAINT "finalist_scores_criterion_id_fkey"
    FOREIGN KEY ("criterion_id") REFERENCES "jury_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finalist_scores" ADD CONSTRAINT "finalist_scores_jury_user_id_fkey"
    FOREIGN KEY ("jury_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "finalist_reviews" (
    "id" TEXT NOT NULL,
    "finalist_id" TEXT NOT NULL,
    "jury_user_id" TEXT NOT NULL,
    "comment" TEXT,
    "submitted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "finalist_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "finalist_reviews_finalist_id_jury_user_id_key"
    ON "finalist_reviews"("finalist_id", "jury_user_id");
CREATE INDEX IF NOT EXISTS "finalist_reviews_jury_user_id_idx" ON "finalist_reviews"("jury_user_id");
ALTER TABLE "finalist_reviews" ADD CONSTRAINT "finalist_reviews_finalist_id_fkey"
    FOREIGN KEY ("finalist_id") REFERENCES "program_finalists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finalist_reviews" ADD CONSTRAINT "finalist_reviews_jury_user_id_fkey"
    FOREIGN KEY ("jury_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
