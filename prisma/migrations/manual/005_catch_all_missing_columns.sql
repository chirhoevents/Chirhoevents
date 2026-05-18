-- ============================================================
-- Catch-all migration: adds every column that may be missing
-- from Neon due to schema updates without corresponding
-- migration files. All statements use IF NOT EXISTS so this
-- is safe to run multiple times.
-- ============================================================

-- ============================================================
-- events table
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time VARCHAR(5);
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time VARCHAR(5);

-- ============================================================
-- event_settings table
-- ============================================================

-- Countdown settings (missed in migration 003)
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS countdown_location VARCHAR(50) DEFAULT 'hero';
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS countdown_before_open BOOLEAN DEFAULT true;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS countdown_before_close BOOLEAN DEFAULT true;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_event_countdown BOOLEAN DEFAULT false;

-- Theming / background
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS background_image_url TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#1E3A5F';
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#9C8466';
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS overlay_color VARCHAR(7) DEFAULT '#000000';
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS overlay_opacity INTEGER DEFAULT 40;

-- Waitlist
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT true;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS registration_closed_message TEXT;

-- Staff / Volunteer registration
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS staff_registration_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS staff_volunteer_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS vendor_staff_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS staff_roles JSONB;

-- Vendor registration
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS vendor_registration_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS vendor_tiers JSONB;

-- Access control
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS allow_login_when_closed BOOLEAN DEFAULT true;

-- Capacity display
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_capacity BOOLEAN DEFAULT true;

-- Per-group spot limit
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS group_spot_limit INTEGER;

-- Day pass for individual registration
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS allow_individual_day_pass BOOLEAN DEFAULT false;

-- Landing page rich content
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS faq_content TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS schedule_content TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS included_content TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS bring_content TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Contact details (migration 002 only added contact_name)
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

-- Email content toggles
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_faq_in_email BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_bring_in_email BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_schedule_in_email BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_included_in_email BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_contact_in_email BOOLEAN DEFAULT true;

-- Add-ons (up to 4)
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_1_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_1_title VARCHAR(100);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_1_description TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_1_price DECIMAL(10,2);

ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_2_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_2_title VARCHAR(100);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_2_description TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_2_price DECIMAL(10,2);

ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_3_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_3_title VARCHAR(100);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_3_description TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_3_price DECIMAL(10,2);

ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_4_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_4_title VARCHAR(100);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_4_description TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS add_on_4_price DECIMAL(10,2);

-- Coupons
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS coupons_enabled BOOLEAN DEFAULT false;

-- Option capacity tracking (housing types)
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS on_campus_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS on_campus_remaining INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS off_campus_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS off_campus_remaining INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS day_pass_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS day_pass_remaining INTEGER;

-- Option capacity tracking (room types)
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS single_room_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS single_room_remaining INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS double_room_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS double_room_remaining INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS triple_room_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS triple_room_remaining INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS quad_room_capacity INTEGER;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS quad_room_remaining INTEGER;

-- Salve welcome packet
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS salve_packet_settings JSONB;

-- Confessions
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS confessions_reconciliation_guide_url TEXT;

-- Poros sub-features
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS poros_info_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS poros_adoration_enabled BOOLEAN DEFAULT false;

-- Letter of Good Standing
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS letter_of_good_standing_method VARCHAR(50) DEFAULT 'both';
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS letter_of_good_standing_contact_name VARCHAR(255);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS letter_of_good_standing_contact_email VARCHAR(255);
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS letter_of_good_standing_instructions TEXT;
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS letter_of_good_standing_required_for JSONB DEFAULT '["priest","deacon","seminarian"]';

-- ============================================================
-- event_pricing table
-- ============================================================

-- Housing-type pricing overrides
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS on_campus_youth_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS off_campus_youth_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS day_pass_youth_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS on_campus_chaperone_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS off_campus_chaperone_price DECIMAL(10,2);

-- Individual registration pricing
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS individual_early_bird_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS individual_base_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS individual_late_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS individual_off_campus_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS individual_day_pass_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS individual_meal_package_price DECIMAL(10,2);

-- Room pricing
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS single_room_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS double_room_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS triple_room_price DECIMAL(10,2);
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS quad_room_price DECIMAL(10,2);

-- Deposit and late fee settings
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS deposit_per_person BOOLEAN DEFAULT true;
ALTER TABLE event_pricing ADD COLUMN IF NOT EXISTS late_fee_auto_apply BOOLEAN DEFAULT false;
