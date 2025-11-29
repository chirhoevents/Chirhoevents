-- Add missing fields to individual_registrations table
-- This migration adds housing_type, t_shirt_size, and emergency contact fields

-- Add housing_type column (on_campus, off_campus, day_pass)
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS housing_type VARCHAR(50);

-- Add t_shirt_size column
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS t_shirt_size VARCHAR(10);

-- Add emergency contact 1 columns (rename existing if they exist)
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_1_name VARCHAR(255);

ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_1_phone VARCHAR(20);

ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_1_relation VARCHAR(100);

-- Add emergency contact 2 columns
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_2_name VARCHAR(255);

ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_2_phone VARCHAR(20);

ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_2_relation VARCHAR(100);
