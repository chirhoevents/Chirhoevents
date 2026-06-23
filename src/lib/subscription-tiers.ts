/**
 * Centralized Subscription Tier Configuration
 *
 * This file is the single source of truth for all subscription tier information.
 * Update this file to change pricing, features, or limits across the entire application.
 */

export type SubscriptionTierKey = 'chapel' | 'parish' | 'cathedral' | 'shrine' | 'basilica' | 'test';

// Legacy tier keys that may still appear in old data or external integrations.
// At read time they are normalized via TIER_KEY_MIGRATION.
export type LegacySubscriptionTierKey = 'starter' | 'small_diocese' | 'growing' | 'conference' | 'enterprise';

export interface SubscriptionTier {
  key: SubscriptionTierKey;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number | null; // null if no annual option
  setupFee: number | null; // null = custom (Basilica)
  setupFeeLabel: 'Basic Access Fee' | 'Setup Fee' | 'Custom';
  isSelfServe: boolean; // true = no onboarding call included
  includesSetupCall: boolean; // true = includes 1-hour setup phone call
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
  chapel: {
    key: 'chapel',
    name: 'Chapel',
    description: 'Self-serve access for small parishes running a single event each year',
    monthlyPrice: 39,
    annualPrice: null, // Monthly only
    setupFee: 50,
    setupFeeLabel: 'Basic Access Fee',
    isSelfServe: true,
    includesSetupCall: false,
    eventsPerYear: 1,
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
    description: 'Self-serve access for parishes running a handful of events each year',
    monthlyPrice: 59,
    annualPrice: null, // Monthly only
    setupFee: 50,
    setupFeeLabel: 'Basic Access Fee',
    isSelfServe: true,
    includesSetupCall: false,
    eventsPerYear: 3,
    maxPeoplePerYear: 750,
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
    setupFee: 250,
    setupFeeLabel: 'Setup Fee',
    isSelfServe: false,
    includesSetupCall: true,
    eventsPerYear: 5,
    maxPeoplePerYear: 1250,
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
    setupFee: 400,
    setupFeeLabel: 'Setup Fee',
    isSelfServe: false,
    includesSetupCall: true,
    eventsPerYear: 10,
    maxPeoplePerYear: 3000,
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
    description: 'Fully custom enterprise solution for large organizations',
    monthlyPrice: 5000, // Starting annual price shown as monthly equivalent
    annualPrice: 5000, // Starting at $5,000/year - custom pricing
    setupFee: null, // Custom
    setupFeeLabel: 'Custom',
    isSelfServe: false,
    includesSetupCall: true,
    eventsPerYear: null, // Unlimited
    maxPeoplePerYear: null, // Custom
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
    includesSetupCall: false,
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
 * Get tier by key. Accepts current keys and legacy keys (normalized via TIER_KEY_MIGRATION).
 */
export function getTier(key: string): SubscriptionTier | undefined {
  const direct = SUBSCRIPTION_TIERS[key as SubscriptionTierKey];
  if (direct) return direct;
  const migrated = TIER_KEY_MIGRATION[key];
  if (migrated) return SUBSCRIPTION_TIERS[migrated];
  return undefined;
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

export type ModuleKey = 'poros' | 'salve' | 'rapha';
export type ModuleAccess = Record<ModuleKey, boolean>;

const MODULE_KEYS: ModuleKey[] = ['poros', 'salve', 'rapha'];

/**
 * Resolve the effective module access for an org.
 *
 * Rules (in order):
 *   1. If the org has an explicit true/false override for a module, that wins.
 *   2. Otherwise fall back to the tier's default for that module.
 *
 * Grandfathered Starter/Chapel orgs were seeded with explicit `true` values
 * by the 20260531000001 migration, so they keep full access regardless of
 * any future tier change. The master admin board is the single source of
 * truth for org-level overrides.
 */
export function resolveModuleAccess(
  modulesEnabled: unknown,
  tierKey: string
): ModuleAccess {
  const tier = getTier(tierKey);
  const tierDefaults: ModuleAccess = {
    poros: tier?.features.poros ?? false,
    salve: tier?.features.salve ?? false,
    rapha: tier?.features.rapha ?? false,
  };

  if (!modulesEnabled || typeof modulesEnabled !== 'object') {
    return tierDefaults;
  }

  const overrides = modulesEnabled as Record<string, unknown>;
  const result = { ...tierDefaults };
  for (const key of MODULE_KEYS) {
    if (typeof overrides[key] === 'boolean') {
      result[key] = overrides[key] as boolean;
    }
  }
  return result;
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
 * Mapping from old tier keys to new tier keys
 * Used for database migrations and backward compatibility
 */
export const TIER_KEY_MIGRATION: Record<string, SubscriptionTierKey> = {
  starter: 'chapel',
  chapel: 'chapel',
  parish: 'parish',
  cathedral: 'cathedral',
  shrine: 'shrine',
  basilica: 'basilica',
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
  chapel: {
    monthly: 'STRIPE_PRICE_CHAPEL_MONTHLY',
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
  if (eventsPerYear <= 1) return 'chapel';
  if (eventsPerYear <= 3) return 'parish';
  if (eventsPerYear <= 5) return 'cathedral';
  if (eventsPerYear <= 10) return 'shrine';
  return 'basilica';
}

/**
 * Platform fees configuration
 */
export const PLATFORM_FEES = {
  setupFee: 250, // Legacy fallback; per-tier setupFee lives on SubscriptionTier
  reactivationFee: 150,
  platformFeePercent: 1, // 1% of registrations
  stripeProcessingPercent: 2.9,
  stripeTransactionFee: 0.30,
  eventOverageFee: 50, // Per additional event over limit
  // Hourly rate charged for extra help: consultations, custom setup beyond
  // what's included in the tier, training calls, etc.
  extraHelpHourlyRate: 90,
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
