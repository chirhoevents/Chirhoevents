/**
 * Centralized Subscription Tier Configuration
 *
 * This file is the single source of truth for all subscription tier information.
 * Update this file to change pricing, features, or limits across the entire application.
 */

// Internal tier keys are kept as their original DB enum values for backward
// compatibility (e.g. 'starter' is the database key but renders as "Chapel").
export type SubscriptionTierKey = 'starter' | 'parish' | 'cathedral' | 'shrine' | 'basilica' | 'test';

export interface SubscriptionTier {
  key: SubscriptionTierKey;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number | null; // null if no annual option
  setupFee: number | null; // null = custom (Basilica)
  setupFeeLabel: 'Basic Access Fee' | 'Setup Fee' | 'Custom';
  isSelfServe: boolean; // true = no onboarding/configuration assistance included
  eventsPerYear: number | null; // null = unlimited
  maxPeoplePerYear: number | null; // null = unlimited
  storageGb: number;
  features: {
    poros: boolean; // Housing management
    salve: boolean; // Check-in system
    rapha: boolean; // Medical/health module
    customBranding: boolean;
    prioritySupport: boolean;
    dedicatedManager: boolean;
    apiAccess: boolean;
  };
  billingOptions: ('monthly' | 'annual')[];
  isPopular?: boolean;
  isEnterprise?: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTierKey, SubscriptionTier> = {
  starter: {
    key: 'starter',
    name: 'Chapel',
    description: 'Self-serve platform access for small parishes or technically capable users',
    monthlyPrice: 39,
    annualPrice: null, // Monthly only
    setupFee: 99,
    setupFeeLabel: 'Basic Access Fee',
    isSelfServe: true,
    eventsPerYear: 3,
    maxPeoplePerYear: 500,
    storageGb: 5,
    features: {
      poros: false,
      salve: false,
      rapha: false,
      customBranding: false,
      prioritySupport: false,
      dedicatedManager: false,
      apiAccess: false,
    },
    billingOptions: ['monthly'],
  },
  parish: {
    key: 'parish',
    name: 'Parish',
    description: 'Self-serve platform access for parishes and small diocesan programs',
    monthlyPrice: 59,
    annualPrice: null, // Monthly only
    setupFee: 199,
    setupFeeLabel: 'Basic Access Fee',
    isSelfServe: true,
    eventsPerYear: 5,
    maxPeoplePerYear: 1000,
    storageGb: 10,
    features: {
      poros: false,
      salve: false,
      rapha: false,
      customBranding: false,
      prioritySupport: false,
      dedicatedManager: false,
      apiAccess: false,
    },
    billingOptions: ['monthly'],
  },
  cathedral: {
    key: 'cathedral',
    name: 'Cathedral',
    description: 'For growing dioceses with multiple events',
    monthlyPrice: 109,
    annualPrice: 1080,
    setupFee: 349,
    setupFeeLabel: 'Setup Fee',
    isSelfServe: false,
    eventsPerYear: 10,
    maxPeoplePerYear: 2000,
    storageGb: 25,
    features: {
      poros: true,
      salve: true,
      rapha: true,
      customBranding: true,
      prioritySupport: false,
      dedicatedManager: false,
      apiAccess: false,
    },
    billingOptions: ['monthly', 'annual'],
    isPopular: true,
  },
  shrine: {
    key: 'shrine',
    name: 'Shrine',
    description: 'For large conferences and multi-event organizations',
    monthlyPrice: 159,
    annualPrice: 1908,
    setupFee: 499,
    setupFeeLabel: 'Setup Fee',
    isSelfServe: false,
    eventsPerYear: 20,
    maxPeoplePerYear: 4000,
    storageGb: 100,
    features: {
      poros: true,
      salve: true,
      rapha: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedManager: false,
      apiAccess: true,
    },
    billingOptions: ['monthly', 'annual'],
  },
  basilica: {
    key: 'basilica',
    name: 'Basilica',
    description: 'Custom enterprise solution for large organizations',
    monthlyPrice: 15000, // Starting annual price shown as monthly equivalent
    annualPrice: 15000, // Starting at $15,000/year - custom pricing
    setupFee: null, // Custom
    setupFeeLabel: 'Custom',
    isSelfServe: false,
    eventsPerYear: null, // Unlimited
    maxPeoplePerYear: 10000, // 10,000+ (customizable)
    storageGb: 500,
    features: {
      poros: true,
      salve: true,
      rapha: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedManager: true,
      apiAccess: true,
    },
    billingOptions: ['annual'], // Invoice only
    isEnterprise: true,
  },
  test: {
    key: 'test',
    name: 'Test (Free)',
    description: 'Free testing tier for development',
    monthlyPrice: 0,
    annualPrice: 0,
    setupFee: 0,
    setupFeeLabel: 'Setup Fee',
    isSelfServe: true,
    eventsPerYear: 1,
    maxPeoplePerYear: 100,
    storageGb: 1,
    features: {
      poros: true,
      salve: true,
      rapha: true,
      customBranding: false,
      prioritySupport: false,
      dedicatedManager: false,
      apiAccess: false,
    },
    billingOptions: ['monthly'],
  },
};

// Helper functions

/**
 * Get tier by key
 */
export function getTier(key: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS[key as SubscriptionTierKey];
}

/**
 * Get display name for a tier key
 */
export function getTierDisplayName(key: string): string {
  const tier = getTier(key);
  return tier?.name || key;
}

/**
 * Get all tiers as an array (excluding test)
 */
export function getPublicTiers(): SubscriptionTier[] {
  return Object.values(SUBSCRIPTION_TIERS).filter(tier => tier.key !== 'test');
}

/**
 * Get tier labels map for dropdowns
 */
export function getTierLabels(): Record<string, string> {
  return Object.fromEntries(
    Object.values(SUBSCRIPTION_TIERS).map(tier => [tier.key, tier.name])
  );
}

/**
 * Check if a tier has a specific feature
 */
export function tierHasFeature(tierKey: string, feature: keyof SubscriptionTier['features']): boolean {
  const tier = getTier(tierKey);
  return tier?.features[feature] ?? false;
}

/**
 * Check if tier has POROS (housing) access
 */
export function tierHasPoros(tierKey: string): boolean {
  return tierHasFeature(tierKey, 'poros');
}

/**
 * Check if tier has SALVE (check-in) access
 */
export function tierHasSalve(tierKey: string): boolean {
  return tierHasFeature(tierKey, 'salve');
}

/**
 * Check if tier has RAPHA (medical) access
 */
export function tierHasRapha(tierKey: string): boolean {
  return tierHasFeature(tierKey, 'rapha');
}

/**
 * Get the price for a tier based on billing cycle
 */
export function getTierPrice(tierKey: string, billingCycle: 'monthly' | 'annual'): number {
  const tier = getTier(tierKey);
  if (!tier) return 0;

  if (billingCycle === 'annual' && tier.annualPrice !== null) {
    return tier.annualPrice;
  }
  return tier.monthlyPrice;
}

/**
 * Get the setup fee for a tier (returns null for custom/Basilica)
 */
export function getTierSetupFee(tierKey: string): number | null {
  const tier = getTier(tierKey);
  return tier?.setupFee ?? null;
}

/**
 * Mapping from old tier keys to new tier keys
 * Used for database migrations and backward compatibility
 *
 * Note: 'starter' is the legacy DB enum value — display name is now "Chapel".
 * The 'chapel' key is accepted as input and routed to the 'starter' tier.
 */
export const TIER_KEY_MIGRATION: Record<string, SubscriptionTierKey> = {
  starter: 'starter',
  chapel: 'starter',
  small_diocese: 'parish',
  growing: 'cathedral',
  conference: 'shrine',
  enterprise: 'basilica',
  test: 'test',
};

/**
 * Get new tier key from old tier key
 */
export function migrateOldTierKey(oldKey: string): SubscriptionTierKey {
  return TIER_KEY_MIGRATION[oldKey] || (oldKey as SubscriptionTierKey);
}

/**
 * Environment variable names for Stripe price IDs
 */
export const STRIPE_PRICE_ENV_VARS: Record<SubscriptionTierKey, { monthly: string | null; annual: string | null }> = {
  starter: {
    monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
    annual: null, // No annual option
  },
  parish: {
    monthly: 'STRIPE_PRICE_PARISH_MONTHLY',
    annual: null, // No annual option
  },
  cathedral: {
    monthly: 'STRIPE_PRICE_CATHEDRAL_MONTHLY',
    annual: 'STRIPE_PRICE_CATHEDRAL_ANNUAL',
  },
  shrine: {
    monthly: 'STRIPE_PRICE_SHRINE_MONTHLY',
    annual: 'STRIPE_PRICE_SHRINE_ANNUAL',
  },
  basilica: {
    monthly: null, // Enterprise is invoiced
    annual: null, // Custom pricing
  },
  test: {
    monthly: null,
    annual: null,
  },
};

/**
 * Get suggested tier based on events per year
 */
export function getSuggestedTierByEvents(eventsPerYear: number): SubscriptionTierKey {
  if (eventsPerYear <= 3) return 'starter';
  if (eventsPerYear <= 5) return 'parish';
  if (eventsPerYear <= 10) return 'cathedral';
  if (eventsPerYear <= 20) return 'shrine';
  return 'basilica';
}

/**
 * Implementation & consulting packages (separate from tier subscriptions)
 */
export const CONSULTING_PACKAGES = [
  {
    key: 'self_serve',
    name: 'Self-Serve',
    price: 0,
    priceLabel: 'Free',
    description: 'Required for Chapel tier. Documentation and video walkthroughs only — no live support.',
  },
  {
    key: 'guided_setup',
    name: 'Guided Setup',
    price: 199,
    priceLabel: '$199',
    description: 'One onboarding call + we configure your first event',
  },
  {
    key: 'full_implementation',
    name: 'Full Implementation',
    price: 499,
    priceLabel: '$499',
    description: 'We build everything, train your team, and provide go-live support',
  },
] as const;

/**
 * Hourly consulting rate (1-hour minimum)
 */
export const CONSULTING_HOURLY_RATE = 75;

/**
 * Platform fees configuration.
 *
 * Note: per-tier setup/access fees are defined on each tier (see SUBSCRIPTION_TIERS).
 * The fields below are platform-wide constants.
 */
export const PLATFORM_FEES = {
  reactivationFee: 150,
  platformFeePercent: 1, // 1% of registrations
  stripeProcessingPercent: 2.9,
  stripeTransactionFee: 0.30,
  eventOverageFee: 50, // Per additional event over limit
};

/**
 * Calculate net revenue from a registration amount
 */
export function calculateNetRevenue(grossAmount: number): {
  grossAmount: number;
  stripeFee: number;
  platformFee: number;
  netAmount: number;
} {
  const stripeFee = (grossAmount * PLATFORM_FEES.stripeProcessingPercent / 100) + PLATFORM_FEES.stripeTransactionFee;
  const platformFee = grossAmount * PLATFORM_FEES.platformFeePercent / 100;
  const netAmount = grossAmount - stripeFee - platformFee;

  return {
    grossAmount,
    stripeFee: Math.round(stripeFee * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}
