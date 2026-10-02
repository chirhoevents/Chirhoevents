-- Optional links to an external (non-Stripe) card payment portal an org runs
-- itself (e.g. a university's own payment system), surfaced on the group
-- leader portal as a card alternative when an event has cardPaymentDisabled
-- set. Chirho never processes these payments; staff record them manually
-- after the org notifies them, same as any other check/cash payment.

ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_deposit_payment_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_deposit_payment_note" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_balance_payment_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "external_balance_payment_note" TEXT;
