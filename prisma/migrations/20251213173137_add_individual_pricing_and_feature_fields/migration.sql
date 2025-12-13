-- AddColumn: tshirtsEnabled and individualMealsEnabled to event_settings
ALTER TABLE "event_settings" ADD COLUMN "tshirts_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN "individual_meals_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn: Individual pricing fields to event_pricing
ALTER TABLE "event_pricing" ADD COLUMN "individual_base_price" DECIMAL(10,2);
ALTER TABLE "event_pricing" ADD COLUMN "single_room_price" DECIMAL(10,2);
ALTER TABLE "event_pricing" ADD COLUMN "double_room_price" DECIMAL(10,2);
ALTER TABLE "event_pricing" ADD COLUMN "triple_room_price" DECIMAL(10,2);
ALTER TABLE "event_pricing" ADD COLUMN "quad_room_price" DECIMAL(10,2);
ALTER TABLE "event_pricing" ADD COLUMN "individual_off_campus_price" DECIMAL(10,2);
ALTER TABLE "event_pricing" ADD COLUMN "individual_meal_package_price" DECIMAL(10,2);
