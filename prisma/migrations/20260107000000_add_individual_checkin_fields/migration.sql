-- Add check-in fields to individual_registrations table
ALTER TABLE individual_registrations
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS checked_in_by UUID,
ADD COLUMN IF NOT EXISTS check_in_station VARCHAR(100),
ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

-- Add individual_registration_id column to check_in_logs table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'check_in_logs'
        AND column_name = 'individual_registration_id'
    ) THEN
        ALTER TABLE check_in_logs
        ADD COLUMN individual_registration_id UUID REFERENCES individual_registrations(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_check_in_log_individual ON check_in_logs(individual_registration_id);
    END IF;
END $$;
