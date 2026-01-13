-- Add housing count fields to group_registrations for mixed housing support
-- These fields track how many participants from a group are in each housing type

ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "on_campus_count" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "off_campus_count" INTEGER;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "day_pass_count" INTEGER;
