-- Grandfather module access for current Starter orgs, then rename Starter -> Chapel.
--
-- Background: module access has been stored as a JSON column `modules_enabled` on
-- the organizations table. The previous read path was permissive: missing keys
-- were treated as TRUE. We are introducing a tier-aware resolver where missing
-- keys fall back to tier defaults. Under the new rules, Chapel and Parish tiers
-- have no modules by default; Cathedral, Shrine, and Basilica include all three.
--
-- To avoid silently changing access for any live org, this migration:
--   1. Materializes the previous permissive behavior into explicit JSON, so every
--      existing org keeps the effective access it had under the old resolver.
--   2. Hard-sets all three modules to TRUE for every org currently on the legacy
--      Starter tier (the guinea-pig cohort). This is the explicit grandfather
--      override required by the spec and survives any future tier change.
--   3. Migrates Starter rows to Chapel. The grandfather override above is what
--      protects them; the tier name is now just cosmetic for these orgs.
--   4. Changes the column default so newly inserted orgs do NOT receive
--      all-true; they get an empty object and the resolver falls back to tier
--      defaults at read time.

-- 1. Backfill explicit values for every existing org.
UPDATE "organizations"
SET "modules_enabled" = jsonb_build_object(
  'poros', COALESCE(("modules_enabled"->>'poros')::boolean, true),
  'salve', COALESCE(("modules_enabled"->>'salve')::boolean, true),
  'rapha', COALESCE(("modules_enabled"->>'rapha')::boolean, true)
);

-- 2. Hard grandfather override for current Starter orgs.
UPDATE "organizations"
SET "modules_enabled" = '{"poros": true, "salve": true, "rapha": true}'::jsonb
WHERE "subscription_tier" = 'starter';

-- 3. Rename Starter tier rows to Chapel.
UPDATE "organizations"
SET "subscription_tier" = 'chapel'
WHERE "subscription_tier" = 'starter';

-- 4. New orgs default to no explicit overrides; resolver uses tier defaults.
ALTER TABLE "organizations" ALTER COLUMN "modules_enabled" SET DEFAULT '{}'::jsonb;
