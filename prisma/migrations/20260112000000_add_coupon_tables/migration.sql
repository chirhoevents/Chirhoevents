-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed_amount');

-- CreateEnum
CREATE TYPE "UsageLimitType" AS ENUM ('unlimited', 'single_use', 'limited');

-- CreateEnum
CREATE TYPE "CouponRegistrationType" AS ENUM ('group', 'individual', 'staff', 'vendor');

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "event_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" "DiscountType" NOT NULL DEFAULT 'percentage',
    "discount_value" DECIMAL(10,2) NOT NULL,
    "usage_limit_type" "UsageLimitType" NOT NULL DEFAULT 'unlimited',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "is_stackable" BOOLEAN NOT NULL DEFAULT false,
    "restrict_to_email" VARCHAR(255),
    "expiration_date" TIMESTAMPTZ(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "registration_type" "CouponRegistrationType" NOT NULL,
    "discount_applied" DECIMAL(10,2) NOT NULL,
    "redeemed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_coupon_org" ON "coupons"("organization_id");

-- CreateIndex
CREATE INDEX "idx_coupon_event" ON "coupons"("event_id");

-- CreateIndex
CREATE INDEX "idx_coupon_code" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupon_active" ON "coupons"("active");

-- CreateIndex
CREATE UNIQUE INDEX "unique_coupon_code_per_event" ON "coupons"("event_id", "code");

-- CreateIndex
CREATE INDEX "idx_redemption_coupon" ON "coupon_redemptions"("coupon_id");

-- CreateIndex
CREATE INDEX "idx_redemption_registration" ON "coupon_redemptions"("registration_id");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
