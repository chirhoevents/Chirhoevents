#!/bin/bash
set -e

# Build v2.4 - Make every "ensure column exists" statement self-committing
echo "=== Build Script Starting ==="

echo "Running pre-migration cleanup..."

# Create a temp SQL file for the pre-prisma cleanup
cat > /tmp/pre-cleanup.sql << 'SQLEOF'
-- Drop orphaned unique constraint / index left behind by an old schema.
-- Idempotent — safe to keep running. DO NOT re-add the DROP COLUMN for
-- registration_token here: the column IS in the current schema (used by
-- waitlist invite tokens). Dropping it every deploy silently invalidated
-- every outstanding waitlist invitation (all tokens wiped, links 404),
-- which is exactly the bug Catherine hit with Maria Sousa on Aug 18.
BEGIN;
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";
DROP INDEX IF EXISTS "waitlist_entries_registration_token_key";
COMMIT;

-- Every "ensure this column exists" statement below runs in its OWN explicit
-- transaction. `prisma db execute --file` sends this whole file to Postgres
-- as one multi-statement string; without explicit BEGIN/COMMIT, Postgres
-- treats that as a SINGLE implicit transaction, so an error on ANY statement
-- — including one much further down this file, or in create-tables.sql run
-- later in this same build — silently rolls back every earlier ALTER too,
-- even though each one individually "succeeded." That's how
-- event_settings.salve_checkin_mode (added weeks ago in PR #840, with its
-- own ALTER right here) disappeared from production on 2026-10-02 and took
-- the whole site down, and it's also why the Mount 2000 external-payment-link
-- columns from PR #842 never showed up at all. Keep each column-creation
-- statement (or tightly related group) wrapped in its own BEGIN/COMMIT so a
-- later failure anywhere else can never undo it.
BEGIN;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "salve_packet_settings" JSONB;
COMMIT;

BEGIN;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "salve_checkin_mode" VARCHAR(20) NOT NULL DEFAULT 'group';
COMMIT;

BEGIN;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "card_payment_disabled" BOOLEAN NOT NULL DEFAULT false;
COMMIT;

BEGIN;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_deposit_payment_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_deposit_payment_note" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_balance_payment_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_balance_payment_note" TEXT;
COMMIT;

BEGIN;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "registration_acknowledgment_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "registration_acknowledgment_title" VARCHAR(255);
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "registration_acknowledgment_items" JSONB;
COMMIT;

BEGIN;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_confessions_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "confessions_reconciliation_guide_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_info_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_adoration_enabled" BOOLEAN NOT NULL DEFAULT false;
COMMIT;

-- Drop the old poros_confession_times table if it exists (we use poros_confessions now)
BEGIN;
DROP TABLE IF EXISTS "poros_confession_times" CASCADE;
COMMIT;
SQLEOF

# Run pre-cleanup SQL
echo "Executing pre-cleanup SQL..."
npx prisma db execute --file /tmp/pre-cleanup.sql --schema prisma/schema.prisma

echo "Running prisma db push..."
# --accept-data-loss allows the push to proceed if Prisma detects any potential
# data-loss (e.g. enum drift between DB and schema). Since all our schema changes
# only ADD enum values / columns (never remove them), this is safe.
# This flag does NOT drop tables outside the Prisma schema — poros_confessions,
# poros_adoration, poros_info_items etc. are completely unaffected.
npx prisma db push --skip-generate --accept-data-loss

# Post-push schema-drift canary: verify critical recently-added columns exist
# in the live DB after db push runs. If db push is skipped, cached, or silently
# no-ops, the app ships expecting columns the DB doesn't have — Prisma queries
# 500 across every endpoint that touches those tables (waitlist, registrations,
# and their emails). This block turns that silent failure into a hard build
# failure. Add a new check here whenever a migration adds columns that all
# queries on a table implicitly select.
echo "Verifying critical columns after db push..."
cat > /tmp/schema-canary.sql << 'SQLEOF'
DO $$
BEGIN
  -- Waitlist capacity-override + reservation columns (PRs #754-#757)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waitlist_entries' AND column_name='overridden_by') THEN
    RAISE EXCEPTION 'Schema drift after db push: waitlist_entries.overridden_by is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waitlist_entries' AND column_name='reserved_spots') THEN
    RAISE EXCEPTION 'Schema drift after db push: waitlist_entries.reserved_spots is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waitlist_entries' AND column_name='reserved_housing_type') THEN
    RAISE EXCEPTION 'Schema drift after db push: waitlist_entries.reserved_housing_type is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='individual_registrations' AND column_name='overridden_by') THEN
    RAISE EXCEPTION 'Schema drift after db push: individual_registrations.overridden_by is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_registrations' AND column_name='overridden_by') THEN
    RAISE EXCEPTION 'Schema drift after db push: group_registrations.overridden_by is missing';
  END IF;
  -- Public waitlist join surface (canary for the "attendees can't join" outage)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='waitlist_capacity') THEN
    RAISE EXCEPTION 'Schema drift after db push: events.waitlist_capacity is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='waitlist_enabled') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.waitlist_enabled is missing';
  END IF;
  -- Event archiving: every events query selects this column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='archived_at') THEN
    RAISE EXCEPTION 'Schema drift after db push: events.archived_at is missing';
  END IF;
  -- SALVE check-in mode (PR #840) — went missing in production on 2026-10-02
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='salve_checkin_mode') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.salve_checkin_mode is missing';
  END IF;
  -- Checks-only switch (PR #841)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='card_payment_disabled') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.card_payment_disabled is missing';
  END IF;
  -- Mount 2000 external card-payment links on the Group Leader Portal (PR #842)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='external_deposit_payment_url') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.external_deposit_payment_url is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='external_balance_payment_url') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.external_balance_payment_url is missing';
  END IF;
  -- Individual meal package add-on (every individual registration query selects it)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='individual_registrations' AND column_name='includes_meal_package') THEN
    RAISE EXCEPTION 'Schema drift after db push: individual_registrations.includes_meal_package is missing';
  END IF;
  -- Pre-checkout acknowledgment checklist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='registration_acknowledgment_items') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.registration_acknowledgment_items is missing';
  END IF;
  -- Poros confessions/info/adoration toggles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='poros_confessions_enabled') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.poros_confessions_enabled is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='poros_info_enabled') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.poros_info_enabled is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_settings' AND column_name='poros_adoration_enabled') THEN
    RAISE EXCEPTION 'Schema drift after db push: event_settings.poros_adoration_enabled is missing';
  END IF;
