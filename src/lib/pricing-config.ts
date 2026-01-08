import { prisma } from '@/lib/prisma'

export interface TierFeatures {
  eventsPerYear: string
  maxPeople: string
  storageGb: string
}

export interface PricingTier {
  key: string
  name: string
  monthlyPrice: number
  annualPrice: number
  features: TierFeatures
  isPopular?: boolean
}

export interface PlatformPricing {
  tiers: PricingTier[]
  setupFee: number
  processingFeePercent: number
  platformFeePercent: number
  transactionFee: number
}

// Default pricing configuration
const DEFAULT_PRICING: PlatformPricing = {
  tiers: [
    {
      key: 'starter',
      name: 'Starter',
      monthlyPrice: 49,
      annualPrice: 490,
      features: { eventsPerYear: '3', maxPeople: '500', storageGb: '5' },
    },
    {
      key: 'small_diocese',
      name: 'Small Diocese',
      monthlyPrice: 99,
      annualPrice: 990,
      features: { eventsPerYear: '5', maxPeople: '1,000', storageGb: '10' },
    },
    {
      key: 'growing',
      name: 'Growing',
      monthlyPrice: 149,
      annualPrice: 1490,
      features: { eventsPerYear: '10', maxPeople: '3,000', storageGb: '25' },
      isPopular: true,
    },
    {
      key: 'conference',
      name: 'Conference',
      monthlyPrice: 249,
      annualPrice: 2490,
      features: { eventsPerYear: '25', maxPeople: '8,000', storageGb: '100' },
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 499,
      annualPrice: 4990,
      features: { eventsPerYear: 'Unlimited', maxPeople: 'Unlimited', storageGb: '500' },
    },
  ],
  setupFee: 250,
  processingFeePercent: 2.9,
  platformFeePercent: 1,
  transactionFee: 0.30,
}

// Fetch pricing from database with fallback to defaults
export async function getPlatformPricing(): Promise<PlatformPricing> {
  try {
    const settings = await prisma.platformSetting.findMany()

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.settingKey] = s.settingValue
    })

    // Build tiers from settings
    const tiers: PricingTier[] = [
      {
        key: 'starter',
        name: 'Starter',
        monthlyPrice: parseInt(settingsMap.starter_monthly || '49'),
        annualPrice: parseInt(settingsMap.starter_annual || '490'),
        features: {
          eventsPerYear: settingsMap.starter_events || '3',
          maxPeople: settingsMap.starter_people || '500',
          storageGb: settingsMap.starter_storage || '5',
        },
      },
      {
        key: 'small_diocese',
        name: 'Small Diocese',
        monthlyPrice: parseInt(settingsMap.small_diocese_monthly || '99'),
        annualPrice: parseInt(settingsMap.small_diocese_annual || '990'),
        features: {
          eventsPerYear: settingsMap.small_diocese_events || '5',
          maxPeople: settingsMap.small_diocese_people || '1,000',
          storageGb: settingsMap.small_diocese_storage || '10',
        },
      },
      {
        key: 'growing',
        name: 'Growing',
        monthlyPrice: parseInt(settingsMap.growing_monthly || '149'),
        annualPrice: parseInt(settingsMap.growing_annual || '1490'),
        features: {
          eventsPerYear: settingsMap.growing_events || '10',
          maxPeople: settingsMap.growing_people || '3,000',
          storageGb: settingsMap.growing_storage || '25',
        },
        isPopular: true,
      },
      {
        key: 'conference',
        name: 'Conference',
        monthlyPrice: parseInt(settingsMap.conference_monthly || '249'),
        annualPrice: parseInt(settingsMap.conference_annual || '2490'),
        features: {
          eventsPerYear: settingsMap.conference_events || '25',
          maxPeople: settingsMap.conference_people || '8,000',
          storageGb: settingsMap.conference_storage || '100',
        },
      },
      {
        key: 'enterprise',
        name: 'Enterprise',
        monthlyPrice: parseInt(settingsMap.enterprise_monthly || '499'),
        annualPrice: parseInt(settingsMap.enterprise_annual || '4990'),
        features: {
          eventsPerYear: settingsMap.enterprise_events || 'Unlimited',
          maxPeople: settingsMap.enterprise_people || 'Unlimited',
          storageGb: settingsMap.enterprise_storage || '500',
        },
      },
    ]

    return {
      tiers,
      setupFee: parseInt(settingsMap.setup_fee || '250'),
      processingFeePercent: parseFloat(settingsMap.processing_fee_percent || '2.9'),
      platformFeePercent: parseFloat(settingsMap.platform_fee_percent || '1'),
      transactionFee: parseFloat(settingsMap.transaction_fee || '0.30'),
    }
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return DEFAULT_PRICING
  }
}

// Get default pricing (for client-side fallback)
export function getDefaultPricing(): PlatformPricing {
  return DEFAULT_PRICING
}
