// Custom badges — people with no registration record (speakers, guests,
// musicians, etc.) who still need a name tag. Saved per event alongside the
// name tag template and printed with the same template as everyone else.

import type { NameTagData } from '@/lib/badge-renderer'

export interface CustomBadge {
  id: string
  firstName: string
  lastName: string
  // Printed in the colored role pill, e.g. "Speaker"
  label: string
  // Printed on the group/parish line, e.g. "Franciscan University"
  organization: string
  housing: string
  mealColorName: string
  mealColorHex: string
  note: string
}

const MAX_BADGES = 500
const FIELD_LIMITS: Record<keyof Omit<CustomBadge, 'id'>, number> = {
  firstName: 100,
  lastName: 100,
  label: 40,
  organization: 150,
  housing: 100,
  mealColorName: 100,
  mealColorHex: 7,
  note: 150,
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

// Validates a client-sent list before it's saved. Drops anything without a name.
export function sanitizeCustomBadges(input: unknown): CustomBadge[] {
  if (!Array.isArray(input)) return []
  return input.slice(0, MAX_BADGES).flatMap((raw: any) => {
    if (!raw || typeof raw !== 'object') return []
    const badge = { id: str(raw.id, 64) } as CustomBadge
    for (const [key, max] of Object.entries(FIELD_LIMITS)) {
      ;(badge as any)[key] = str(raw[key], max)
    }
    if (!badge.id || (!badge.firstName && !badge.lastName)) return []
    if (badge.mealColorHex && !/^#[0-9a-fA-F]{6}$/.test(badge.mealColorHex)) badge.mealColorHex = ''
    return [badge]
  })
}

export function customBadgeToNameTag(b: CustomBadge): NameTagData {
  return {
    participantId: `custom-${b.id}`,
    firstName: b.firstName,
    lastName: b.lastName,
    fullName: `${b.firstName} ${b.lastName}`.trim(),
    groupName: b.organization,
    diocese: null,
    participantType: 'custom',
    badgeLabel: b.label || 'Guest',
    isChaperone: false,
    isClergy: false,
    housing: b.housing
      ? { building: b.housing, room: '', bed: null, fullLocation: b.housing }
      : null,
    mealColor: b.mealColorName && b.mealColorHex
      ? { name: b.mealColorName, hex: b.mealColorHex }
      : null,
    qrCode: null,
    customNote: b.note || null,
    hasAllergy: false,
  }
}
