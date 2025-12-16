-- CreateEnum
CREATE TYPE "PreferredPaymentMethod" AS ENUM ('card', 'check', 'no_preference');

-- CreateEnum
CREATE TYPE "PreferredHousingType" AS ENUM ('on_campus', 'off_campus', 'day_pass', 'no_default');

-- CreateEnum
CREATE TYPE "NotificationFrequency" AS ENUM ('realtime', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "DashboardView" AS ENUM ('cards', 'list', 'detailed');

-- CreateEnum
CREATE TYPE "DateFormat" AS ENUM ('mdy', 'dmy', 'ymd');

-- CreateEnum
CREATE TYPE "TimeFormat" AS ENUM ('12h', '24h');

-- CreateEnum
CREATE TYPE "ParticipantSortOrder" AS ENUM ('name', 'age', 'type', 'form_status');

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "clerk_user_id" VARCHAR(255) NOT NULL,
    "group_registration_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    -- Account Settings
    "phone" TEXT,
    "profile_photo_url" TEXT,
    "group_name_default" TEXT,
    "parish_name_default" TEXT,
    "diocese_default" TEXT,
    "mailing_address" JSONB,
    "billing_address" JSONB,

    -- Registration Preferences
    "primary_contact_name" TEXT,
    "primary_contact_phone" TEXT,
    "primary_contact_email" TEXT,
    "secondary_contact_name" TEXT,
    "secondary_contact_phone" TEXT,
    "secondary_contact_email" TEXT,
    "preferred_payment_method" "PreferredPaymentMethod" DEFAULT 'no_preference',
    "preferred_housing_type" "PreferredHousingType" DEFAULT 'no_default',
    "special_requests_default" TEXT,

    -- Notification Settings
    "email_registration_confirmation" BOOLEAN NOT NULL DEFAULT true,
    "email_payment_received" BOOLEAN NOT NULL DEFAULT true,
    "email_payment_reminders" BOOLEAN NOT NULL DEFAULT true,
    "email_payment_overdue" BOOLEAN NOT NULL DEFAULT true,
    "email_registration_updated" BOOLEAN NOT NULL DEFAULT true,
    "email_form_completed" BOOLEAN NOT NULL DEFAULT true,
    "email_form_reminders" BOOLEAN NOT NULL DEFAULT true,
    "email_all_forms_complete" BOOLEAN NOT NULL DEFAULT true,
    "email_form_edited" BOOLEAN NOT NULL DEFAULT true,
    "email_event_announcements" BOOLEAN NOT NULL DEFAULT true,
    "email_schedule_changes" BOOLEAN NOT NULL DEFAULT true,
    "email_deadlines" BOOLEAN NOT NULL DEFAULT true,
    "email_weekly_updates" BOOLEAN NOT NULL DEFAULT false,
    "email_participant_added" BOOLEAN NOT NULL DEFAULT true,
    "email_participant_removed" BOOLEAN NOT NULL DEFAULT true,
    "email_certificate_verified" BOOLEAN NOT NULL DEFAULT true,
    "email_newsletter" BOOLEAN NOT NULL DEFAULT false,
    "email_new_events" BOOLEAN NOT NULL DEFAULT false,
    "email_tips" BOOLEAN NOT NULL DEFAULT false,
    "notification_frequency" "NotificationFrequency" NOT NULL DEFAULT 'realtime',
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" TIME,
    "quiet_hours_end" TIME,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_payment_reminders" BOOLEAN NOT NULL DEFAULT false,
    "sms_urgent_updates" BOOLEAN NOT NULL DEFAULT false,
    "sms_payment_received" BOOLEAN NOT NULL DEFAULT false,

    -- Display Preferences
    "dashboard_view" "DashboardView" NOT NULL DEFAULT 'cards',
    "date_format" "DateFormat" NOT NULL DEFAULT 'mdy',
    "time_format" "TimeFormat" NOT NULL DEFAULT '12h',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "participant_sort_order" "ParticipantSortOrder" NOT NULL DEFAULT 'name',
    "items_per_page" INTEGER NOT NULL DEFAULT 25,
    "show_age" BOOLEAN NOT NULL DEFAULT true,
    "show_gender" BOOLEAN NOT NULL DEFAULT true,
    "show_tshirt" BOOLEAN NOT NULL DEFAULT true,
    "show_form_status" BOOLEAN NOT NULL DEFAULT true,
    "show_dietary" BOOLEAN NOT NULL DEFAULT true,
    "show_allergies" BOOLEAN NOT NULL DEFAULT true,
    "show_emergency_contact" BOOLEAN NOT NULL DEFAULT false,
    "show_medical" BOOLEAN NOT NULL DEFAULT false,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 30,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "high_contrast_mode" BOOLEAN NOT NULL DEFAULT false,
    "larger_text" BOOLEAN NOT NULL DEFAULT false,
    "screen_reader_optimized" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_clerk_user_id_key" ON "user_preferences"("clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_user_prefs_clerk_user_id" ON "user_preferences"("clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_user_prefs_group_registration" ON "user_preferences"("group_registration_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_group_registration_id_fkey" FOREIGN KEY ("group_registration_id") REFERENCES "group_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
