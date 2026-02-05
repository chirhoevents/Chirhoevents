#!/bin/bash
set -e

# Build v2.3 - Run table creation AFTER Prisma push
echo "=== Build Script Starting ==="

echo "Running pre-migration cleanup..."

# Create a temp SQL file for the pre-prisma cleanup
cat > /tmp/pre-cleanup.sql << 'SQLEOF'
-- Drop orphaned waitlist constraint if it exists
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";
DROP INDEX IF EXISTS "waitlist_entries_registration_token_key";
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "registration_token";

-- Add salve_packet_settings column to event_settings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_settings' AND column_name = 'salve_packet_settings'
    ) THEN
        ALTER TABLE "event_settings" ADD COLUMN "salve_packet_settings" JSONB;
    END IF;
END $$;

-- Drop the old poros_confession_times table if it exists (we use poros_confessions now)
DROP TABLE IF EXISTS "poros_confession_times" CASCADE;
SQLEOF

# Run pre-cleanup SQL
echo "Executing pre-cleanup SQL..."
npx prisma db execute --file /tmp/pre-cleanup.sql --schema prisma/schema.prisma || echo "Pre-cleanup SQL completed (some statements may have been skipped)"

echo "Running prisma db push..."
# IMPORTANT: Do NOT use --accept-data-loss as it will drop tables not in the Prisma schema
# (like poros_confessions, poros_adoration, poros_info_items) and delete all their data
npx prisma db push --skip-generate

# Create confession/adoration/info tables AFTER Prisma push
# These tables are managed outside of Prisma to prevent data loss during deployments
echo "Creating confession/adoration/info tables..."

cat > /tmp/create-tables.sql << 'SQLEOF'
-- Create confession/adoration/info tables if they don't exist
-- These tables are managed outside of Prisma to prevent data loss during deployments
CREATE TABLE IF NOT EXISTS "poros_confessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "day" VARCHAR(50) NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20),
    "location" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poros_confessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "poros_info_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'info',
    "url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poros_info_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "poros_adoration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "day" VARCHAR(50) NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20),
    "location" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poros_adoration_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_poros_confessions_event" ON "poros_confessions"("event_id");
CREATE INDEX IF NOT EXISTS "idx_poros_confessions_active" ON "poros_confessions"("is_active");
CREATE INDEX IF NOT EXISTS "idx_poros_info_items_event" ON "poros_info_items"("event_id");
CREATE INDEX IF NOT EXISTS "idx_poros_info_items_active" ON "poros_info_items"("is_active");
CREATE INDEX IF NOT EXISTS "idx_poros_adoration_event" ON "poros_adoration"("event_id");
CREATE INDEX IF NOT EXISTS "idx_poros_adoration_active" ON "poros_adoration"("is_active");

-- Ensure event_settings columns exist for confessions/info/adoration
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_confessions_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "confessions_reconciliation_guide_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_info_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_adoration_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Make sure confessions, adoration, and info are always enabled for Mount 2000 2026
UPDATE "event_settings"
SET "poros_confessions_enabled" = true,
    "poros_info_enabled" = true,
    "poros_adoration_enabled" = true
WHERE "event_id" = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1';
SQLEOF

echo "Executing table creation SQL..."
npx prisma db execute --file /tmp/create-tables.sql --schema prisma/schema.prisma

echo "Running next build..."
npx next build

echo "=== Build Script Complete ==="
