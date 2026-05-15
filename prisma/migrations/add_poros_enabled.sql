-- Add master Poros enable toggle to event_settings
-- Run this SQL file in your NEON database console

ALTER TABLE event_settings
ADD COLUMN IF NOT EXISTS poros_enabled BOOLEAN DEFAULT false;

-- Back-fill: any event that already has housing, seating, or public portal enabled
-- should have porosEnabled = true so existing events keep working
UPDATE event_settings
SET poros_enabled = true
WHERE poros_housing_enabled = true
   OR poros_public_portal_enabled = true
   OR poros_seating_enabled = true
   OR poros_small_group_enabled = true
   OR poros_meal_colors_enabled = true;
