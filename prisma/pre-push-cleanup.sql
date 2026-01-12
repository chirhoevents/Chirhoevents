-- Clean up orphaned constraints before prisma db push
-- This handles constraints that exist in the database but not in the schema

ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "registration_token";
