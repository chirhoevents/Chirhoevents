-- Add 'chapel' to the SubscriptionTier enum. Starter is being renamed to Chapel.
--
-- This must be a separate migration from any migration that USES the new value,
-- because PostgreSQL requires ALTER TYPE ... ADD VALUE to commit before the new
-- value can be referenced (e.g. in an UPDATE).

ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'chapel';
