-- AlterTable
ALTER TABLE "individual_registrations" ADD COLUMN "confirmation_code" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "individual_registrations_confirmation_code_key" ON "individual_registrations"("confirmation_code");

-- CreateIndex
CREATE INDEX "idx_individual_confirmation_code" ON "individual_registrations"("confirmation_code");
