-- Migration: Add housing type pricing columns to event_pricing table
-- Run this SQL directly in your database console (Neon, Supabase, etc.)

-- Add housing type pricing columns
ALTER TABLE event_pricing
ADD COLUMN IF NOT EXISTS on_campus_youth_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS off_campus_youth_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS day_pass_youth_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS on_campus_chaperone_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS off_campus_chaperone_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS day_pass_chaperone_price DECIMAL(10,2);

-- Add housing type toggles to event_settings table
ALTER TABLE event_settings
ADD COLUMN IF NOT EXISTS allow_on_campus BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_off_campus BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_day_pass BOOLEAN DEFAULT true;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'event_pricing'
AND column_name LIKE '%campus%' OR column_name LIKE '%pass%'
ORDER BY ordinal_position;

-- Sample: Update existing event with housing prices (optional)
-- UPDATE event_pricing
-- SET
--   on_campus_youth_price = 100.00,
--   off_campus_youth_price = 75.00,
--   day_pass_youth_price = 50.00,
--   on_campus_chaperone_price = 75.00,
--   off_campus_chaperone_price = 60.00,
--   day_pass_chaperone_price = 40.00
-- WHERE event_id = 'your-event-id-here';
