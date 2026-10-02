import type { WaitlistPreferenceOptions } from '@/components/WaitlistModal'

type HousingType = WaitlistPreferenceOptions['housingTypes'][number]
type RoomType = WaitlistPreferenceOptions['roomTypes'][number]

interface CapacitySettings {
  groupRegistrationEnabled?: boolean | null
  individualRegistrationEnabled?: boolean | null
  onCampusCapacity?: number | null
  offCampusCapacity?: number | null
  dayPassCapacity?: number | null
  singleRoomCapacity?: number | null
  doubleRoomCapacity?: number | null
  tripleRoomCapacity?: number | null
  quadRoomCapacity?: number | null
}

/**
 * Which waitlist preferences to offer, based on the options the event has.
 * Lives outside WaitlistModal ('use client') so server components can call it.
 */
export function buildWaitlistPreferences(
  settings: CapacitySettings | null | undefined,
  dayPassOptions: Array<{ id: string; name: string }> | null | undefined
): WaitlistPreferenceOptions {
  const offered = (cap: number | null | undefined) => cap !== null && cap !== undefined
  const housingTypes: HousingType[] = []
  if (offered(settings?.onCampusCapacity)) housingTypes.push('on_campus')
  if (offered(settings?.offCampusCapacity)) housingTypes.push('off_campus')
  if (offered(settings?.dayPassCapacity)) housingTypes.push('day_pass')
  const roomTypes: RoomType[] = []
  if (offered(settings?.singleRoomCapacity)) roomTypes.push('single')
  if (offered(settings?.doubleRoomCapacity)) roomTypes.push('double')
  if (offered(settings?.tripleRoomCapacity)) roomTypes.push('triple')
  if (offered(settings?.quadRoomCapacity)) roomTypes.push('quad')
  const dpOffered = (dayPassOptions ?? []).map((o) => ({ id: o.id, name: o.name }))
  return {
    offerGeneralAdmission: housingTypes.length > 0,
    offerDayPass: dpOffered.length > 0 || housingTypes.includes('day_pass'),
    housingTypes,
    roomTypes,
    dayPassOptions: dpOffered,
    groupRegistrationEnabled: settings?.groupRegistrationEnabled ?? true,
    individualRegistrationEnabled: settings?.individualRegistrationEnabled ?? true,
  }
}
