-- =====================================================
-- QUERY 1: AdaIndividual table (all records, with room info)
-- =====================================================
SELECT
  '--- ADA INDIVIDUALS TABLE ---' AS section;

SELECT
  ai.name,
  ai.gender,
  ai.accessibility_need,
  ai.notes,
  r.name AS room_name,
  r.room_number
FROM ada_individuals ai
LEFT JOIN rooms r ON r.id = ai.room_id
ORDER BY ai.name;

-- =====================================================
-- QUERY 2: LiabilityForm with ADA accommodations
-- =====================================================
SELECT
  '--- LIABILITY FORMS WITH ADA ACCOMMODATIONS ---' AS section;

SELECT
  lf.participant_first_name || ' ' || lf.participant_last_name AS participant_name,
  lf.participant_type,
  lf.participant_age,
  lf.participant_gender,
  o.name AS organization,
  gr.church_name,
  lf.ada_accommodations,
  lf.form_status,
  lf.completed_at
FROM liability_forms lf
LEFT JOIN organizations o ON o.id = lf.organization_id
LEFT JOIN group_registrations gr ON gr.id = lf.group_registration_id
WHERE lf.ada_accommodations IS NOT NULL
  AND lf.ada_accommodations != ''
  AND TRIM(lf.ada_accommodations) != ''
ORDER BY lf.participant_last_name, lf.participant_first_name;

-- =====================================================
-- QUERY 3: IndividualRegistration with ADA accommodations
-- =====================================================
SELECT
  '--- INDIVIDUAL REGISTRATIONS WITH ADA ACCOMMODATIONS ---' AS section;

SELECT
  ir.first_name || ' ' || ir.last_name AS participant_name,
  ir.preferred_name,
  ir.email,
  ir.phone,
  ir.gender,
  o.name AS organization,
  ir.ada_accommodations,
  ir.registration_status,
  ir.registered_at
FROM individual_registrations ir
LEFT JOIN organizations o ON o.id = ir.organization_id
WHERE ir.ada_accommodations IS NOT NULL
  AND ir.ada_accommodations != ''
  AND TRIM(ir.ada_accommodations) != ''
ORDER BY ir.last_name, ir.first_name;

-- =====================================================
-- COMBINED SUMMARY: All people with ADA needs
-- =====================================================
SELECT
  '--- COMBINED ADA NEEDS SUMMARY ---' AS section;

SELECT name, source, organization, church, accommodation FROM (
  -- From AdaIndividual table
  SELECT
    ai.name,
    'ADA Individual Record' AS source,
    NULL AS organization,
    NULL AS church,
    ai.accessibility_need AS accommodation
  FROM ada_individuals ai

  UNION ALL

  -- From LiabilityForm
  SELECT
    lf.participant_first_name || ' ' || lf.participant_last_name AS name,
    'Liability Form' AS source,
    o.name AS organization,
    gr.church_name AS church,
    lf.ada_accommodations AS accommodation
  FROM liability_forms lf
  LEFT JOIN organizations o ON o.id = lf.organization_id
  LEFT JOIN group_registrations gr ON gr.id = lf.group_registration_id
  WHERE lf.ada_accommodations IS NOT NULL
    AND lf.ada_accommodations != ''
    AND TRIM(lf.ada_accommodations) != ''

  UNION ALL

  -- From IndividualRegistration
  SELECT
    ir.first_name || ' ' || ir.last_name AS name,
    'Individual Registration' AS source,
    o.name AS organization,
    NULL AS church,
    ir.ada_accommodations AS accommodation
  FROM individual_registrations ir
  LEFT JOIN organizations o ON o.id = ir.organization_id
  WHERE ir.ada_accommodations IS NOT NULL
    AND ir.ada_accommodations != ''
    AND TRIM(ir.ada_accommodations) != ''
) combined
ORDER BY name;
