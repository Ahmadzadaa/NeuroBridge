-- Lesson videos: uploaded files, in-video questions and watch tracking.
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "video_key" TEXT;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "video_duration_sec" INTEGER;

CREATE TABLE IF NOT EXISTS "lesson_video_questions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "at_second" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_video_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lesson_video_questions_lesson_id_at_second_idx" ON "lesson_video_questions"("lesson_id", "at_second");
ALTER TABLE "lesson_video_questions" ADD CONSTRAINT "lesson_video_questions_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lesson_video_watches" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "max_watched_sec" INTEGER NOT NULL DEFAULT 0,
    "last_beat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "lesson_video_watches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_video_watches_lesson_id_user_id_key" ON "lesson_video_watches"("lesson_id", "user_id");
CREATE INDEX IF NOT EXISTS "lesson_video_watches_user_id_idx" ON "lesson_video_watches"("user_id");
ALTER TABLE "lesson_video_watches" ADD CONSTRAINT "lesson_video_watches_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_video_watches" ADD CONSTRAINT "lesson_video_watches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lesson_video_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "choice" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_video_answers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lesson_video_answers_question_id_user_id_idx" ON "lesson_video_answers"("question_id", "user_id");
CREATE INDEX IF NOT EXISTS "lesson_video_answers_user_id_idx" ON "lesson_video_answers"("user_id");
ALTER TABLE "lesson_video_answers" ADD CONSTRAINT "lesson_video_answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "lesson_video_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_video_answers" ADD CONSTRAINT "lesson_video_answers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
