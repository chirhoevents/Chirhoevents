#!/bin/bash
set -e

echo "=== Build Script Starting ==="

echo "Running pre-migration cleanup..."

# Create a temp SQL file for the cleanup
cat > /tmp/cleanup.sql << 'SQLEOF'
-- Drop orphaned waitlist constraint if it exists
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_registration_token_key";
DROP INDEX IF EXISTS "waitlist_entries_registration_token_key";
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "registration_token";
SQLEOF

# Run cleanup SQL - continue even if it fails (constraint might not exist)
echo "Executing cleanup SQL..."
npx prisma db execute --file /tmp/cleanup.sql --schema prisma/schema.prisma || echo "Cleanup SQL completed (some statements may have been skipped)"

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "Running next build..."
npx next build

echo "=== Build Script Complete ==="
