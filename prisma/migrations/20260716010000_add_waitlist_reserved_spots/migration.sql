-- Track how many event seats a 'contacted' waitlist entry is holding.
-- NULL = no reservation. On contact we reserve; on registration via token we
-- consume; on expiry / move-back-to-pending / delete we restore.

ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_spots" INTEGER;
