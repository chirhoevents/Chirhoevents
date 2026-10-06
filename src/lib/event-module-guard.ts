import { prisma } from '@/lib/prisma'
import { moduleNotInPlanMessage, resolveModuleAccess, type ModuleKey } from '@/lib/subscription-tiers'

// Event settings flags that switch on a paid module for that event. The edit
// page treats Poros as on when any of its flags is set, so all of them count.
const EVENT_MODULE_FLAGS: Record<ModuleKey, string[]> = {
  poros: ['porosEnabled', 'porosHousingEnabled', 'porosPublicPortalEnabled'],
  salve: ['salveCheckinEnabled'],
  rapha: ['raphaMedicalEnabled'],
}

// Prisma `select` for the current values of every flag above
export const EVENT_MODULE_SETTINGS_SELECT = {
  porosEnabled: true,
  porosHousingEnabled: true,
  porosPublicPortalEnabled: true,
  salveCheckinEnabled: true,
  raphaMedicalEnabled: true,
} as const

type SettingsFlags = Record<string, unknown>

/**
 * Returns an error message if this save would turn on a module the org's plan
 * doesn't include, or null if it's allowed. A module that is already on for
 * the event (`current`) is left alone, so an org that lost a module can still
 * save other changes to an older event.
 */
export async function blockedEventModuleMessage(
  organizationId: string,
  requested: SettingsFlags,
  current?: SettingsFlags | null
): Promise<string | null> {
  const turningOn = (Object.keys(EVENT_MODULE_FLAGS) as ModuleKey[]).filter(module => {
    const flags = EVENT_MODULE_FLAGS[module]
    const alreadyOn = flags.some(flag => current?.[flag] === true)
    return !alreadyOn && flags.some(flag => requested[flag] === true)
  })
  if (turningOn.length === 0) return null

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionTier: true, modulesEnabled: true },
  })
  if (!org) return null

  const access = resolveModuleAccess(org.modulesEnabled, org.subscriptionTier)
  const blocked = turningOn.find(module => !access[module])
  return blocked ? moduleNotInPlanMessage(blocked, org.subscriptionTier) : null
}
