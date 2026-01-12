-- Add new fields to event_settings for event editor improvements

-- Allow login when registration is closed
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "allow_login_when_closed" BOOLEAN NOT NULL DEFAULT true;

-- Show/hide capacity on landing page
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "show_capacity" BOOLEAN NOT NULL DEFAULT true;

-- Day pass as ticket type for individual registration
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "allow_individual_day_pass" BOOLEAN NOT NULL DEFAULT false;

-- Landing page content fields
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "faq_content" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "schedule_content" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "included_content" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "bring_content" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "contact_info" TEXT;

-- Confirmation email content options
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "show_faq_in_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "show_bring_in_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "show_schedule_in_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "show_included_in_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "show_contact_in_email" BOOLEAN NOT NULL DEFAULT true;

-- Add-on 1
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_1_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_1_title" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_1_description" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_1_price" DECIMAL(10, 2);

-- Add-on 2
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_2_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_2_title" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_2_description" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_2_price" DECIMAL(10, 2);

-- Add-on 3
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_3_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_3_title" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_3_description" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_3_price" DECIMAL(10, 2);

-- Add-on 4
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_4_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_4_title" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_4_description" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "add_on_4_price" DECIMAL(10, 2);

-- Individual registration pricing tiers in event_pricing
ALTER TABLE "event_pricing" ADD COLUMN IF NOT EXISTS "individual_early_bird_price" DECIMAL(10, 2);
ALTER TABLE "event_pricing" ADD COLUMN IF NOT EXISTS "individual_late_price" DECIMAL(10, 2);
