import { prisma } from '@/lib/prisma'
import { resolveModuleAccess } from '@/lib/subscription-tiers'

/** A parish's public Lux page by its address, only if Lux is on and the org is active */
export async function findLuxOrgBySlug(slug: string) {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null
  const org = await prisma.organization.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true, name: true, logoUrl: true, publicSlug: true, status: true, contactEmail: true, contactPhone: true,
      website: true, luxSettings: true, modulesEnabled: true, subscriptionTier: true,
      stripeAccountId: true, stripeChargesEnabled: true, platformFeePercentage: true,
    },
  })
  if (!org || org.status !== 'active') return null
  if (!resolveModuleAccess(org.modulesEnabled, org.subscriptionTier).lux) return null
  return { ...org, paymentsReady: !!org.stripeAccountId && org.stripeChargesEnabled }
}
export type LuxPublicOrg = NonNullable<Awaited<ReturnType<typeof findLuxOrgBySlug>>>
