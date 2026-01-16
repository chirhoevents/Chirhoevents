-- Drop the orphaned unique constraint and column from waitlist_entries
-- This constraint exists in the database but not in the schema

-- First drop the unique constraint (which depends on the index)
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";

-- Drop the index if it still exists
DROP INDEX IF EXISTS "waitlist_entries_registration_token_key";

-- Drop the column if it exists
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "registration_token";
