-- Remove the platform-collected-payments workaround entirely. It was built so
-- an org that couldn't complete Stripe Connect onboarding could still take
-- card payments, with Chirho's own Stripe account collecting the money and
-- the org settled up later by check. It was never used for a real payment —
-- Mount 2000 (the only org this was built for) went checks-only instead — so
-- this is a clean removal, not a data migration.
--
-- Deploys apply schema changes via `prisma db push --accept-data-loss`
-- (scripts/build.sh), which reads prisma/schema.prisma directly and ignores
-- this migrations folder — this file exists for migration history only.

ALTER TABLE "platform_payouts" DROP CONSTRAINT IF EXISTS "platform_payouts_organization_id_fkey";
ALTER TABLE "platform_payouts" DROP CONSTRAINT IF EXISTS "platform_payouts_processed_by_user_id_fkey";
DROP TABLE IF EXISTS "platform_payouts";
DROP TYPE IF EXISTS "PlatformPayoutMethod";

ALTER TABLE "payments" DROP COLUMN IF EXISTS "collected_by_platform";

ALTER TABLE "organizations" DROP COLUMN IF EXISTS "use_platform_stripe_account";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "check_payment_name";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "check_payment_address";
