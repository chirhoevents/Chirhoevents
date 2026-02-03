-- Add confessions and info columns to event_settings
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_confessions_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "confessions_reconciliation_guide_url" TEXT;
ALTER TABLE "event_settings" ADD COLUMN IF NOT EXISTS "poros_info_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Create poros_confessions table
CREATE TABLE IF NOT EXISTS "poros_confessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "day" VARCHAR(50) NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20),
    "location" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poros_confessions_pkey" PRIMARY KEY ("id")
);

-- Create poros_info_items table
CREATE TABLE IF NOT EXISTS "poros_info_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'info',
    "url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poros_info_items_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_poros_confessions_event" ON "poros_confessions"("event_id");
CREATE INDEX IF NOT EXISTS "idx_poros_confessions_active" ON "poros_confessions"("is_active");
CREATE INDEX IF NOT EXISTS "idx_poros_info_items_event" ON "poros_info_items"("event_id");
CREATE INDEX IF NOT EXISTS "idx_poros_info_items_active" ON "poros_info_items"("is_active");
