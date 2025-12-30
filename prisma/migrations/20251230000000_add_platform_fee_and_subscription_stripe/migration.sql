-- Add platform fee and Stripe subscription fields

-- Add Stripe subscription fields to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255) UNIQUE;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR(255) UNIQUE;

-- Add platform fee tracking to payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_transfer_id" VARCHAR(255);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "platform_fee_amount" DECIMAL(10, 2);
