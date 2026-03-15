-- Migration: Add organizationId to registration_edits and refunds tables (Fix #11)

-- Add organizationId to registration_edits
ALTER TABLE registration_edits
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill registration_edits via group_registrations
UPDATE registration_edits re
SET organization_id = gr.organization_id
FROM group_registrations gr
WHERE re.registration_id = gr.id
  AND re.registration_type = 'group'
  AND re.organization_id IS NULL;

-- Backfill registration_edits via individual_registrations
UPDATE registration_edits re
SET organization_id = ir.organization_id
FROM individual_registrations ir
WHERE re.registration_id = ir.id
  AND re.registration_type = 'individual'
  AND re.organization_id IS NULL;

-- Make NOT NULL after backfill (comment out if any rows remain null due to missing registrations)
-- ALTER TABLE registration_edits ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reg_edit_org ON registration_edits(organization_id);

-- Add organizationId to refunds
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill refunds via group_registrations
UPDATE refunds r
SET organization_id = gr.organization_id
FROM group_registrations gr
WHERE r.registration_id = gr.id
  AND r.registration_type = 'group'
  AND r.organization_id IS NULL;

-- Backfill refunds via individual_registrations
UPDATE refunds r
SET organization_id = ir.organization_id
FROM individual_registrations ir
WHERE r.registration_id = ir.id
  AND r.registration_type = 'individual'
  AND r.organization_id IS NULL;

-- Make NOT NULL after backfill (comment out if any rows remain null due to missing registrations)
-- ALTER TABLE refunds ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_org ON refunds(organization_id);
