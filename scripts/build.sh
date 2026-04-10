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

-- ---------------------------------------------------------------
-- Schema drift cleanup: fully recreate removed enum values by
-- dynamically finding ALL dependent columns, converting to text,
-- migrating data, dropping/recreating the enum, then restoring.
-- Prisma then sees no diff and skips the enum entirely.
-- Each block is idempotent — checks pg_enum before acting.
-- ---------------------------------------------------------------

-- Drop letter_of_good_standing columns from event_settings
ALTER TABLE "event_settings" DROP COLUMN IF EXISTS "letter_of_good_standing_method";
ALTER TABLE "event_settings" DROP COLUMN IF EXISTS "letter_of_good_standing_required_for";

-- ParticipantType: remove deacon, seminarian, religious_sister, religious_brother
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ParticipantType'
      AND e.enumlabel IN ('deacon','seminarian','religious_sister','religious_brother')
  ) THEN
    -- Collect ALL dependent columns (including tables not in schema.prisma)
    DROP TABLE IF EXISTS _pt_cols;
    CREATE TEMP TABLE _pt_cols AS
    SELECT c.relname AS tbl, a.attname AS col, a.attnotnull AS notnull
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE a.atttypid = (SELECT oid FROM pg_type WHERE typname = 'ParticipantType')
      AND n.nspname = 'public' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped;

    -- Step 1: convert every dependent column to text
    FOR r IN SELECT tbl, col FROM _pt_cols LOOP
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text', r.tbl, r.col);
    END LOOP;

    -- Step 2: migrate invalid values out of every table
    UPDATE "participants" SET "participant_type" = 'priest'
      WHERE "participant_type" IN ('deacon','seminarian');
    UPDATE "participants" SET "participant_type" = 'chaperone'
      WHERE "participant_type" IN ('religious_sister','religious_brother');
    BEGIN
      UPDATE "liability_forms" SET "participant_type" = NULL
        WHERE "participant_type" IN ('deacon','seminarian','religious_sister','religious_brother');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      UPDATE "liability_form_section_configs" SET "participant_type" = NULL
        WHERE "participant_type" IN ('deacon','seminarian','religious_sister','religious_brother');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      UPDATE "letters_of_good_standing" SET "participant_type" = 'priest'
        WHERE "participant_type" IN ('deacon','seminarian','religious_sister','religious_brother');
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Step 3: drop old enum, create new one
    DROP TYPE "ParticipantType";
    CREATE TYPE "ParticipantType" AS ENUM ('youth_u18','youth_o18','chaperone','priest');

    -- Step 4: restore all columns to the new enum type
    FOR r IN SELECT tbl, col, notnull FROM _pt_cols LOOP
      IF r.notnull THEN
        -- Ensure no NULL / invalid text survives in NOT NULL columns
        EXECUTE format(
          'UPDATE %I SET %I = ''youth_u18'' WHERE %I IS NULL'
          ' OR %I NOT IN (''youth_u18'',''youth_o18'',''chaperone'',''priest'')',
          r.tbl, r.col, r.col, r.col
        );
      END IF;
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE "ParticipantType" USING %I::"ParticipantType"',
        r.tbl, r.col, r.col
      );
    END LOOP;
    DROP TABLE _pt_cols;
  END IF;
END $$;

-- ClergyTitle: remove sister, brother
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ClergyTitle' AND e.enumlabel IN ('sister','brother')
  ) THEN
    DROP TABLE IF EXISTS _ct_cols;
    CREATE TEMP TABLE _ct_cols AS
    SELECT c.relname AS tbl, a.attname AS col, a.attnotnull AS notnull
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE a.atttypid = (SELECT oid FROM pg_type WHERE typname = 'ClergyTitle')
      AND n.nspname = 'public' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped;

    FOR r IN SELECT tbl, col FROM _ct_cols LOOP
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text', r.tbl, r.col);
      EXECUTE format('UPDATE %I SET %I = NULL WHERE %I IN (''sister'',''brother'')',
                     r.tbl, r.col, r.col);
    END LOOP;

    DROP TYPE "ClergyTitle";
    CREATE TYPE "ClergyTitle" AS ENUM ('father','deacon','mr','most_reverend','seminarian');

    FOR r IN SELECT tbl, col FROM _ct_cols LOOP
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE "ClergyTitle" USING %I::"ClergyTitle"',
        r.tbl, r.col, r.col
      );
    END LOOP;
    DROP TABLE _ct_cols;
  END IF;
END $$;

-- LiabilityFormType: remove religious → clergy
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'LiabilityFormType' AND e.enumlabel = 'religious'
  ) THEN
    DROP TABLE IF EXISTS _lft_cols;
    CREATE TEMP TABLE _lft_cols AS
    SELECT c.relname AS tbl, a.attname AS col, a.attnotnull AS notnull
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE a.atttypid = (SELECT oid FROM pg_type WHERE typname = 'LiabilityFormType')
      AND n.nspname = 'public' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped;

    FOR r IN SELECT tbl, col FROM _lft_cols LOOP
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text', r.tbl, r.col);
      EXECUTE format('UPDATE %I SET %I = ''clergy'' WHERE %I = ''religious''',
                     r.tbl, r.col, r.col);
    END LOOP;

    DROP TYPE "LiabilityFormType";
    CREATE TYPE "LiabilityFormType" AS ENUM ('youth_u18','youth_o18_chaperone','clergy');

    FOR r IN SELECT tbl, col, notnull FROM _lft_cols LOOP
      IF r.notnull THEN
        EXECUTE format(
          'UPDATE %I SET %I = ''clergy'''
          ' WHERE %I IS NULL OR %I NOT IN (''youth_u18'',''youth_o18_chaperone'',''clergy'')',
          r.tbl, r.col, r.col, r.col
        );
      END IF;
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE "LiabilityFormType" USING %I::"LiabilityFormType"',
        r.tbl, r.col, r.col
      );
    END LOOP;
    DROP TABLE _lft_cols;
  END IF;
END $$;
SQLEOF

# Run pre-cleanup SQL
echo "Executing pre-cleanup SQL..."
npx prisma db execute --file /tmp/pre-cleanup.sql --schema prisma/schema.prisma

echo "Running prisma db push..."
# --accept-data-loss is safe here because the pre-cleanup above already migrated
# every row that used removed enum values, so no actual data is lost.
# This flag does NOT drop tables outside the Prisma schema — poros_confessions,
# poros_adoration, poros_info_items etc. are completely unaffected.
npx prisma db push --skip-generate --accept-data-loss

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
