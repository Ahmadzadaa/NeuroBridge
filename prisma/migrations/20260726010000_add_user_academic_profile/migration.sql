-- Academic profile fields and avatar for participants.
--
-- All nullable: accounts that existed before this migration have no academic
-- details, and requiring them retroactively would lock those users out.

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "university" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "faculty" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_year" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_path" TEXT;
