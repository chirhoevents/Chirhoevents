-- ============================================================
-- Migration: add_post_conference_survey
-- Adds a native post-conference/retreat survey feature: an event
-- owns one or more Surveys, each with its own set of questions
-- (multiple choice, multi-select, yes/no, scale, or short text).
-- Surveys are sent via tokenized magic links to participants
-- and/or group leaders (either audience, or both, per survey --
-- group leaders can speak for groups with minors who may not
-- have their own email). Anonymous surveys still track recipient
-- completion for reminders, but application code must never join
-- recipient identity back onto answers when is_anonymous = true.
-- ============================================================

-- ============================================================
-- 1. New enums
-- ============================================================
CREATE TYPE "SurveyStatus" AS ENUM ('draft', 'active', 'closed');
CREATE TYPE "SurveyQuestionType" AS ENUM ('text', 'yes_no', 'multiple_choice', 'multi_select', 'scale');
CREATE TYPE "SurveyRecipientType" AS ENUM ('participant', 'group_leader');

-- ============================================================
-- 2. New table: surveys
-- ============================================================
CREATE TABLE IF NOT EXISTS "surveys" (
  "id"                   UUID           NOT NULL DEFAULT gen_random_uuid(),
  "event_id"             UUID           NOT NULL,
  "title"                VARCHAR(255)   NOT NULL,
  "description"          TEXT,
  "status"               "SurveyStatus" NOT NULL DEFAULT 'draft',
  "send_to_participants" BOOLEAN        NOT NULL DEFAULT true,
  "send_to_group_leaders" BOOLEAN       NOT NULL DEFAULT true,
  "is_anonymous"         BOOLEAN        NOT NULL DEFAULT false,
  "closes_at"            TIMESTAMPTZ(6),
  "created_by"           UUID           NOT NULL,
  "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "surveys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "surveys_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "surveys_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_survey_event" ON "surveys"("event_id");

-- ============================================================
-- 3. New table: survey_questions
-- ============================================================
CREATE TABLE IF NOT EXISTS "survey_questions" (
  "id"              UUID                 NOT NULL DEFAULT gen_random_uuid(),
  "survey_id"       UUID                 NOT NULL,
  "question_text"   TEXT                 NOT NULL,
  "question_type"   "SurveyQuestionType" NOT NULL,
  -- string[] for multiple_choice / multi_select
  "options"         JSONB,
  "scale_min"       INTEGER,
  "scale_max"       INTEGER,
  "scale_min_label" VARCHAR(100),
  "scale_max_label" VARCHAR(100),
  "required"        BOOLEAN              NOT NULL DEFAULT false,
  "display_order"   INTEGER              NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMPTZ(6)       NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ(6)       NOT NULL DEFAULT now(),

  CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_questions_survey_id_fkey"
    FOREIGN KEY ("survey_id") REFERENCES "surveys"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_survey_question_survey" ON "survey_questions"("survey_id");

-- ============================================================
-- 4. New table: survey_recipients
--    One row per person a survey link was (or will be) sent to.
--    Tracked even for anonymous surveys so reminders/completion
--    stats work; results views must not expose this identity.
-- ============================================================
CREATE TABLE IF NOT EXISTS "survey_recipients" (
  "id"                          UUID                   NOT NULL DEFAULT gen_random_uuid(),
  "survey_id"                   UUID                   NOT NULL,
  "recipient_type"              "SurveyRecipientType"  NOT NULL,
  "participant_id"              UUID,
  "group_registration_id"       UUID,
  "individual_registration_id"  UUID,
  "name"                        VARCHAR(255),
  "email"                       VARCHAR(255)           NOT NULL,
  "token"                       VARCHAR(255)           NOT NULL,
  "token_expires_at"            TIMESTAMPTZ(6),
  "sent_at"                     TIMESTAMPTZ(6),
  "reminders_sent_count"        INTEGER                NOT NULL DEFAULT 0,
  "last_reminder_at"            TIMESTAMPTZ(6),
  "responded_at"                TIMESTAMPTZ(6),
  "created_at"                  TIMESTAMPTZ(6)          NOT NULL DEFAULT now(),

  CONSTRAINT "survey_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_recipients_token_key" UNIQUE ("token"),
  CONSTRAINT "survey_recipients_survey_id_fkey"
    FOREIGN KEY ("survey_id") REFERENCES "surveys"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "survey_recipients_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "survey_recipients_group_registration_id_fkey"
    FOREIGN KEY ("group_registration_id") REFERENCES "group_registrations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "survey_recipients_individual_registration_id_fkey"
    FOREIGN KEY ("individual_registration_id") REFERENCES "individual_registrations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_survey_recipient_survey" ON "survey_recipients"("survey_id");
CREATE INDEX IF NOT EXISTS "idx_survey_recipient_participant" ON "survey_recipients"("participant_id");
CREATE INDEX IF NOT EXISTS "idx_survey_recipient_group" ON "survey_recipients"("group_registration_id");
CREATE INDEX IF NOT EXISTS "idx_survey_recipient_individual" ON "survey_recipients"("individual_registration_id");

-- ============================================================
-- 5. New table: survey_responses
-- ============================================================
CREATE TABLE IF NOT EXISTS "survey_responses" (
  "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
  "survey_id"    UUID           NOT NULL,
  "recipient_id" UUID,
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_responses_recipient_id_key" UNIQUE ("recipient_id"),
  CONSTRAINT "survey_responses_survey_id_fkey"
    FOREIGN KEY ("survey_id") REFERENCES "surveys"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "survey_responses_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "survey_recipients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_survey_response_survey" ON "survey_responses"("survey_id");

-- ============================================================
-- 6. New table: survey_answers
-- ============================================================
CREATE TABLE IF NOT EXISTS "survey_answers" (
  "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
  "response_id" UUID           NOT NULL,
  "question_id" UUID           NOT NULL,
  -- Free text, a numeric string for `scale`, or a JSON-stringified
  -- string[] for `multi_select`.
  "answer_text" TEXT,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_answers_response_id_fkey"
    FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "survey_answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_survey_answer_response" ON "survey_answers"("response_id");
CREATE INDEX IF NOT EXISTS "idx_survey_answer_question" ON "survey_answers"("question_id");
