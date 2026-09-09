-- Support collecting an organization's card payments into the platform's own
-- Stripe account (instead of a Connect destination charge) when the org can't
-- or won't complete Stripe Connect onboarding. Amounts owed to the org are then
-- settled manually (check/ACH/wire) and recorded in platform_payouts.

-- Enum for how a manual platform payout was made
DO $$ BEGIN
  CREATE TYPE "PlatformPayoutMethod" AS ENUM ('check', 'ach', 'wire', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Org-level opt-in flag
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "use_platform_stripe_account" BOOLEAN NOT NULL DEFAULT false;

-- Tags each payment with how it was actually collected, independent of the
-- org's current setting, so history stays accurate if the flag changes later
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "collected_by_platform" BOOLEAN NOT NULL DEFAULT false;

-- Ledger of manual payouts settling up platform-collected orgs
CREATE TABLE IF NOT EXISTS "platform_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "method" "PlatformPayoutMethod" NOT NULL DEFAULT 'check',
    "check_number" VARCHAR(50),
    "period_start" TIMESTAMPTZ(6),
    "period_end" TIMESTAMPTZ(6),
    "notes" TEXT,
    "processed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "platform_payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_platform_payout_org" ON "platform_payouts"("organization_id");

ALTER TABLE "platform_payouts"
  ADD CONSTRAINT "platform_payouts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "platform_payouts"
  ADD CONSTRAINT "platform_payouts_processed_by_user_id_fkey"
  FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
