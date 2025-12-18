-- Drop the unique constraint on clerk_user_id to allow multiple registrations per user
ALTER TABLE "group_registrations" DROP CONSTRAINT IF EXISTS "group_registrations_clerk_user_id_key";

-- Add an index on clerk_user_id for better query performance
CREATE INDEX IF NOT EXISTS "idx_group_clerk_user" ON "group_registrations"("clerk_user_id");