END $$;
SQLEOF
npx prisma db execute --file /tmp/schema-canary.sql --schema prisma/schema.prisma

# Create confession/adoration/info tables AFTER Prisma push
# These tables are managed outside of Prisma to prevent data loss during deployments
echo "Creating confession/adoration/info tables..."

cat > /tmp/create-tables.sql << 'SQLEOF'
-- Create confession/adoration/info tables if they don't exist
-- These tables are managed outside of Prisma to prevent data loss during deployments
-- Wrapped in its own transaction (see pre-cleanup.sql above for why) so a
-- failure in either seed UPDATE below can never roll back table creation.
BEGIN;
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
COMMIT;

-- Make sure confessions, adoration, and info are always enabled for Mount 2000 2026
BEGIN;
UPDATE "event_settings"
SET "poros_confessions_enabled" = true,
    "poros_info_enabled" = true,
    "poros_adoration_enabled" = true
WHERE "event_id" = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1';
COMMIT;

-- Seed the new-registration-process acknowledgment checklist for Mount 2000 2027,
-- but only the first time (guarded on items still being unset) so an admin's
-- later edits in the dashboard survive future deploys.
BEGIN;
UPDATE "event_settings"
SET "registration_acknowledgment_enabled" = true,
    "registration_acknowledgment_title" = 'New Registration Process',
    "registration_acknowledgment_items" = '[
      "Deposit: $20 per spot, due one month from your registration date. Deposits are non-refundable.",
      "Final Fee: due December 18.",
      "Late Fee: a 20% late fee applies to any balance not paid by December 18.",
      "Dropping Spots: you can drop a spot at any point before December 18 (when the late fee kicks in) at no penalty beyond the lost deposit.",
      "Group Leader Portal: you now have access to a portal where you can make your deposit online and track/manage liability forms.",
      "Paperwork Deadline: digital liability waivers for all teens and chaperones are due January 15."
    ]'::jsonb
WHERE "event_id" = '8c7aaf89-6790-4a81-bf6b-33e8dd8586f1'
  AND "registration_acknowledgment_items" IS NULL;
COMMIT;

-- Mount 2000 2027 is checks-only this year (internal financial restructuring).
-- Force this on every deploy rather than relying on the admin edit page's
-- checkbox being saved — it wasn't, which is how card payments stayed live
-- on the Group Leader Portal after everyone believed this was already off.
BEGIN;
UPDATE "event_settings"
SET "card_payment_disabled" = true
WHERE "event_id" = '8c7aaf89-6790-4a81-bf6b-33e8dd8586f1';
COMMIT;

-- Seed Mount 2000's external card-payment links (Mount Saint Mary's own
-- Jenzabar portal — not processed by Chirho) the first time, same
-- guarded-on-NULL pattern as the acknowledgment checklist above, so an
-- admin can still edit these later from the event edit page without a
-- future deploy clobbering the change.
BEGIN;
UPDATE "event_settings"
SET "external_deposit_payment_url" = 'https://mymount.msmary.edu/ICS/Events/Mount_2000_Deposit.jnz',
    "external_deposit_payment_note" = '$20 per slot — this is your deposit only, separate from the general admission balance below.',
    "external_balance_payment_url" = 'https://mymount.msmary.edu/ICS/Events/Mount_2000_Final_Payment.jnz',
    "external_balance_payment_note" = '$90 per slot off-campus, $130 per slot on-campus — this is your general admission balance. You must pay both the deposit and this balance to be paid in full.'
WHERE "event_id" = '8c7aaf89-6790-4a81-bf6b-33e8dd8586f1'
  AND "external_deposit_payment_url" IS NULL
  AND "external_balance_payment_url" IS NULL;
COMMIT;
SQLEOF

echo "Executing table creation SQL..."
npx prisma db execute --file /tmp/create-tables.sql --schema prisma/schema.prisma

echo "Seeding question catalog..."
npm run db:seed-catalog

echo "Running next build..."
npx next build

echo "=== Build Script Complete ==="
