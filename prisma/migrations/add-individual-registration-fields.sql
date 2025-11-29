-- Add missing fields to individual_registrations table

-- Rename existing emergency contact columns to emergency_contact_1
ALTER TABLE individual_registrations
RENAME COLUMN emergency_contact_name TO emergency_contact_1_name;

ALTER TABLE individual_registrations
RENAME COLUMN emergency_contact_phone TO emergency_contact_1_phone;

ALTER TABLE individual_registrations
RENAME COLUMN emergency_contact_relation TO emergency_contact_1_relation;

-- Add housing_type column (on_campus, off_campus, day_pass)
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS housing_type VARCHAR(50);

-- Add t_shirt_size column
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS t_shirt_size VARCHAR(10);

-- Add emergency_contact_2 columns
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_2_name VARCHAR(255);

ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_2_phone VARCHAR(20);

ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS emergency_contact_2_relation VARCHAR(100);
