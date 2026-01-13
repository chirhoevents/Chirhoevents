-- Add option capacity tracking fields to event_settings

-- Housing type capacity (applies to both group and individual registrations)
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "on_campus_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "on_campus_remaining" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "off_campus_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "off_campus_remaining" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "day_pass_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "day_pass_remaining" INTEGER;

-- Room type capacity (individual registration only)
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "single_room_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "single_room_remaining" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "double_room_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "double_room_remaining" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "triple_room_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "triple_room_remaining" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "quad_room_capacity" INTEGER;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "quad_room_remaining" INTEGER;

-- Add option preferences to waitlist_entries
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "registration_type" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "preferred_housing_type" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "preferred_room_type" TEXT;

-- Add index for filtering waitlist by preferred housing type
CREATE INDEX IF NOT EXISTS "idx_waitlist_housing_type" ON "waitlist_entries" ("preferred_housing_type");
