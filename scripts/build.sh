#!/bin/bash
set -e

echo "Running pre-migration cleanup..."

# Run cleanup SQL to drop orphaned constraints before prisma db push
npx prisma db execute --stdin <<EOF
-- Drop orphaned waitlist constraint if it exists
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";
DROP INDEX IF EXISTS "waitlist_entries_registration_token_key";
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "registration_token";
EOF

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "Running next build..."
npx next build
