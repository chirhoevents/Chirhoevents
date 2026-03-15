-- Migration: Add expired and payment_failed registration statuses
-- Fix #9: Support new registration status values for webhook handlers

-- Add 'expired' and 'payment_failed' to RegistrationStatus enum
ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'payment_failed';

-- Add 'expired' to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'expired';
