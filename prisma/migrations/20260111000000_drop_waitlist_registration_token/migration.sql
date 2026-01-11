-- Drop the constraint first, then the column
-- This handles the case where the database has a registration_token column
-- that is no longer in the Prisma schema

-- Drop constraint if exists (the constraint depends on the index)
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";

-- Drop the column if it exists
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "registration_token";
