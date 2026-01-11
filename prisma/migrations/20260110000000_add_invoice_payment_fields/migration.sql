-- Add payment token and Stripe fields to invoices table
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_token" VARCHAR(64);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" VARCHAR(255);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" VARCHAR(255);

-- Create unique index on payment_token
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_payment_token_key" ON "invoices"("payment_token");

-- Create index for faster payment token lookups
CREATE INDEX IF NOT EXISTS "idx_invoice_payment_token" ON "invoices"("payment_token");
