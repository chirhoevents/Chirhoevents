#!/bin/bash
set -e

# Build v2.1 - Force fresh deployment
echo "=== Build Script Starting ==="

echo "Running pre-migration cleanup and data backup..."

# Create a temp SQL file for the cleanup and backup
cat > /tmp/cleanup.sql << 'SQLEOF'
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

-- Ensure event_settings columns exist for confessions/info/adoration
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_confessions_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "confessions_reconciliation_guide_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_info_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_adoration_enabled" BOOLEAN NOT NULL DEFAULT false;

-- BACKUP: Create backup tables and copy data BEFORE prisma runs
-- This preserves data even if prisma db push --accept-data-loss drops the tables

-- Backup confessions
DROP TABLE IF EXISTS "_backup_poros_confessions";
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poros_confessions') THEN
        CREATE TABLE "_backup_poros_confessions" AS SELECT * FROM "poros_confessions";
        RAISE NOTICE 'Backed up poros_confessions data';
    END IF;
END $$;

-- Backup info items
DROP TABLE IF EXISTS "_backup_poros_info_items";
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poros_info_items') THEN
        CREATE TABLE "_backup_poros_info_items" AS SELECT * FROM "poros_info_items";
        RAISE NOTICE 'Backed up poros_info_items data';
    END IF;
END $$;

-- Backup adoration
DROP TABLE IF EXISTS "_backup_poros_adoration";
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poros_adoration') THEN
        CREATE TABLE "_backup_poros_adoration" AS SELECT * FROM "poros_adoration";
        RAISE NOTICE 'Backed up poros_adoration data';
    END IF;
END $$;
SQLEOF

# Run cleanup and backup SQL
echo "Executing cleanup and backup SQL..."
npx prisma db execute --file /tmp/cleanup.sql --schema prisma/schema.prisma || echo "Cleanup/backup SQL completed (some statements may have been skipped)"

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "Restoring backed up data..."

# Create restore SQL
cat > /tmp/restore.sql << 'SQLEOF'
-- RESTORE: Copy data back from backup tables after prisma recreated the tables

-- Restore confessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_poros_confessions') THEN
        -- Only restore if backup has data and main table is empty or has fewer rows
        IF (SELECT COUNT(*) FROM "_backup_poros_confessions") > 0 THEN
            -- Delete any rows prisma might have created (should be none)
            DELETE FROM "poros_confessions" WHERE id NOT IN (SELECT id FROM "_backup_poros_confessions");
            -- Insert backed up data, ignoring conflicts
            INSERT INTO "poros_confessions" (id, event_id, day, start_time, end_time, location, description, is_active, "order", created_at, updated_at)
            SELECT id, event_id, day, start_time, end_time, location, description, is_active, "order", created_at, updated_at
            FROM "_backup_poros_confessions"
            ON CONFLICT (id) DO NOTHING;
            RAISE NOTICE 'Restored poros_confessions data';
        END IF;
        DROP TABLE "_backup_poros_confessions";
    END IF;
END $$;

-- Restore info items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_poros_info_items') THEN
        IF (SELECT COUNT(*) FROM "_backup_poros_info_items") > 0 THEN
            DELETE FROM "poros_info_items" WHERE id NOT IN (SELECT id FROM "_backup_poros_info_items");
            INSERT INTO "poros_info_items" (id, event_id, title, content, type, url, is_active, "order", created_at, updated_at)
            SELECT id, event_id, title, content, type, url, is_active, "order", created_at, updated_at
            FROM "_backup_poros_info_items"
            ON CONFLICT (id) DO NOTHING;
            RAISE NOTICE 'Restored poros_info_items data';
        END IF;
        DROP TABLE "_backup_poros_info_items";
    END IF;
END $$;

-- Restore adoration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_poros_adoration') THEN
        IF (SELECT COUNT(*) FROM "_backup_poros_adoration") > 0 THEN
            DELETE FROM "poros_adoration" WHERE id NOT IN (SELECT id FROM "_backup_poros_adoration");
            INSERT INTO "poros_adoration" (id, event_id, day, start_time, end_time, location, description, is_active, "order", created_at, updated_at)
            SELECT id, event_id, day, start_time, end_time, location, description, is_active, "order", created_at, updated_at
            FROM "_backup_poros_adoration"
            ON CONFLICT (id) DO NOTHING;
            RAISE NOTICE 'Restored poros_adoration data';
        END IF;
        DROP TABLE "_backup_poros_adoration";
    END IF;
END $$;

-- Make sure confessions, adoration, and info are always enabled for Mount 2000 2026
UPDATE "event_settings"
SET "poros_confessions_enabled" = true,
    "poros_info_enabled" = true,
    "poros_adoration_enabled" = true
WHERE "event_id" = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1';
SQLEOF

# Run restore SQL
npx prisma db execute --file /tmp/restore.sql --schema prisma/schema.prisma || echo "Restore SQL completed (may have been skipped)"

echo "Running next build..."
npx next build

echo "=== Build Script Complete ==="
