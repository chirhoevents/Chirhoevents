-- Lux tables and columns, created explicitly on every deploy.
--
-- `prisma db push` has silently skipped changes on production before (see the
-- notes in scripts/build.sh), and it did again for Lux: it reported "already
-- in sync" while events.mode and the lux_* tables were missing, so the schema
-- check failed the build. scripts/build.sh runs this file before db push so
-- these always exist. Everything is idempotent (IF NOT EXISTS, or guarded on
-- pg_constraint) and each statement commits on its own, so a failure in one
-- can't roll back the others.
--
-- Generated with `prisma migrate diff` from the schema before Lux to the
-- schema with Lux, so names and types match exactly what Prisma expects.
-- When a later change adds Lux columns, add them here too.

BEGIN;
ALTER TYPE "RegistrationType" ADD VALUE IF NOT EXISTS 'lux_order';
COMMIT;

BEGIN;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "lux_settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "public_slug" VARCHAR(80);
COMMIT;

BEGIN;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_dashboard" VARCHAR(10);
COMMIT;

BEGIN;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lux_config" JSONB,
ADD COLUMN IF NOT EXISTS "mode" VARCHAR(20) NOT NULL DEFAULT 'full';
COMMIT;

BEGIN;
ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "lux_details" JSONB,
ADD COLUMN IF NOT EXISTS "ticket_quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "ticket_selections" JSONB;
COMMIT;

BEGIN;
ALTER TABLE "payments" ALTER COLUMN "event_id" DROP NOT NULL;
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "event_ticket_options" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "price" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER,
    "remaining" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_ticket_options_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_households" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "guardian1_first_name" VARCHAR(100) NOT NULL,
    "guardian1_last_name" VARCHAR(100) NOT NULL,
    "guardian1_relationship" VARCHAR(50),
    "guardian2_first_name" VARCHAR(100),
    "guardian2_last_name" VARCHAR(100),
    "guardian2_relationship" VARCHAR(50),
    "guardian2_email" VARCHAR(255),
    "guardian2_phone" VARCHAR(30),
    "email" VARCHAR(255) NOT NULL,
    "email_normalized" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "street" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zip" VARCHAR(20),
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_phone" VARCHAR(30),
    "registered_parishioner" BOOLEAN,
    "preferred_language" VARCHAR(5),
    "staff_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lux_households_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_children" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "grade" VARCHAR(10),
    "school" VARCHAR(255),
    "baptized" BOOLEAN,
    "baptism_date" DATE,
    "baptism_parish" VARCHAR(255),
    "baptism_city" VARCHAR(255),
    "baptized_at_this_parish" BOOLEAN NOT NULL DEFAULT false,
    "first_communion_date" DATE,
    "first_communion_parish" VARCHAR(255),
    "allergies" TEXT,
    "medical_notes" TEXT,
    "is_adult" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lux_children_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_programs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "template_key" VARCHAR(40) NOT NULL,
    "term" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "registration_opens_at" TIMESTAMPTZ(6),
    "registration_closes_at" TIMESTAMPTZ(6),
    "capacity" INTEGER,
    "grades" JSONB,
    "tuition_per_child" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fee_items" JSONB NOT NULL DEFAULT '[]',
    "sibling_discount_applies" BOOLEAN NOT NULL DEFAULT true,
    "counts_toward_family_cap" BOOLEAN NOT NULL DEFAULT true,
    "online_payment_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pay_at_office_enabled" BOOLEAN NOT NULL DEFAULT true,
    "fee_assistance_enabled" BOOLEAN NOT NULL DEFAULT true,
    "collect_sponsor" BOOLEAN NOT NULL DEFAULT false,
    "collect_service_hours" BOOLEAN NOT NULL DEFAULT false,
    "service_hours_required" INTEGER,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "audience" VARCHAR(20) NOT NULL DEFAULT 'children',
    "fee_type" VARCHAR(20) NOT NULL DEFAULT 'per_person',
    "sessions" JSONB NOT NULL DEFAULT '[]',
    "language" VARCHAR(20),
    "confirmation_message" TEXT,
    "document_retention_days" INTEGER,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lux_programs_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "confirmation_code" VARCHAR(20) NOT NULL,
    "pay_token" VARCHAR(64) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sibling_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "family_cap_adjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "fee_assistance_requested" BOOLEAN NOT NULL DEFAULT false,
    "fee_assistance_note" TEXT,
    "fee_assistance_status" VARCHAR(20) NOT NULL DEFAULT 'none',
    "fee_assistance_staff_note" TEXT,
    "fee_assistance_resolved_by_id" UUID,
    "fee_assistance_resolved_at" TIMESTAMPTZ(6),
    "breakdown" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lux_orders_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_program_registrations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "order_id" UUID,
    "term" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    "grade" VARCHAR(10),
    "session_id" VARCHAR(40),
    "fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "answers" JSONB,
    "sponsor_info" JSONB,
    "service_hours_completed" INTEGER,
    "staff_notes" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lux_program_registrations_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_document_requirements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allow_parish_lookup" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lux_document_requirements_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_document_submissions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "program_registration_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'missing',
    "storage_ref" TEXT,
    "file_name" VARCHAR(255),
    "content_type" VARCHAR(100),
    "size_bytes" INTEGER,
    "uploaded_at" TIMESTAMPTZ(6),
    "uploaded_via" VARCHAR(20),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewer_note" TEXT,
    "last_reminder_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lux_document_submissions_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_magic_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "requested_ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lux_magic_links_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_family_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "order_id" UUID,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lux_family_sessions_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS "lux_audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_user_id" UUID,
    "actor_household_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "target_type" VARCHAR(40),
    "target_id" VARCHAR(64),
    "metadata" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lux_audit_logs_pkey" PRIMARY KEY ("id")
);
COMMIT;

