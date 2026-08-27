-- Soft-delete columns for registration cancellation. Adds a nullable
-- cancelledAt timestamp on both group and individual registrations so
-- the admin can cancel (freeing capacity, keeping the record) without
-- hard-deleting payment history, liability forms, or participants.
-- Filters on cancelledAt IS NULL exclude cancelled rows from bulk email,
-- default registration lists, and reports.

ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" UUID;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ;
ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" UUID;
ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

CREATE INDEX IF NOT EXISTS "idx_group_reg_cancelled" ON "group_registrations" ("cancelled_at");
CREATE INDEX IF NOT EXISTS "idx_individual_reg_cancelled" ON "individual_registrations" ("cancelled_at");
