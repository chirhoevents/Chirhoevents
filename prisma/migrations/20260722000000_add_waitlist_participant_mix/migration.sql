-- Group waitlist entries need the same participant breakdown as group
-- registrations (youth / chaperone / priest) so an admin looking at the
-- queue can plan capacity by role, not just by headcount. Individual
-- entries leave these NULL; partySize stays as the total on both types.

ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "youth_count" INTEGER;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "chaperone_count" INTEGER;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "priest_count" INTEGER;