BEGIN;
ALTER TABLE "event_ticket_options"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "event_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "name" VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS "description" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) NOT NULL,
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "remaining" INTEGER,
  ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_households"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "guardian1_first_name" VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS "guardian1_last_name" VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS "guardian1_relationship" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "guardian2_first_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "guardian2_last_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "guardian2_relationship" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "guardian2_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "guardian2_phone" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "email" VARCHAR(255) NOT NULL,
  ADD COLUMN IF NOT EXISTS "email_normalized" VARCHAR(255) NOT NULL,
  ADD COLUMN IF NOT EXISTS "phone" VARCHAR(30) NOT NULL,
  ADD COLUMN IF NOT EXISTS "street" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "state" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "zip" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "emergency_contact_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "emergency_contact_phone" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "registered_parishioner" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "preferred_language" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "staff_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_children"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "household_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "first_name" VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_name" VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "grade" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "school" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "baptized" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "baptism_date" DATE,
  ADD COLUMN IF NOT EXISTS "baptism_parish" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "baptism_city" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "baptized_at_this_parish" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "first_communion_date" DATE,
  ADD COLUMN IF NOT EXISTS "first_communion_parish" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "allergies" TEXT,
  ADD COLUMN IF NOT EXISTS "medical_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "is_adult" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_programs"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "name" VARCHAR(255) NOT NULL,
  ADD COLUMN IF NOT EXISTS "slug" VARCHAR(160) NOT NULL,
  ADD COLUMN IF NOT EXISTS "template_key" VARCHAR(40) NOT NULL,
  ADD COLUMN IF NOT EXISTS "term" VARCHAR(50) NOT NULL,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "registration_opens_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "registration_closes_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "grades" JSONB,
  ADD COLUMN IF NOT EXISTS "tuition_per_child" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fee_items" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "sibling_discount_applies" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "counts_toward_family_cap" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "online_payment_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pay_at_office_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "fee_assistance_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "collect_sponsor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "collect_service_hours" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "service_hours_required" INTEGER,
  ADD COLUMN IF NOT EXISTS "questions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "audience" VARCHAR(20) NOT NULL DEFAULT 'children',
  ADD COLUMN IF NOT EXISTS "fee_type" VARCHAR(20) NOT NULL DEFAULT 'per_person',
  ADD COLUMN IF NOT EXISTS "sessions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "language" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "confirmation_message" TEXT,
  ADD COLUMN IF NOT EXISTS "document_retention_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_orders"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "household_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "confirmation_code" VARCHAR(20) NOT NULL,
  ADD COLUMN IF NOT EXISTS "pay_token" VARCHAR(64) NOT NULL,
  ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sibling_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "family_cap_adjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "amount_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(20) NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) NOT NULL,
  ADD COLUMN IF NOT EXISTS "fee_assistance_requested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fee_assistance_note" TEXT,
  ADD COLUMN IF NOT EXISTS "fee_assistance_status" VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "fee_assistance_staff_note" TEXT,
  ADD COLUMN IF NOT EXISTS "fee_assistance_resolved_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "fee_assistance_resolved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "breakdown" JSONB,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_program_registrations"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "program_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "child_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "household_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "order_id" UUID,
  ADD COLUMN IF NOT EXISTS "term" VARCHAR(50) NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS "grade" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "answers" JSONB,
  ADD COLUMN IF NOT EXISTS "sponsor_info" JSONB,
  ADD COLUMN IF NOT EXISTS "service_hours_completed" INTEGER,
  ADD COLUMN IF NOT EXISTS "staff_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_document_requirements"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "program_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "key" VARCHAR(60) NOT NULL,
  ADD COLUMN IF NOT EXISTS "label" VARCHAR(255) NOT NULL,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allow_parish_lookup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;

