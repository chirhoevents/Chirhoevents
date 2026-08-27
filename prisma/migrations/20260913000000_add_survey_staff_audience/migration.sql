-- ============================================================
-- Migration: add_survey_staff_audience
-- Adds a third survey audience: registered staff/volunteers
-- (StaffRegistration, including vendor staff). Off by default --
-- orgs opt in per survey.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- in older PG versions. Neon runs PG 15 so IF NOT EXISTS is safe,
-- but this statement is intentionally kept outside BEGIN/COMMIT.
-- ============================================================

ALTER TYPE "SurveyRecipientType" ADD VALUE IF NOT EXISTS 'staff';

ALTER TABLE "surveys" ADD COLUMN IF NOT EXISTS "send_to_staff" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "survey_recipients" ADD COLUMN IF NOT EXISTS "staff_registration_id" UUID;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so guard it explicitly
-- (safe to re-run this migration file more than once).
DO $$ BEGIN
  ALTER TABLE "survey_recipients"
    ADD CONSTRAINT "survey_recipients_staff_registration_id_fkey"
    FOREIGN KEY ("staff_registration_id") REFERENCES "staff_registrations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_survey_recipient_staff" ON "survey_recipients"("staff_registration_id");
