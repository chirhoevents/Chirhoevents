-- Run these queries one section at a time in NEON console
-- Copy each section and run separately

-- ============================================
-- SECTION 1: Check existing tables
-- ============================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('poros_event_data_imports', 'poros_schedule_entries', 'poros_resources', 'poros_schedule_pdfs', 'small_groups', 'small_group_assignments', 'meal_groups', 'buildings', 'rooms');

-- ============================================
-- SECTION 2: Add poros_event_data_imports if missing
-- ============================================
CREATE TABLE IF NOT EXISTS poros_event_data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  json_data JSONB NOT NULL,
  file_name VARCHAR(255),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SECTION 3: Add group_registration_id to small_group_assignments
-- Run this if you get errors about the column not existing
-- ============================================
ALTER TABLE small_group_assignments
ADD COLUMN IF NOT EXISTS group_registration_id UUID REFERENCES group_registrations(id) ON DELETE CASCADE;

-- ============================================
-- SECTION 4: Add poros_schedule_entries if missing
-- ============================================
CREATE TABLE IF NOT EXISTS poros_schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SECTION 5: Add poros_resources if missing
-- ============================================
CREATE TABLE IF NOT EXISTS poros_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'link',
  url TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SECTION 6: Add room_purpose column to rooms table
-- Values: 'housing', 'small_group', 'both'
-- ============================================
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_purpose TEXT DEFAULT 'housing';

-- ============================================
-- SECTION 7: Verify your M2K event data exists
-- ============================================
SELECT
  (SELECT COUNT(*) FROM group_registrations WHERE event_id = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1') as groups,
  (SELECT COUNT(*) FROM small_groups WHERE event_id = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1') as small_groups,
  (SELECT COUNT(*) FROM meal_groups WHERE event_id = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1') as meal_groups,
  (SELECT COUNT(*) FROM buildings WHERE event_id = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1') as buildings,
  (SELECT COUNT(*) FROM rooms WHERE building_id IN (SELECT id FROM buildings WHERE event_id = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1')) as rooms;
