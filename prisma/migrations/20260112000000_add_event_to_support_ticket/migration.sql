-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN "event_id" UUID;

-- CreateIndex
CREATE INDEX "idx_support_ticket_event" ON "support_tickets"("event_id");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
