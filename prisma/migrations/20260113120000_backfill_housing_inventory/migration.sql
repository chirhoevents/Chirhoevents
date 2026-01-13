-- Backfill housing inventory fields from existing data
-- Populate inventory fields based on the group's selected housingType

-- For on_campus registrations
UPDATE group_registrations
SET on_campus_youth = youth_count,
    on_campus_chaperones = chaperone_count
WHERE housing_type = 'on_campus'
  AND on_campus_youth IS NULL;

-- For off_campus registrations
UPDATE group_registrations
SET off_campus_youth = youth_count,
    off_campus_chaperones = chaperone_count
WHERE housing_type = 'off_campus'
  AND off_campus_youth IS NULL;

-- For day_pass registrations
UPDATE group_registrations
SET day_pass_youth = youth_count,
    day_pass_chaperones = chaperone_count
WHERE housing_type = 'day_pass'
  AND day_pass_youth IS NULL;

-- Set all other housing type fields to 0 to avoid NULL issues
UPDATE group_registrations
SET on_campus_youth = COALESCE(on_campus_youth, 0),
    on_campus_chaperones = COALESCE(on_campus_chaperones, 0),
    off_campus_youth = COALESCE(off_campus_youth, 0),
    off_campus_chaperones = COALESCE(off_campus_chaperones, 0),
    day_pass_youth = COALESCE(day_pass_youth, 0),
    day_pass_chaperones = COALESCE(day_pass_chaperones, 0);
