-- Add Safe Environment certificate + liability form fields to
-- staff_registrations and vendor_registrations so org admins can
-- upload the cert on behalf of registrants, and so vendors can go
-- through the same liability form flow as staff.

ALTER TABLE staff_registrations
  ADD COLUMN IF NOT EXISTS safe_environment_cert_url TEXT,
  ADD COLUMN IF NOT EXISTS safe_environment_cert_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS safe_environment_cert_uploaded_by_id UUID;

ALTER TABLE vendor_registrations
  ADD COLUMN IF NOT EXISTS poros_access_code VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS liability_form_id UUID REFERENCES liability_forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS safe_environment_cert_url TEXT,
  ADD COLUMN IF NOT EXISTS safe_environment_cert_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS safe_environment_cert_uploaded_by_id UUID;

CREATE INDEX IF NOT EXISTS idx_vendor_reg_poros_code
  ON vendor_registrations(poros_access_code);
