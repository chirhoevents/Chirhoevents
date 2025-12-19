-- Add room type configuration fields to event_settings table
ALTER TABLE "event_settings" ADD COLUMN "allow_single_room" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_settings" ADD COLUMN "allow_double_room" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_settings" ADD COLUMN "allow_triple_room" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_settings" ADD COLUMN "allow_quad_room" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_settings" ADD COLUMN "single_room_label" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN "double_room_label" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN "triple_room_label" VARCHAR(100);
ALTER TABLE "event_settings" ADD COLUMN "quad_room_label" VARCHAR(100);
