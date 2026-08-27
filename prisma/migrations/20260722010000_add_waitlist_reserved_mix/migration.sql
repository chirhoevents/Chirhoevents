-- A counter-offer can hold a different group mix than what was requested,
-- so the reservation needs its own youth/chaperone/priest breakdown. When
-- the admin doesn't counter-offer, these mirror youth_count/chaperone_count/
-- priest_count on the entry.

ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_youth_count" INTEGER;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_chaperone_count" INTEGER;
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "reserved_priest_count" INTEGER;
