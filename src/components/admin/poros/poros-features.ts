import {
  Home,
  Users,
  Grid3X3,
  Accessibility,
  Utensils,
  Church,
  Sun,
  Info,
  Globe,
  type LucideIcon,
} from 'lucide-react'

/**
 * Single source of truth for every Poros feature switch.
 *
 * The admin Poros Portal is organized into three work areas:
 *   - rooms:    everything that puts people (or groups) into a physical room
 *   - meals:    meal color groups and meal times
 *   - schedule: everything participants see on the public resource portal
 *
 * Both the Settings tab and the inline on/off banners read from this list,
 * so labels and descriptions stay consistent everywhere.
 */
export type PorosFeatureArea = 'rooms' | 'meals' | 'schedule'

export interface PorosFeature {
  key: string
  label: string
  /** One plain-language sentence: what this feature is for. */
  description: string
  area: PorosFeatureArea
  /** Where the admin goes to manage it, e.g. "Rooms & Housing → Overnight Housing". */
  location: string
  defaultValue: boolean
  icon: LucideIcon
  color: string
}

export const POROS_AREAS: Record<PorosFeatureArea, { label: string; description: string }> = {
  rooms: {
    label: 'Rooms & Housing',
    description: 'Where people sleep, where small groups meet, and where they sit.',
  },
  meals: {
    label: 'Meals',
    description: 'Meal color groups and the meal times each color eats.',
  },
  schedule: {
    label: 'Schedule & Public Portal',
    description: 'Everything participants see on the public resource portal.',
  },
}

export const POROS_FEATURES: PorosFeature[] = [
  {
    key: 'porosHousingEnabled',
    label: 'Overnight Housing',
    description:
      'Assign participants to buildings, rooms, and beds for where they sleep. Also unlocks Room Blocks for Groups.',
    area: 'rooms',
    location: 'Rooms & Housing → Overnight Housing / Room Blocks',
    defaultValue: true,
    icon: Home,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    key: 'porosSmallGroupEnabled',
    label: 'Small Group Meeting Rooms',
    description:
      'Give each group a room to meet in during small group sessions, plus their small group leaders (SGLs) and religious.',
    area: 'rooms',
    location: 'Rooms & Housing → Small Group Meeting Rooms',
    defaultValue: false,
    icon: Users,
    color: 'bg-green-100 text-green-600',
  },
  {
    key: 'porosSeatingEnabled',
    label: 'Seating',
    description: 'Assign groups to seating sections for Mass and general sessions.',
    area: 'rooms',
    location: 'Rooms & Housing → Seating',
    defaultValue: false,
    icon: Grid3X3,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    key: 'porosAdaEnabled',
    label: 'ADA / Accessibility',
    description: 'Track participants with accessibility needs so they get suitable rooms and seating.',
    area: 'rooms',
    location: 'Rooms & Housing → ADA',
    defaultValue: false,
    icon: Accessibility,
    color: 'bg-sky-100 text-sky-600',
  },
  {
    key: 'porosMealColorsEnabled',
    label: 'Meal Groups',
    description: 'Split groups into meal colors, each with its own breakfast, lunch, and dinner times.',
    area: 'meals',
    location: 'Meals',
    defaultValue: false,
    icon: Utensils,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    key: 'porosPublicPortalEnabled',
    label: 'Public Resource Portal',
    description:
      'The participant-facing page with the schedule, announcements, resources, and more. Turn this on to give people the link.',
    area: 'schedule',
    location: 'Schedule & Public Portal → Portal Link',
    defaultValue: false,
    icon: Globe,
    color: 'bg-navy/10 text-navy',
  },
  {
    key: 'porosConfessionsEnabled',
    label: 'Confessions',
    description: 'Show confession times and locations on the public portal.',
    area: 'schedule',
    location: 'Schedule & Public Portal → Confessions',
    defaultValue: false,
    icon: Church,
    color: 'bg-red-100 text-red-600',
  },
  {
    key: 'porosAdorationEnabled',
    label: 'Adoration',
    description: 'Show adoration times and locations on the public portal.',
    area: 'schedule',
    location: 'Schedule & Public Portal → Adoration',
    defaultValue: false,
    icon: Sun,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    key: 'porosInfoEnabled',
    label: 'Info Section',
    description: 'Extra information cards on the public portal (Wi-Fi, parking, what to bring, etc.).',
    area: 'schedule',
    location: 'Schedule & Public Portal → Info',
    defaultValue: false,
    icon: Info,
    color: 'bg-teal-100 text-teal-600',
  },
]

export function getPorosFeature(key: string): PorosFeature {
  const feature = POROS_FEATURES.find((f) => f.key === key)
  if (!feature) throw new Error(`Unknown Poros feature: ${key}`)
  return feature
}

export function isPorosFeatureOn(settings: any, key: string): boolean {
  const feature = getPorosFeature(key)
  return settings?.[key] ?? feature.defaultValue
}
