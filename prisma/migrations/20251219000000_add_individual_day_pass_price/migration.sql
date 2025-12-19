-- Add individual day pass price field to event_pricing table
ALTER TABLE "event_pricing" ADD COLUMN "individual_day_pass_price" DECIMAL(10, 2);
