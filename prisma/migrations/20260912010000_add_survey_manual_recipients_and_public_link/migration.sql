-- ============================================================
-- Migration: add_survey_manual_recipients_and_public_link
-- Adds three ways to reach people outside the registration data
-- a survey is normally targeted at:
--   1. 'manual' recipient type -- an admin adds a one-off name +
--      email (a vendor, staff member, etc.) and gets a real
--      tracked link.
--   2. survey_recipients.is_test -- a "send test" recipient with a
--      real working link, excluded from recipient/response counts.
--   3. surveys.public_token -- a non-personalized, shareable link
--      anyone can use (flyers, QR codes, "just grab a link").
--      Submissions through it have a NULL recipient_id (already
--      nullable) and are always anonymous / non-remindable.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- in older PG versions. Neon runs PG 15 so IF NOT EXISTS is safe,
-- but this statement is intentionally kept outside BEGIN/COMMIT.
-- ============================================================

ALTER TYPE "SurveyRecipientType" ADD VALUE IF NOT EXISTS 'manual';

ALTER TABLE "survey_recipients" ADD COLUMN IF NOT EXISTS "is_test" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "surveys" ADD COLUMN IF NOT EXISTS "public_token" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "surveys_public_token_key" ON "surveys"("public_token");
