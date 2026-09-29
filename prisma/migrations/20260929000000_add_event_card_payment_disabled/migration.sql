-- Per-event switch to turn off card payments entirely and force every
-- registration onto the check-payment path (e.g. "financial restrictions
-- this year, checks only"). Independent of the $1,000 platform-collected cap.

ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "card_payment_disabled" BOOLEAN NOT NULL DEFAULT false;
