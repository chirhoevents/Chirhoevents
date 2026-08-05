-- All three liability form endpoints (youth-u18/initiate, youth-o18-chaperone,
-- clergy) accept a required date_of_birth from the user, but until now it was
-- destructured and discarded because no column existed to store it. Reports
-- offering "Date of Birth" therefore always rendered as "-". Store it on the
-- liability form itself since that's the only place DOB is currently
-- collected.

ALTER TABLE "liability_forms" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
