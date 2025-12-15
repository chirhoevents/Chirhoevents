-- CreateEnum
CREATE TYPE "EditType" AS ENUM ('info_updated', 'participant_added', 'participant_removed', 'payment_updated', 'refund_processed');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('stripe', 'manual');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('participant_removed', 'group_cancellation', 'event_cancellation', 'overpayment_correction', 'emergency_illness', 'other');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "registration_edits" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "registration_type" "RegistrationType" NOT NULL,
    "edited_by_user_id" UUID NOT NULL,
    "edited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edit_type" "EditType" NOT NULL,
    "changes_made" JSONB,
    "old_total" DECIMAL(10,2),
    "new_total" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "admin_notes" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "registration_type" "RegistrationType" NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_method" "RefundMethod" NOT NULL,
    "refund_reason" "RefundReason" NOT NULL,
    "notes" TEXT,
    "processed_by_user_id" UUID NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripe_refund_id" VARCHAR(255),
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reg_edit_registration" ON "registration_edits"("registration_id");

-- CreateIndex
CREATE INDEX "idx_reg_edit_user" ON "registration_edits"("edited_by_user_id");

-- CreateIndex
CREATE INDEX "idx_reg_edit_date" ON "registration_edits"("edited_at");

-- CreateIndex
CREATE INDEX "idx_refund_registration" ON "refunds"("registration_id");

-- CreateIndex
CREATE INDEX "idx_refund_user" ON "refunds"("processed_by_user_id");

-- CreateIndex
CREATE INDEX "idx_refund_status" ON "refunds"("status");

-- AddForeignKey
ALTER TABLE "registration_edits" ADD CONSTRAINT "registration_edits_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
