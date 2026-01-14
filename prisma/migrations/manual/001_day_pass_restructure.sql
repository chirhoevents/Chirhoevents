-- Day Pass Restructure Migration
-- Run this SQL in your Neon database console

-- 1. Create the TicketType enum
DO $$ BEGIN
    CREATE TYPE "TicketType" AS ENUM ('general_admission', 'day_pass');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the day_pass_options table
CREATE TABLE IF NOT EXISTS "day_pass_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "youth_price" DECIMAL(10, 2),
    "chaperone_price" DECIMAL(10, 2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "day_pass_options_pkey" PRIMARY KEY ("id")
);

-- 3. Add indexes to day_pass_options
CREATE INDEX IF NOT EXISTS "idx_day_pass_event" ON "day_pass_options"("event_id");
CREATE INDEX IF NOT EXISTS "idx_day_pass_org" ON "day_pass_options"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_day_pass_date" ON "day_pass_options"("date");

-- 4. Add foreign keys to day_pass_options
DO $$ BEGIN
    ALTER TABLE "day_pass_options"
    ADD CONSTRAINT "day_pass_options_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "day_pass_options"
    ADD CONSTRAINT "day_pass_options_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Add ticket_type and day_pass_option_id to group_registrations
ALTER TABLE "group_registrations"
ADD COLUMN IF NOT EXISTS "ticket_type" "TicketType" NOT NULL DEFAULT 'general_admission';

ALTER TABLE "group_registrations"
ADD COLUMN IF NOT EXISTS "day_pass_option_id" UUID;

-- Make housing_type nullable for group_registrations (day_pass tickets don't need housing)
ALTER TABLE "group_registrations"
ALTER COLUMN "housing_type" DROP NOT NULL;

-- Add index and foreign key for group_registrations.day_pass_option_id
CREATE INDEX IF NOT EXISTS "idx_group_day_pass" ON "group_registrations"("day_pass_option_id");

DO $$ BEGIN
    ALTER TABLE "group_registrations"
    ADD CONSTRAINT "group_registrations_day_pass_option_id_fkey"
    FOREIGN KEY ("day_pass_option_id") REFERENCES "day_pass_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Add ticket_type and day_pass_option_id to individual_registrations
ALTER TABLE "individual_registrations"
ADD COLUMN IF NOT EXISTS "ticket_type" "TicketType" NOT NULL DEFAULT 'general_admission';

ALTER TABLE "individual_registrations"
ADD COLUMN IF NOT EXISTS "day_pass_option_id" UUID;

-- Add index and foreign key for individual_registrations.day_pass_option_id
CREATE INDEX IF NOT EXISTS "idx_individual_day_pass" ON "individual_registrations"("day_pass_option_id");

DO $$ BEGIN
    ALTER TABLE "individual_registrations"
    ADD CONSTRAINT "individual_registrations_day_pass_option_id_fkey"
    FOREIGN KEY ("day_pass_option_id") REFERENCES "day_pass_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Add preferred_ticket_type and preferred_day_pass_option_id to waitlist_entries
ALTER TABLE "waitlist_entries"
ADD COLUMN IF NOT EXISTS "preferred_ticket_type" "TicketType";

ALTER TABLE "waitlist_entries"
ADD COLUMN IF NOT EXISTS "preferred_day_pass_option_id" UUID;

-- Add index and foreign key for waitlist_entries
CREATE INDEX IF NOT EXISTS "idx_waitlist_ticket_type" ON "waitlist_entries"("preferred_ticket_type");

DO $$ BEGIN
    ALTER TABLE "waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_preferred_day_pass_option_id_fkey"
    FOREIGN KEY ("preferred_day_pass_option_id") REFERENCES "day_pass_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Migrate existing day_pass registrations to use the new ticket_type field
-- For group registrations that had housing_type = 'day_pass', set ticket_type to 'day_pass'
UPDATE "group_registrations"
SET "ticket_type" = 'day_pass'
WHERE "housing_type" = 'day_pass';

-- For individual registrations that had housing_type = 'day_pass', set ticket_type to 'day_pass'
UPDATE "individual_registrations"
SET "ticket_type" = 'day_pass'
WHERE "housing_type" = 'day_pass';

-- Note: The housing_type field will still have 'day_pass' for backward compatibility
-- but the new ticket_type field is the source of truth going forward
