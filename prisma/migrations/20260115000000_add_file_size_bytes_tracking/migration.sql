-- Add file_size_bytes column to liability_forms table
ALTER TABLE "liability_forms" ADD COLUMN IF NOT EXISTS "file_size_bytes" BIGINT;

-- Add file_size_bytes column to welcome_packet_inserts table
ALTER TABLE "welcome_packet_inserts" ADD COLUMN IF NOT EXISTS "file_size_bytes" BIGINT;
