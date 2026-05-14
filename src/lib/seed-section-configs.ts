import { prisma } from '@/lib/prisma'
import { ParticipantType } from '@prisma/client'

// ─── Section key constants ───────────────────────────────────────────────────

export const SECTION_KEYS = [
  'basic_info',
  'medical',
  'emergency_contacts',
  'insurance',
  'transportation_consent',
  'photo_video_consent',
  'medical_release',
  'emergency_treatment',
  'safe_environment_cert',
  'letter_of_good_standing',
  'clergy_info',
  'housing',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

// ─── Per-role defaults ───────────────────────────────────────────────────────

interface SectionDefaults {
  enabled: boolean
  required: boolean
  displayOrder: number
}

type RoleDefaults = Record<SectionKey, SectionDefaults>

const ORDER = SECTION_KEYS.reduce<Record<string, number>>((acc, key, i) => {
  acc[key] = i * 10
  return acc
}, {})

function on(required = true): SectionDefaults {
  return { enabled: true, required, displayOrder: 0 }
}
function off(): SectionDefaults {
  return { enabled: false, required: false, displayOrder: 0 }
}

const DEFAULTS: Record<ParticipantType, RoleDefaults> = {
  // ── Youth under 18 ────────────────────────────────────────────────────────
  youth_u18: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  on(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: off(),
    clergy_info:             off(),
    housing:                 off(),
  },

  // ── Youth 18+ ─────────────────────────────────────────────────────────────
  youth_o18: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  on(false), // optional for adults
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: off(),
    clergy_info:             off(),
    housing:                 off(),
  },

  // ── Chaperone ─────────────────────────────────────────────────────────────
  chaperone: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  on(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   on(),
    letter_of_good_standing: off(),
    clergy_info:             off(),
    housing:                 off(),
  },

  // ── Priest ────────────────────────────────────────────────────────────────
  priest: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  off(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: on(),
    clergy_info:             on(),
    housing:                 on(),
  },

  // ── Deacon ────────────────────────────────────────────────────────────────
  deacon: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  off(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: on(),
    clergy_info:             on(),
    housing:                 on(),
  },

  // ── Seminarian ────────────────────────────────────────────────────────────
  // letter_of_good_standing defaulted ON here; callers can override based on
  // event_settings.letter_of_good_standing_required_for after seeding.
  seminarian: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  off(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: on(),
    clergy_info:             on(),
    housing:                 on(),
  },

  // ── Religious Sister ──────────────────────────────────────────────────────
  religious_sister: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  off(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: off(),
    clergy_info:             on(), // re-purposed for religious community info
    housing:                 on(),
  },

  // ── Religious Brother ─────────────────────────────────────────────────────
  religious_brother: {
    basic_info:              on(),
    medical:                 on(),
    emergency_contacts:      on(),
    insurance:               on(),
    transportation_consent:  off(),
    photo_video_consent:     on(),
    medical_release:         on(),
    emergency_treatment:     on(),
    safe_environment_cert:   off(),
    letter_of_good_standing: off(),
    clergy_info:             on(), // re-purposed for religious community info
    housing:                 on(),
  },
}

// ─── Main seeding function ───────────────────────────────────────────────────

/**
 * Creates default LiabilityFormSectionConfig rows for all participant types
 * for a given event. Uses upsert so it is safe to call on an existing event
 * (existing customisations are preserved via update: {}).
 *
 * Call this:
 *  - when an event is first created
 *  - when an org first enables liability forms for an event
 */
export async function seedDefaultSectionConfigs(
  eventId: string,
  organizationId: string,
): Promise<void> {
  const participantTypes = Object.keys(DEFAULTS) as ParticipantType[]

  const upserts = participantTypes.flatMap((participantType) =>
    SECTION_KEYS.map((sectionKey, index) => {
      const defaults = DEFAULTS[participantType][sectionKey]
      return prisma.liabilityFormSectionConfig.upsert({
        where: {
          uq_section_config: { eventId, participantType, sectionKey },
        },
        create: {
          organizationId,
          eventId,
          participantType,
          sectionKey,
          enabled: defaults.enabled,
          required: defaults.required,
          displayOrder: index * 10,
        },
        // Do not overwrite existing customisations on re-seed
        update: {},
      })
    }),
  )

  await prisma.$transaction(upserts)
}
