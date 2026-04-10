-- ============================================================
-- Migration: liability_form_role_expansion_and_section_configs
-- Adds new participant/clergy/form-type enum values, per-event
-- section config table, letter of good standing table, and
-- event_settings columns for letter-of-good-standing workflow.
-- ============================================================

-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- in older PG versions. Neon runs PG 15 so IF NOT EXISTS is safe,
-- but these statements are intentionally kept outside BEGIN/COMMIT.

-- ============================================================
-- 1. Expand ParticipantType enum
-- ============================================================
ALTER TYPE "ParticipantType" ADD VALUE IF NOT EXISTS 'seminarian';
ALTER TYPE "ParticipantType" ADD VALUE IF NOT EXISTS 'religious_sister';
ALTER TYPE "ParticipantType" ADD VALUE IF NOT EXISTS 'religious_brother';
ALTER TYPE "ParticipantType" ADD VALUE IF NOT EXISTS 'deacon';

-- ============================================================
-- 2. Expand ClergyTitle enum
-- ============================================================
ALTER TYPE "ClergyTitle" ADD VALUE IF NOT EXISTS 'sister';
ALTER TYPE "ClergyTitle" ADD VALUE IF NOT EXISTS 'brother';

-- ============================================================
-- 3. Expand LiabilityFormType enum
-- ============================================================
ALTER TYPE "LiabilityFormType" ADD VALUE IF NOT EXISTS 'religious';

-- ============================================================
-- 4. New table: liability_form_section_configs
--    Controls which sections are visible per event + participant type.
-- ============================================================
CREATE TABLE IF NOT EXISTS "liability_form_section_configs" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID         NOT NULL,
  "event_id"         UUID         NOT NULL,
  "participant_type" "ParticipantType" NOT NULL,
  "section_key"      VARCHAR(100) NOT NULL,
  -- Known section_key values:
  --   basic_info, medical, emergency_contacts, insurance,
  --   transportation_consent, photo_video_consent, medical_release,
  --   emergency_treatment, safe_environment_cert,
  --   letter_of_good_standing, clergy_info, housing
  "enabled"          BOOLEAN      NOT NULL DEFAULT true,
  "required"         BOOLEAN      NOT NULL DEFAULT true,
  "display_order"    INTEGER      NOT NULL DEFAULT 0,
  "custom_label"     VARCHAR(255),
  "custom_help_text" TEXT,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "liability_form_section_configs_pkey"
    PRIMARY KEY ("id"),
  CONSTRAINT "liability_form_section_configs_event_participant_section_key"
    UNIQUE ("event_id", "participant_type", "section_key"),
  CONSTRAINT "liability_form_section_configs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "liability_form_section_configs_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_section_config_event"
  ON "liability_form_section_configs"("event_id");
CREATE INDEX IF NOT EXISTS "idx_section_config_org"
  ON "liability_form_section_configs"("organization_id");

-- ============================================================
-- 5. New table: letters_of_good_standing
--    Tracks letter-of-good-standing submissions for clergy,
--    deacons, seminarians, and any other configured roles.
-- ============================================================
CREATE TABLE IF NOT EXISTS "letters_of_good_standing" (
  "id"                        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"           UUID         NOT NULL,
  "event_id"                  UUID         NOT NULL,
  "liability_form_id"         UUID,
  "participant_id"            UUID,
  "participant_name"          VARCHAR(255) NOT NULL,
  "participant_type"          "ParticipantType" NOT NULL,
  -- Submission method: 'file_upload' | 'external_submission' | 'not_required' | 'pending'
  "submission_method"         VARCHAR(50)  NOT NULL DEFAULT 'pending',
  -- File upload fields
  "file_url"                  TEXT,
  "original_filename"         VARCHAR(255),
  "file_size_bytes"           BIGINT,
  "uploaded_at"               TIMESTAMPTZ(6),
  -- External submission tracking
  "submitted_to_contact"      VARCHAR(255),
  "submitted_to_email"        VARCHAR(255),
  "external_submission_notes" TEXT,
  -- Status: 'pending' | 'submitted_externally' | 'uploaded' | 'verified' | 'rejected'
  "status"                    VARCHAR(50)  NOT NULL DEFAULT 'pending',
  "verified_at"               TIMESTAMPTZ(6),
  "verified_by_user_id"       UUID,
  "rejection_reason"          TEXT,
  "created_at"                TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"                TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "letters_of_good_standing_pkey"
    PRIMARY KEY ("id"),
  CONSTRAINT "letters_of_good_standing_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "letters_of_good_standing_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "letters_of_good_standing_liability_form_id_fkey"
    FOREIGN KEY ("liability_form_id") REFERENCES "liability_forms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "letters_of_good_standing_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "letters_of_good_standing_verified_by_user_id_fkey"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_logs_event"
  ON "letters_of_good_standing"("event_id");
CREATE INDEX IF NOT EXISTS "idx_logs_org"
  ON "letters_of_good_standing"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_logs_status"
  ON "letters_of_good_standing"("status");

-- ============================================================
-- 6. New columns on event_settings for letter-of-good-standing
-- ============================================================
ALTER TABLE "event_settings"
  ADD COLUMN IF NOT EXISTS "letter_of_good_standing_method"
    VARCHAR(50) NOT NULL DEFAULT 'both',
  -- 'file_upload' | 'instructions_only' | 'both'
  ADD COLUMN IF NOT EXISTS "letter_of_good_standing_contact_name"
    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "letter_of_good_standing_contact_email"
    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "letter_of_good_standing_instructions"
    TEXT,
  ADD COLUMN IF NOT EXISTS "letter_of_good_standing_required_for"
    JSONB NOT NULL DEFAULT '["priest", "deacon", "seminarian"]'::jsonb;
