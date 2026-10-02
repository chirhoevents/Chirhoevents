-- Permanently removes the two test group registrations made against
-- Mount 2000 Youth Retreat 2027:
--   M22000-TESTEVEN-L1GW  ("test event", 7 participants)
--   M22000-TEST2-TGLG     ("test 2", 5 participants)
--
-- Step 0: in the admin dashboard, open each registration and click Cancel.
--         That restores event / housing capacity. This script only purges
--         rows that are already cancelled (cancelled_at IS NOT NULL).
-- Step 1: run the SELECT alone in the Neon console and check the rows.
-- Step 2: run the BEGIN … COMMIT block.

-- ───────────── Step 1: preview ─────────────
SELECT gr.id, gr.access_code, gr.group_name, gr.group_leader_email,
       gr.total_participants, gr.cancelled_at, e.name AS event
FROM group_registrations gr
JOIN events e ON e.id = gr.event_id
WHERE gr.access_code IN ('M22000-TESTEVEN-L1GW', 'M22000-TEST2-TGLG');

-- ───────────── Step 2: delete ─────────────
BEGIN;

CREATE TEMP TABLE _del_groups ON COMMIT DROP AS
  SELECT id FROM group_registrations
  WHERE access_code IN ('M22000-TESTEVEN-L1GW', 'M22000-TEST2-TGLG')
    AND cancelled_at IS NOT NULL;

CREATE TEMP TABLE _del_participants ON COMMIT DROP AS
  SELECT id FROM participants WHERE group_registration_id IN (SELECT id FROM _del_groups);

CREATE TEMP TABLE _del_forms ON COMMIT DROP AS
  SELECT id FROM liability_forms
  WHERE group_registration_id IN (SELECT id FROM _del_groups)
     OR participant_id IN (SELECT id FROM _del_participants);

-- Rows hanging off participants / liability forms
DELETE FROM safe_environment_certificates
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR liability_form_id IN (SELECT id FROM _del_forms);
DELETE FROM letters_of_good_standing
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR liability_form_id IN (SELECT id FROM _del_forms);
DELETE FROM medical_incidents
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR liability_form_id IN (SELECT id FROM _del_forms);
DELETE FROM ada_individuals WHERE participant_id IN (SELECT id FROM _del_participants);

-- Rows keyed by participant or group
DELETE FROM survey_recipients
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM room_assignments
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM small_group_assignments
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM check_in_logs
  WHERE participant_id IN (SELECT id FROM _del_participants)
     OR group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM liability_forms WHERE id IN (SELECT id FROM _del_forms);
DELETE FROM participants WHERE id IN (SELECT id FROM _del_participants);

-- Rows keyed by group only
DELETE FROM seating_assignments    WHERE group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM group_staff_assignments WHERE group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM meal_group_assignments WHERE group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM meal_color_assignments WHERE group_registration_id IN (SELECT id FROM _del_groups);
DELETE FROM user_preferences       WHERE group_registration_id IN (SELECT id FROM _del_groups);

-- Money, emails, audit trail (registration_id is the group's id)
DELETE FROM billing_notes
  WHERE payment_id IN (SELECT id FROM payments WHERE registration_id IN (SELECT id FROM _del_groups));
DELETE FROM refunds                     WHERE registration_id IN (SELECT id FROM _del_groups);
DELETE FROM coupon_redemptions          WHERE registration_id IN (SELECT id FROM _del_groups);
DELETE FROM payments                    WHERE registration_id IN (SELECT id FROM _del_groups);
DELETE FROM payment_balances            WHERE registration_id IN (SELECT id FROM _del_groups);
DELETE FROM custom_registration_answers WHERE registration_id IN (SELECT id FROM _del_groups);
DELETE FROM email_logs                  WHERE registration_id IN (SELECT id FROM _del_groups);
DELETE FROM registration_edits          WHERE registration_id IN (SELECT id FROM _del_groups);

DELETE FROM group_registrations WHERE id IN (SELECT id FROM _del_groups);

COMMIT;
