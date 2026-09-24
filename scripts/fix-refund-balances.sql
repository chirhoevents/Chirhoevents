-- SQL twin of scripts/fix-refund-balances.ts for running in the Neon console.
-- Clears phantom balances left by the old refund flow: recomputes
-- amount_remaining = max(0, total − paid) and payment_status for rows whose
-- stored balance disagrees with that, or that have a refund recorded.
--
-- Step 1: run the SELECT alone and check the rows it lists.
-- Step 2: run the BEGIN … COMMIT block.

-- ───────────── Step 1: preview ─────────────
WITH calc AS (
  SELECT
    pb.id,
    COALESCE(gr.group_name, pb.registration_id::text) AS registration,
    pb.total_amount_due AS total,
    pb.amount_paid AS paid,
    pb.amount_remaining AS old_balance,
    pb.payment_status::text AS old_status,
    GREATEST(0, pb.total_amount_due - pb.amount_paid) AS new_balance,
    CASE
      WHEN pb.amount_paid <= 0 THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM refunds r WHERE r.registration_id = pb.registration_id) THEN 'refunded'
          WHEN pb.payment_status::text IN ('pending_check_payment', 'refunded') THEN pb.payment_status::text
          ELSE 'unpaid'
        END
      WHEN pb.amount_paid > pb.total_amount_due THEN 'overpaid'
      WHEN pb.total_amount_due - pb.amount_paid <= 0 THEN 'paid_full'
      ELSE 'partial'
    END AS new_status,
    EXISTS (SELECT 1 FROM refunds r WHERE r.registration_id = pb.registration_id) AS has_refund
  FROM payment_balances pb
  LEFT JOIN group_registrations gr ON gr.id = pb.registration_id
)
SELECT registration, total, paid, old_balance, new_balance, old_status, new_status
FROM calc
WHERE (old_balance <> new_balance OR has_refund)
  AND (old_balance <> new_balance OR old_status <> new_status)
ORDER BY registration;

-- ───────────── Step 2: apply ─────────────
BEGIN;

WITH calc AS (
  SELECT
    pb.id,
    pb.amount_remaining AS old_balance,
    pb.payment_status::text AS old_status,
    GREATEST(0, pb.total_amount_due - pb.amount_paid) AS new_balance,
    CASE
      WHEN pb.amount_paid <= 0 THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM refunds r WHERE r.registration_id = pb.registration_id) THEN 'refunded'
          WHEN pb.payment_status::text IN ('pending_check_payment', 'refunded') THEN pb.payment_status::text
          ELSE 'unpaid'
        END
      WHEN pb.amount_paid > pb.total_amount_due THEN 'overpaid'
      WHEN pb.total_amount_due - pb.amount_paid <= 0 THEN 'paid_full'
      ELSE 'partial'
    END AS new_status,
    EXISTS (SELECT 1 FROM refunds r WHERE r.registration_id = pb.registration_id) AS has_refund
  FROM payment_balances pb
)
UPDATE payment_balances pb
SET amount_remaining = calc.new_balance,
    payment_status   = calc.new_status::"PaymentBalanceStatus",
    updated_at       = NOW()
FROM calc
WHERE pb.id = calc.id
  AND (calc.old_balance <> calc.new_balance OR calc.has_refund)
  AND (calc.old_balance <> calc.new_balance OR calc.old_status <> calc.new_status);

COMMIT;