BEGIN;
ALTER TABLE "lux_document_submissions"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "requirement_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "program_registration_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "child_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "household_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS "storage_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "file_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "content_type" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "size_bytes" INTEGER,
  ADD COLUMN IF NOT EXISTS "uploaded_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "uploaded_via" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "reviewed_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "reviewer_note" TEXT,
  ADD COLUMN IF NOT EXISTS "last_reminder_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL;
COMMIT;

BEGIN;
ALTER TABLE "lux_magic_links"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "household_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "token_hash" VARCHAR(64) NOT NULL,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6) NOT NULL,
  ADD COLUMN IF NOT EXISTS "used_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "requested_ip" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;

BEGIN;
ALTER TABLE "lux_family_sessions"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "household_id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "order_id" UUID,
  ADD COLUMN IF NOT EXISTS "token_hash" VARCHAR(64) NOT NULL,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6) NOT NULL,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;

BEGIN;
ALTER TABLE "lux_audit_logs"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "organization_id" UUID,
  ADD COLUMN IF NOT EXISTS "actor_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "actor_household_id" UUID,
  ADD COLUMN IF NOT EXISTS "action" VARCHAR(60) NOT NULL,
  ADD COLUMN IF NOT EXISTS "target_type" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "target_id" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "ip" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_ticket_option_event" ON "event_ticket_options"("event_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_household_org" ON "lux_households"("organization_id");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_households_organization_id_email_normalized_key" ON "lux_households"("organization_id", "email_normalized");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_child_household" ON "lux_children"("household_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_child_org" ON "lux_children"("organization_id");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_programs_slug_key" ON "lux_programs"("slug");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_program_org" ON "lux_programs"("organization_id");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_orders_confirmation_code_key" ON "lux_orders"("confirmation_code");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_orders_pay_token_key" ON "lux_orders"("pay_token");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_order_org" ON "lux_orders"("organization_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_order_household" ON "lux_orders"("household_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_registration_org" ON "lux_program_registrations"("organization_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_registration_household" ON "lux_program_registrations"("household_id");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_program_registrations_program_id_child_id_key" ON "lux_program_registrations"("program_id", "child_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_requirement_program" ON "lux_document_requirements"("program_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_submission_org" ON "lux_document_submissions"("organization_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_submission_household" ON "lux_document_submissions"("household_id");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_document_submissions_requirement_id_program_registratio_key" ON "lux_document_submissions"("requirement_id", "program_registration_id");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_magic_links_token_hash_key" ON "lux_magic_links"("token_hash");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_magic_link_household" ON "lux_magic_links"("household_id", "created_at");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "lux_family_sessions_token_hash_key" ON "lux_family_sessions"("token_hash");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_family_session_household" ON "lux_family_sessions"("household_id");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_audit_org" ON "lux_audit_logs"("organization_id", "created_at");
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS "idx_lux_audit_action_ip" ON "lux_audit_logs"("action", "ip", "created_at");
COMMIT;

BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_public_slug_key" ON "organizations"("public_slug");
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_ticket_options_event_id_fkey') THEN
    ALTER TABLE "event_ticket_options" ADD CONSTRAINT "event_ticket_options_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_ticket_options_organization_id_fkey') THEN
    ALTER TABLE "event_ticket_options" ADD CONSTRAINT "event_ticket_options_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_households_organization_id_fkey') THEN
    ALTER TABLE "lux_households" ADD CONSTRAINT "lux_households_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_children_household_id_fkey') THEN
    ALTER TABLE "lux_children" ADD CONSTRAINT "lux_children_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "lux_households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_children_organization_id_fkey') THEN
    ALTER TABLE "lux_children" ADD CONSTRAINT "lux_children_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_programs_organization_id_fkey') THEN
    ALTER TABLE "lux_programs" ADD CONSTRAINT "lux_programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_orders_organization_id_fkey') THEN
    ALTER TABLE "lux_orders" ADD CONSTRAINT "lux_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_orders_household_id_fkey') THEN
    ALTER TABLE "lux_orders" ADD CONSTRAINT "lux_orders_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "lux_households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_program_registrations_organization_id_fkey') THEN
    ALTER TABLE "lux_program_registrations" ADD CONSTRAINT "lux_program_registrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_program_registrations_program_id_fkey') THEN
    ALTER TABLE "lux_program_registrations" ADD CONSTRAINT "lux_program_registrations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "lux_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_program_registrations_child_id_fkey') THEN
    ALTER TABLE "lux_program_registrations" ADD CONSTRAINT "lux_program_registrations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "lux_children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_program_registrations_household_id_fkey') THEN
    ALTER TABLE "lux_program_registrations" ADD CONSTRAINT "lux_program_registrations_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "lux_households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_program_registrations_order_id_fkey') THEN
    ALTER TABLE "lux_program_registrations" ADD CONSTRAINT "lux_program_registrations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "lux_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_requirements_organization_id_fkey') THEN
    ALTER TABLE "lux_document_requirements" ADD CONSTRAINT "lux_document_requirements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_requirements_program_id_fkey') THEN
    ALTER TABLE "lux_document_requirements" ADD CONSTRAINT "lux_document_requirements_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "lux_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_submissions_organization_id_fkey') THEN
    ALTER TABLE "lux_document_submissions" ADD CONSTRAINT "lux_document_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_submissions_requirement_id_fkey') THEN
    ALTER TABLE "lux_document_submissions" ADD CONSTRAINT "lux_document_submissions_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "lux_document_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_submissions_program_registration_id_fkey') THEN
    ALTER TABLE "lux_document_submissions" ADD CONSTRAINT "lux_document_submissions_program_registration_id_fkey" FOREIGN KEY ("program_registration_id") REFERENCES "lux_program_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_submissions_child_id_fkey') THEN
    ALTER TABLE "lux_document_submissions" ADD CONSTRAINT "lux_document_submissions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "lux_children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_document_submissions_household_id_fkey') THEN
    ALTER TABLE "lux_document_submissions" ADD CONSTRAINT "lux_document_submissions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "lux_households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_magic_links_organization_id_fkey') THEN
    ALTER TABLE "lux_magic_links" ADD CONSTRAINT "lux_magic_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_magic_links_household_id_fkey') THEN
    ALTER TABLE "lux_magic_links" ADD CONSTRAINT "lux_magic_links_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "lux_households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_family_sessions_organization_id_fkey') THEN
    ALTER TABLE "lux_family_sessions" ADD CONSTRAINT "lux_family_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_family_sessions_household_id_fkey') THEN
    ALTER TABLE "lux_family_sessions" ADD CONSTRAINT "lux_family_sessions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "lux_households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lux_audit_logs_organization_id_fkey') THEN
    ALTER TABLE "lux_audit_logs" ADD CONSTRAINT "lux_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;

-- Not Lux, same reason: answers from the Get Started form
BEGIN;
ALTER TABLE "organization_onboarding_requests" ADD COLUMN IF NOT EXISTS "needs" JSONB;
COMMIT;
