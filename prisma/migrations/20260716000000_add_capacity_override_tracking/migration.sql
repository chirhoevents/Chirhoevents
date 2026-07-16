-- Track admin overrides for capacity checks on waitlist invites and manual registrations

ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "overridden_by" UUID;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "overridden_at" TIMESTAMPTZ;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "override_reason" TEXT;

ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "overridden_by" UUID;
ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "overridden_at" TIMESTAMPTZ;
ALTER TABLE "individual_registrations" ADD COLUMN IF NOT EXISTS "override_reason" TEXT;

ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "overridden_by" UUID;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "overridden_at" TIMESTAMPTZ;
ALTER TABLE "group_registrations" ADD COLUMN IF NOT EXISTS "override_reason" TEXT;
