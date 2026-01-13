-- Add housing-specific participant counts (inventory style)
-- These fields track youth and chaperone counts per housing type

ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "on_campus_youth" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "on_campus_chaperones" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "off_campus_youth" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "off_campus_chaperones" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "day_pass_youth" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "day_pass_chaperones" INTEGER;
