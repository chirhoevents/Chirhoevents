-- CreateTable
CREATE TABLE "poros_confession_times" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "day" VARCHAR(50) NOT NULL,
    "day_date" DATE,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20),
    "location" VARCHAR(255),
    "confessor" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "poros_confession_times_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_poros_confession_times_event" ON "poros_confession_times"("event_id");
