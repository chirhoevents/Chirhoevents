-- Phase 1: Question Catalog — schema changes
-- Adds catalog fields to custom_registration_questions and multi_select question type.
--
-- Design decisions:
--   • eventId made nullable: template rows (isTemplate = true) are stored with
--     event_id = NULL. Event-specific questions keep their existing non-null event_id.
--   • multi_select is a new QuestionType value (distinct from multiple_choice which
--     renders as a single-select <select>). Multi-select answers are stored in
--     answerText as a JSON array string, e.g. '["English","Spanish"]'.

-- -----------------------------------------------------------------------
-- 1. Make event_id nullable to allow template rows (event_id = NULL)
-- -----------------------------------------------------------------------
ALTER TABLE "custom_registration_questions"
  ALTER COLUMN "event_id" DROP NOT NULL;

-- -----------------------------------------------------------------------
-- 2. Add catalog metadata columns
-- -----------------------------------------------------------------------
ALTER TABLE "custom_registration_questions"
  ADD COLUMN IF NOT EXISTS "catalog_slug"     TEXT,
  ADD COLUMN IF NOT EXISTS "catalog_category" TEXT,
  ADD COLUMN IF NOT EXISTS "is_template"      BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------
-- 3. Add multi_select to the QuestionType enum
--    (multiple_choice stays as single-select to avoid breaking staff/vendor)
-- -----------------------------------------------------------------------
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'multi_select';

-- -----------------------------------------------------------------------
-- 4. Indexes for catalog lookups
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_custom_reg_q_catalog"
  ON "custom_registration_questions"("catalog_slug")
  WHERE "catalog_slug" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_custom_reg_q_template"
  ON "custom_registration_questions"("is_template")
  WHERE "is_template" = TRUE;
