-- ============================================
-- POROS PORTAL - DATABASE MIGRATION
-- Run this SQL file in your NEON database console
-- ============================================

-- ============================================
-- PART 1: UPDATE EVENT_SETTINGS TABLE
-- ============================================

-- Add Poros feature toggles to event_settings
ALTER TABLE event_settings
ADD COLUMN IF NOT EXISTS poros_housing_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_seating_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_small_groups_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_meal_groups_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_public_portal_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_capacity_override_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_allow_partial_room_fills BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_auto_balance_rooms BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_public_portal_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_show_roommate_names BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_show_small_group_members BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_show_sgl_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_notify_on_assignment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poros_notify_on_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS poros_send_welcome_email BOOLEAN DEFAULT false;

-- ============================================
-- PART 2: BUILDINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'mixed')),
  housing_type TEXT NOT NULL CHECK (housing_type IN ('youth_u18', 'chaperone_18plus', 'clergy', 'general')),
  total_floors INTEGER DEFAULT 1,
  total_rooms INTEGER DEFAULT 0,
  total_beds INTEGER DEFAULT 0,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_event ON buildings(event_id);

-- ============================================
-- PART 3: ROOMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  bed_count INTEGER NOT NULL DEFAULT 2,
  room_type TEXT CHECK (room_type IN ('single', 'double', 'triple', 'quad', 'custom')),
  gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  housing_type TEXT CHECK (housing_type IN ('youth_u18', 'chaperone_18plus', 'clergy', 'general')),
  capacity INTEGER NOT NULL,
  current_occupancy INTEGER DEFAULT 0,
  notes TEXT,
  is_available BOOLEAN DEFAULT true,
  is_ada_accessible BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_available ON rooms(is_available);
CREATE INDEX IF NOT EXISTS idx_rooms_gender ON rooms(gender);

-- ============================================
-- PART 4: ROOM ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  individual_registration_id UUID REFERENCES individual_registrations(id) ON DELETE CASCADE,
  group_registration_id UUID REFERENCES group_registrations(id) ON DELETE SET NULL,
  bed_number INTEGER,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  notes TEXT,
  CHECK (
    (participant_id IS NOT NULL AND individual_registration_id IS NULL) OR
    (participant_id IS NULL AND individual_registration_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_room ON room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_participant ON room_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_individual ON room_assignments(individual_registration_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_group ON room_assignments(group_registration_id);

-- ============================================
-- PART 5: SEATING SECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS seating_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section_code TEXT,
  color TEXT DEFAULT '#1E3A5F',
  capacity INTEGER DEFAULT 100,
  current_occupancy INTEGER DEFAULT 0,
  location_description TEXT,
  public_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seating_sections_event ON seating_sections(event_id);

-- ============================================
-- PART 6: SEATING ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS seating_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES seating_sections(id) ON DELETE CASCADE,
  group_registration_id UUID REFERENCES group_registrations(id) ON DELETE CASCADE,
  individual_registration_id UUID REFERENCES individual_registrations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  CHECK (
    (group_registration_id IS NOT NULL AND individual_registration_id IS NULL) OR
    (group_registration_id IS NULL AND individual_registration_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_seating_assignments_section ON seating_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_group ON seating_assignments(group_registration_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_individual ON seating_assignments(individual_registration_id);

-- ============================================
-- PART 7: STAFF TABLE (SGLs, Seminarians, Clergy)
-- ============================================

CREATE TABLE IF NOT EXISTS poros_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  staff_type TEXT NOT NULL CHECK (staff_type IN ('sgl', 'co_sgl', 'seminarian', 'priest', 'deacon', 'religious', 'counselor', 'volunteer', 'other')),
  gender TEXT CHECK (gender IN ('male', 'female')),
  diocese TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poros_staff_event ON poros_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_poros_staff_type ON poros_staff(staff_type);

-- ============================================
-- PART 8: SMALL GROUPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS small_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_number INTEGER,
  sgl_id UUID REFERENCES poros_staff(id) ON DELETE SET NULL,
  co_sgl_id UUID REFERENCES poros_staff(id) ON DELETE SET NULL,
  meeting_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  meeting_time TEXT,
  meeting_place TEXT,
  capacity INTEGER DEFAULT 12,
  current_size INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_small_groups_event ON small_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_small_groups_sgl ON small_groups(sgl_id);

-- ============================================
-- PART 9: SMALL GROUP ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS small_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  small_group_id UUID NOT NULL REFERENCES small_groups(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  individual_registration_id UUID REFERENCES individual_registrations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  CHECK (
    (participant_id IS NOT NULL AND individual_registration_id IS NULL) OR
    (participant_id IS NULL AND individual_registration_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_small_group_assignments_group ON small_group_assignments(small_group_id);
CREATE INDEX IF NOT EXISTS idx_small_group_assignments_participant ON small_group_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_small_group_assignments_individual ON small_group_assignments(individual_registration_id);

-- ============================================
-- PART 10: MEAL GROUPS TABLE (Color-coded meal times)
-- ============================================

CREATE TABLE IF NOT EXISTS meal_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  breakfast_time TEXT,
  lunch_time TEXT,
  dinner_time TEXT,
  capacity INTEGER DEFAULT 100,
  current_size INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_groups_event ON meal_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_meal_groups_active ON meal_groups(is_active);

-- ============================================
-- PART 11: MEAL GROUP ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS meal_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_group_id UUID NOT NULL REFERENCES meal_groups(id) ON DELETE CASCADE,
  group_registration_id UUID REFERENCES group_registrations(id) ON DELETE CASCADE,
  individual_registration_id UUID REFERENCES individual_registrations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  CHECK (
    (group_registration_id IS NOT NULL AND individual_registration_id IS NULL) OR
    (group_registration_id IS NULL AND individual_registration_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_meal_group_assignments_group ON meal_group_assignments(meal_group_id);
CREATE INDEX IF NOT EXISTS idx_meal_group_assignments_reg ON meal_group_assignments(group_registration_id);

-- ============================================
-- PART 12: ADA INDIVIDUALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ada_individuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  individual_registration_id UUID REFERENCES individual_registrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  accessibility_need TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ada_individuals_event ON ada_individuals(event_id);
CREATE INDEX IF NOT EXISTS idx_ada_individuals_room ON ada_individuals(room_id);

-- ============================================
-- PART 13: UPDATE INDIVIDUAL_REGISTRATIONS TABLE
-- ============================================

-- Add roommate preference fields
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS preferred_roommate_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_roommate_email TEXT;

-- ============================================
-- PART 14: CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seating_sections_updated_at ON seating_sections;
CREATE TRIGGER update_seating_sections_updated_at
    BEFORE UPDATE ON seating_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_poros_staff_updated_at ON poros_staff;
CREATE TRIGGER update_poros_staff_updated_at
    BEFORE UPDATE ON poros_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_small_groups_updated_at ON small_groups;
CREATE TRIGGER update_small_groups_updated_at
    BEFORE UPDATE ON small_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ada_individuals_updated_at ON ada_individuals;
CREATE TRIGGER update_ada_individuals_updated_at
    BEFORE UPDATE ON ada_individuals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run this SQL in your NEON database console
-- After running, update your Prisma schema and run:
-- npx prisma db pull
-- npx prisma generate
