-- Run this SQL directly against the database to add staff/vendor question types
-- This adds 'staff', 'vendor', and 'all' to the QuestionAppliesTo enum

-- Add new enum values to QuestionAppliesTo
ALTER TYPE "QuestionAppliesTo" ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE "QuestionAppliesTo" ADD VALUE IF NOT EXISTS 'vendor';
ALTER TYPE "QuestionAppliesTo" ADD VALUE IF NOT EXISTS 'all';
