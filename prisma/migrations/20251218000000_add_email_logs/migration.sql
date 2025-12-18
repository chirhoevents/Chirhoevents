-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('sent', 'failed', 'bounced');

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "event_id" UUID,
    "registration_id" UUID,
    "registration_type" "RegistrationType",
    "recipient_email" VARCHAR(255) NOT NULL,
    "recipient_name" VARCHAR(255),
    "email_type" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "html_content" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_via" VARCHAR(50) NOT NULL DEFAULT 'resend',
    "sent_status" "EmailStatus" NOT NULL DEFAULT 'sent',
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_email_org" ON "email_logs"("organization_id");

-- CreateIndex
CREATE INDEX "idx_email_event" ON "email_logs"("event_id");

-- CreateIndex
CREATE INDEX "idx_email_registration" ON "email_logs"("registration_id", "registration_type");

-- CreateIndex
CREATE INDEX "idx_email_recipient" ON "email_logs"("recipient_email");

-- CreateIndex
CREATE INDEX "idx_email_sent_at" ON "email_logs"("sent_at");
