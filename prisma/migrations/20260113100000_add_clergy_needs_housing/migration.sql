-- Add needs_housing field to liability_forms for clergy housing needs tracking

ALTER TABLE "liability_forms" ADD COLUMN IF NOT EXISTS "needs_housing" BOOLEAN;
