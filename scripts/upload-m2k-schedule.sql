-- Delete existing schedule entries for the M2K event
DELETE FROM poros_schedule_entries WHERE event_id = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1';

-- Insert Friday schedule
INSERT INTO poros_schedule_entries (id, event_id, day, day_date, start_time, end_time, title, location, "order", created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'friday', '2025-02-07', '5:00 PM', '6:30 PM', 'Arrival / Registration', 'Various', 1, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'friday', '2025-02-07', '6:30 PM', NULL, 'ARCC Arena Opens', 'ARCC', 2, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'friday', '2025-02-07', '7:00 PM', '7:35 PM', 'Start of Program - Introductions', 'ARCC Arena', 3, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'friday', '2025-02-07', '7:40 PM', '8:20 PM', 'Keynote 1: Dr. John-Mark Miravalle', 'ARCC Arena', 4, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'friday', '2025-02-07', '8:35 PM', '9:50 PM', 'Holy Mass', 'ARCC Arena', 5, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'friday', '2025-02-07', '10:00 PM', NULL, 'Dismissal', NULL, 6, NOW(), NOW());

-- Insert Saturday schedule
INSERT INTO poros_schedule_entries (id, event_id, day, day_date, start_time, end_time, title, location, "order", created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '7:40 AM', '8:40 AM', 'On-Campus Breakfast', 'Patriot Hall', 1, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '8:30 AM', '9:00 AM', 'ARCC Arena Opens', 'ARCC', 2, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '9:00 AM', '9:30 AM', 'Start of Program', 'ARCC Arena', 3, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '9:40 AM', '10:10 AM', 'Keynote 2: Patricia Sandoval', 'ARCC Arena', 4, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '10:10 AM', '10:25 AM', 'Dismissal and Prep for Holy Mass', 'ARCC Arena', 5, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '10:25 AM', '11:45 AM', 'Holy Mass', 'ARCC Arena', 6, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '10:25 AM', '11:45 AM', '(Confirmation ONLY) Holy Mass', 'JC Chapel', 7, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '12:15 PM', '1:15 PM', 'Lunch', 'Patriot Hall', 8, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '1:30 PM', '2:30 PM', 'Breakout Sessions', 'Various', 9, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '2:30 PM', '4:20 PM', 'Group Time/Recreation', 'Various', 10, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '4:20 PM', '6:40 PM', 'Dinner', 'Patriot Hall', 11, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '6:15 PM', NULL, 'ARCC Arena Opens', 'ARCC', 12, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '6:50 PM', '7:40 PM', 'Start of Program', 'ARCC Arena', 13, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '7:40 PM', '8:00 PM', 'Break', 'ARCC Arena', 14, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '8:00 PM', '8:40 PM', 'Keynote 3: Archbishop Sample', 'ARCC Arena', 15, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '8:50 PM', '9:50 PM', 'Eucharistic Adoration', 'ARCC Arena', 16, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'saturday', '2025-02-08', '10:00 PM', NULL, 'Dismissal', NULL, 17, NOW(), NOW());

-- Insert Sunday schedule
INSERT INTO poros_schedule_entries (id, event_id, day, day_date, start_time, end_time, title, location, "order", created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'sunday', '2025-02-09', '7:40 AM', '8:40 AM', 'On-Campus Breakfast', 'Patriot Hall', 1, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'sunday', '2025-02-09', '8:30 AM', '9:00 AM', 'ARCC Arena Opens', 'ARCC', 2, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'sunday', '2025-02-09', '8:50 AM', '9:20 AM', 'Start of Program', 'ARCC Arena', 3, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'sunday', '2025-02-09', '9:25 AM', '10:05 AM', 'Keynote 4: Sr. Catherine Holum', 'ARCC Arena', 4, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'sunday', '2025-02-09', '10:40 AM', '12:10 PM', 'Holy Mass', 'ARCC Arena', 5, NOW(), NOW()),
  (gen_random_uuid(), 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1', 'sunday', '2025-02-09', '12:20 PM', NULL, 'Departure', 'All Exits', 6, NOW(), NOW());
