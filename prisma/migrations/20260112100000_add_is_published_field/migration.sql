-- AlterTable
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT false;
