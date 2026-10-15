-- ============================================================
-- Manually recorded payments used to store their date as UTC
-- midnight, which every US time zone displays as the day before.
-- Move them to noon UTC (what /api/admin/payments/record stores
-- now) so they show on the day the admin entered.
--
-- Only touches admin-recorded, non-Stripe rows sitting exactly on
-- UTC midnight, so running it again is a no-op.
-- ============================================================

-- Preview the rows it will change:
-- SELECT id, payment_method, processed_at FROM payments
-- WHERE processed_by_user_id IS NOT NULL
--   AND stripe_payment_intent_id IS NULL
--   AND processed_at = date_trunc('day', processed_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

UPDATE payments
SET processed_at = processed_at + INTERVAL '12 hours'
WHERE processed_by_user_id IS NOT NULL
  AND stripe_payment_intent_id IS NULL
  AND processed_at = date_trunc('day', processed_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
