-- CreateEnum
CREATE TYPE "InboundTicketStatus" AS ENUM ('open', 'in_progress', 'waiting_reply', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "InboundTicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "received_emails" (
    "id" UUID NOT NULL,
    "resend_email_id" VARCHAR(255) NOT NULL,
    "from_address" VARCHAR(500) NOT NULL,
    "to_addresses" TEXT[],
    "cc_addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc_addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" VARCHAR(1000),
    "text_body" TEXT,
    "html_body" TEXT,
    "message_id" VARCHAR(500),
    "attachments" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "received_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_forwards" (
    "id" UUID NOT NULL,
    "from_address" VARCHAR(255) NOT NULL,
    "forward_to" TEXT[],
    "create_ticket" BOOLEAN NOT NULL DEFAULT true,
    "auto_reply" BOOLEAN NOT NULL DEFAULT true,
    "auto_reply_text" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_forwards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_support_tickets" (
    "id" UUID NOT NULL,
    "ticket_number" SERIAL NOT NULL,
    "received_email_id" UUID,
    "from_email" VARCHAR(255) NOT NULL,
    "from_name" VARCHAR(255),
    "subject" VARCHAR(1000) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InboundTicketStatus" NOT NULL DEFAULT 'open',
    "priority" "InboundTicketPriority" NOT NULL DEFAULT 'normal',
    "category" VARCHAR(100),
    "assigned_to_user_id" UUID,
    "notes" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inbound_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_ticket_replies" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "user_id" UUID,
    "from_email" VARCHAR(255),
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "received_emails_resend_email_id_key" ON "received_emails"("resend_email_id");

-- CreateIndex
CREATE INDEX "idx_received_email_from" ON "received_emails"("from_address");

-- CreateIndex
CREATE INDEX "idx_received_email_created" ON "received_emails"("created_at");

-- CreateIndex
CREATE INDEX "idx_received_email_processed" ON "received_emails"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "email_forwards_from_address_key" ON "email_forwards"("from_address");

-- CreateIndex
CREATE INDEX "idx_email_forward_from" ON "email_forwards"("from_address");

-- CreateIndex
CREATE INDEX "idx_email_forward_active" ON "email_forwards"("active");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_support_tickets_ticket_number_key" ON "inbound_support_tickets"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_support_tickets_received_email_id_key" ON "inbound_support_tickets"("received_email_id");

-- CreateIndex
CREATE INDEX "idx_inbound_ticket_status" ON "inbound_support_tickets"("status");

-- CreateIndex
CREATE INDEX "idx_inbound_ticket_from" ON "inbound_support_tickets"("from_email");

-- CreateIndex
CREATE INDEX "idx_inbound_ticket_created" ON "inbound_support_tickets"("created_at");

-- CreateIndex
CREATE INDEX "idx_inbound_ticket_assigned" ON "inbound_support_tickets"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_inbound_reply_ticket" ON "inbound_ticket_replies"("ticket_id");

-- AddForeignKey
ALTER TABLE "inbound_support_tickets" ADD CONSTRAINT "inbound_support_tickets_received_email_id_fkey" FOREIGN KEY ("received_email_id") REFERENCES "received_emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_support_tickets" ADD CONSTRAINT "inbound_support_tickets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_ticket_replies" ADD CONSTRAINT "inbound_ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "inbound_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_ticket_replies" ADD CONSTRAINT "inbound_ticket_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
