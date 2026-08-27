-- Track which option pool a waitlist reservation drew from, so we can
-- release/consume it correctly regardless of whether the preferred_*
-- fields on the entry change later.

ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_housing_type" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_room_type" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_day_pass_option_id" UUID;
