// ChiRho Events — Question Catalog Seed
//
// Inserts (or refreshes) the master catalog template rows into
// CustomRegistrationQuestion.  Template rows share:
//   • isTemplate = true
//   • eventId    = null  (not tied to any event)
//   • required   = false (organizers override per-event copy)
//
// This script is idempotent: it wipes all existing template rows
// (which carry no answer data — eventId is null, so no registrant ever
// answered them) and re-inserts the canonical set.
//
// Run: npm run db:seed-catalog

import { PrismaClient, QuestionType, QuestionAppliesTo } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Catalog definition
// ---------------------------------------------------------------------------

interface CatalogEntry {
  catalogSlug: string
  catalogCategory: string
  questionText: string
  questionType: QuestionType
  options: string[] | null
  appliesTo: QuestionAppliesTo
  displayOrder: number
}

const CATALOG: CatalogEntry[] = [
  // ── Parish & Diocese Info ─────────────────────────────────────────────────
  {
    catalogSlug: 'diocese_name',
    catalogCategory: 'parish_info',
    questionText: 'What diocese are you from?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 1,
  },
  {
    catalogSlug: 'parish_name',
    catalogCategory: 'parish_info',
    questionText: 'What parish do you belong to?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 2,
  },
  {
    catalogSlug: 'pastor_name',
    catalogCategory: 'parish_info',
    questionText: 'Who is your pastor?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 3,
  },
  {
    catalogSlug: 'state_origin',
    catalogCategory: 'parish_info',
    questionText: 'What state are you coming from?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 4,
  },

  // ── Demographics ──────────────────────────────────────────────────────────
  {
    catalogSlug: 'language_spoken',
    catalogCategory: 'demographics',
    questionText: 'What language(s) do you speak?',
    questionType: QuestionType.multi_select,
    options: ['English', 'Spanish', 'Both', 'Other'],
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 5,
  },
  {
    catalogSlug: 'grade_level',
    catalogCategory: 'demographics',
    questionText: 'What grade are you in?',
    questionType: QuestionType.dropdown,
    options: ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College', 'N/A'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 6,
  },
  {
    catalogSlug: 'tshirt_size',
    catalogCategory: 'demographics',
    questionText: 'What is your T-shirt size?',
    questionType: QuestionType.dropdown,
    options: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'A2XL', 'A3XL'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 7,
  },
  {
    catalogSlug: 'gender',
    catalogCategory: 'demographics',
    questionText: 'Gender',
    questionType: QuestionType.dropdown,
    options: ['Male', 'Female'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 8,
  },
  {
    catalogSlug: 'age',
    catalogCategory: 'demographics',
    questionText: 'Age',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 9,
  },

  // ── Event Experience ──────────────────────────────────────────────────────
  {
    catalogSlug: 'attended_before',
    catalogCategory: 'event_experience',
    questionText: 'Have you attended this event before?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 10,
  },
  {
    catalogSlug: 'times_attended',
    catalogCategory: 'event_experience',
    questionText: 'If yes, how many times have you attended?',
    questionType: QuestionType.dropdown,
    options: ['1', '2', '3', '4', '5+'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 11,
  },
  {
    catalogSlug: 'how_heard',
    catalogCategory: 'event_experience',
    questionText: 'How did you hear about this event?',
    questionType: QuestionType.dropdown,
    options: [
      'Word of mouth',
      'Parish bulletin',
      'Social media',
      'Email',
      'Website',
      'Youth minister',
      'Other',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 12,
  },
  {
    catalogSlug: 'first_conference',
    catalogCategory: 'event_experience',
    questionText: 'Is this your first Catholic conference or retreat?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 13,
  },
  {
    catalogSlug: 'looking_forward_to',
    catalogCategory: 'event_experience',
    questionText: 'What are you most looking forward to at this event?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 14,
  },
  {
    catalogSlug: 'group_attended_before',
    catalogCategory: 'event_experience',
    questionText: 'Has your group attended this event before?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.group,
    displayOrder: 15,
  },
  {
    catalogSlug: 'group_first_timers',
    catalogCategory: 'event_experience',
    questionText: 'Approximately how many first-time attendees are in your group?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.group,
    displayOrder: 16,
  },

  // ── Faith & Sacraments ────────────────────────────────────────────────────
  {
    catalogSlug: 'sacraments_received',
    catalogCategory: 'faith_sacraments',
    questionText: 'What sacraments have you received?',
    questionType: QuestionType.multi_select,
    options: [
      'Baptism',
      'First Reconciliation',
      'First Communion',
      'Confirmation',
      'None',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 17,
  },
  {
    catalogSlug: 'gluten_free_host',
    catalogCategory: 'faith_sacraments',
    questionText: 'Will you need a gluten-free communion host?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 18,
  },
  {
    catalogSlug: 'youth_ministry_involved',
    catalogCategory: 'faith_sacraments',
    questionText: 'Are you currently involved in youth ministry?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 19,
  },
  {
    catalogSlug: 'volunteer_interest',
    catalogCategory: 'faith_sacraments',
    questionText: 'Are you interested in volunteering or helping during the event?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 20,
  },

  // ── Logistics ─────────────────────────────────────────────────────────────
  {
    catalogSlug: 'transportation_method',
    catalogCategory: 'logistics',
    questionText: 'How will you be getting to the event?',
    questionType: QuestionType.dropdown,
    options: ['Driving', 'Bus/charter', 'Carpool', 'Flying', 'Other'],
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 21,
  },
  {
    catalogSlug: 'needs_housing',
    catalogCategory: 'logistics',
    questionText: 'Do you need housing?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 22,
  },
  {
    catalogSlug: 'roommate_request',
    catalogCategory: 'logistics',
    questionText: 'Do you have a roommate request?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 23,
  },
  {
    catalogSlug: 'estimated_arrival',
    catalogCategory: 'logistics',
    questionText: 'What is your estimated arrival date and time?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 24,
  },
  {
    catalogSlug: 'estimated_departure',
    catalogCategory: 'logistics',
    questionText: 'What is your estimated departure date and time?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 25,
  },

  // ── Dietary & Accessibility ───────────────────────────────────────────────
  //
  // NOTE: Individual registration already captures dietaryRestrictions and
  // adaAccommodations as free-text fields, and LiabilityForm stores detailed
  // per-person medical/dietary data. These catalog questions are supplemental —
  // they provide structured multi-select data where the existing free-text
  // fields are insufficient.
  {
    catalogSlug: 'dietary_restrictions_structured',
    catalogCategory: 'dietary_accessibility',
    questionText: 'Do you have any dietary restrictions?',
    questionType: QuestionType.multi_select,
    options: [
      'Vegetarian',
      'Vegan',
      'Gluten-free',
      'Dairy-free',
      'Nut allergy',
      'None',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 26,
  },
  {
    catalogSlug: 'food_allergies',
    catalogCategory: 'dietary_accessibility',
    questionText: 'Please list any food allergies not covered above',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 27,
  },
  {
    catalogSlug: 'accessibility_needs',
    catalogCategory: 'dietary_accessibility',
    questionText: 'Do you have any accessibility needs?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 28,
  },

  // ── Additional Notes ──────────────────────────────────────────────────────
  {
    catalogSlug: 'special_notes',
    catalogCategory: 'additional_notes',
    questionText: 'Is there anything else you would like us to know?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 29,
  },
  {
    catalogSlug: 'prayer_intentions',
    catalogCategory: 'additional_notes',
    questionText: 'Do you have any prayer intentions you would like to share?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 30,
  },
]

const EXPECTED_COUNT = 30

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding question catalog...')

  // Wipe existing templates and re-insert. Template rows have eventId = null
  // so they can never have CustomRegistrationAnswer rows — safe to delete.
  const deleted = await prisma.customRegistrationQuestion.deleteMany({
    where: { isTemplate: true },
  })
  if (deleted.count > 0) {
    console.log(`🗑  Removed ${deleted.count} stale template row(s)`)
  }

  const created = await prisma.customRegistrationQuestion.createMany({
    data: CATALOG.map((entry) => ({
      // eventId intentionally omitted — defaults to null in DB
      questionText:     entry.questionText,
      questionType:     entry.questionType,
      options:          entry.options ?? undefined,
      required:         false,
      appliesTo:        entry.appliesTo,
      displayOrder:     entry.displayOrder,
      catalogSlug:      entry.catalogSlug,
      catalogCategory:  entry.catalogCategory,
      isTemplate:       true,
    })),
  })

  console.log(`✅ Inserted ${created.count} catalog template rows`)

  // Verification query
  const rows = await prisma.customRegistrationQuestion.findMany({
    where:   { isTemplate: true },
    select:  { catalogSlug: true, questionText: true, catalogCategory: true, isTemplate: true },
    orderBy: { displayOrder: 'asc' },
  })

  console.log('\n📋 Verification — catalog templates (ordered by displayOrder):')
  console.log('─'.repeat(80))
  rows.forEach((r, i) => {
    const idx = String(i + 1).padStart(2, ' ')
    console.log(`${idx}. [${r.catalogCategory}] ${r.catalogSlug} — "${r.questionText}"`)
  })
  console.log('─'.repeat(80))
  console.log(`\nTotal template rows: ${rows.length} (expected ${EXPECTED_COUNT})`)

  if (rows.length !== EXPECTED_COUNT) {
    throw new Error(`Expected ${EXPECTED_COUNT} template rows, got ${rows.length}`)
  }

  console.log('\n🎉 Question catalog seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Catalog seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
  // ── Parish & Diocese Info ─────────────────────────────────────────────────
  {
    catalogSlug: 'diocese_name',
    catalogCategory: 'parish_info',
    questionText: 'What diocese are you from?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 1,
  },
  {
    catalogSlug: 'parish_name',
    catalogCategory: 'parish_info',
    questionText: 'What parish do you belong to?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 2,
  },
  {
    catalogSlug: 'pastor_name',
    catalogCategory: 'parish_info',
    questionText: 'Who is your pastor?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 3,
  },

  // ── Demographics ──────────────────────────────────────────────────────────
  {
    catalogSlug: 'language_spoken',
    catalogCategory: 'demographics',
    questionText: 'What language(s) do you speak?',
    questionType: QuestionType.multi_select,
    options: ['English', 'Spanish', 'Both', 'Other'],
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 4,
  },
  {
    catalogSlug: 'grade_level',
    catalogCategory: 'demographics',
    questionText: 'What grade are you in?',
    questionType: QuestionType.dropdown,
    options: ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College', 'N/A'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 5,
  },
  {
    catalogSlug: 'tshirt_size',
    catalogCategory: 'demographics',
    questionText: 'What is your T-shirt size?',
    questionType: QuestionType.dropdown,
    options: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'A2XL', 'A3XL'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 6,
  },
  {
    catalogSlug: 'gender',
    catalogCategory: 'demographics',
    questionText: 'Gender',
    questionType: QuestionType.dropdown,
    options: ['Male', 'Female'],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 7,
  },
  {
    catalogSlug: 'age',
    catalogCategory: 'demographics',
    questionText: 'Age',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 8,
  },

  // ── Event Experience ──────────────────────────────────────────────────────
  {
    catalogSlug: 'attended_before',
    catalogCategory: 'event_experience',
    questionText: 'Have you attended this event before?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 9,
  },
  {
    catalogSlug: 'how_heard',
    catalogCategory: 'event_experience',
    questionText: 'How did you hear about this event?',
    questionType: QuestionType.dropdown,
    options: [
      'Word of mouth',
      'Parish bulletin',
      'Social media',
      'Email',
      'Website',
      'Youth minister',
      'Other',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 10,
  },
  {
    catalogSlug: 'first_conference',
    catalogCategory: 'event_experience',
    questionText: 'Is this your first Catholic conference or retreat?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 11,
  },
  {
    catalogSlug: 'attendee_role',
    catalogCategory: 'event_experience',
    questionText: 'What is your role at this event?',
    questionType: QuestionType.dropdown,
    options: [
      'Participant',
      'Chaperone',
      'Volunteer',
      'Speaker',
      'Clergy',
      'Religious sister/brother',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 12,
  },

  // ── Faith & Sacraments ────────────────────────────────────────────────────
  {
    catalogSlug: 'sacraments_received',
    catalogCategory: 'faith_sacraments',
    questionText: 'What sacraments have you received?',
    questionType: QuestionType.multi_select,
    options: [
      'Baptism',
      'First Reconciliation',
      'First Communion',
      'Confirmation',
      'None',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 13,
  },
  {
    catalogSlug: 'youth_ministry_involved',
    catalogCategory: 'faith_sacraments',
    questionText: 'Are you currently involved in youth ministry?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 14,
  },

  // ── Logistics ─────────────────────────────────────────────────────────────
  {
    catalogSlug: 'transportation_method',
    catalogCategory: 'logistics',
    questionText: 'How will you be getting to the event?',
    questionType: QuestionType.dropdown,
    options: ['Driving', 'Bus/charter', 'Carpool', 'Flying', 'Other'],
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 15,
  },
  {
    catalogSlug: 'needs_housing',
    catalogCategory: 'logistics',
    questionText: 'Do you need housing?',
    questionType: QuestionType.yes_no,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 16,
  },
  {
    catalogSlug: 'estimated_arrival',
    catalogCategory: 'logistics',
    questionText: 'What is your estimated arrival date and time?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.both,
    displayOrder: 17,
  },

  // ── Dietary & Accessibility ───────────────────────────────────────────────
  //
  // NOTE: Individual registration already captures dietaryRestrictions and
  // adaAccommodations as free-text fields, and LiabilityForm stores detailed
  // per-person medical/dietary data. These catalog questions are supplemental —
  // they provide structured multi-select data where the existing free-text
  // fields are insufficient. If an organizer enables them, the registration
  // form must label them as "Additional dietary information" (not "Dietary
  // restrictions") to avoid confusion with the hardcoded fields.
  {
    catalogSlug: 'dietary_restrictions_structured',
    catalogCategory: 'dietary_accessibility',
    questionText: 'Do you have any dietary restrictions?',
    questionType: QuestionType.multi_select,
    options: [
      'Vegetarian',
      'Vegan',
      'Gluten-free',
      'Dairy-free',
      'Kosher',
      'Halal',
      'Nut allergy',
      'None',
    ],
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 18,
  },
  {
    catalogSlug: 'food_allergies',
    catalogCategory: 'dietary_accessibility',
    questionText: 'Please list any food allergies not covered above',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 19,
  },
  {
    catalogSlug: 'accessibility_needs',
    catalogCategory: 'dietary_accessibility',
    questionText: 'Do you have any accessibility needs?',
    questionType: QuestionType.text,
    options: null,
    appliesTo: QuestionAppliesTo.individual,
    displayOrder: 20,
  },
]

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding question catalog...')

  // Wipe existing templates and re-insert. Template rows have eventId = null
  // so they can never have CustomRegistrationAnswer rows — safe to delete.
  const deleted = await prisma.customRegistrationQuestion.deleteMany({
    where: { isTemplate: true },
  })
  if (deleted.count > 0) {
    console.log(`🗑  Removed ${deleted.count} stale template row(s)`)
  }

  const created = await prisma.customRegistrationQuestion.createMany({
    data: CATALOG.map((entry) => ({
      // eventId intentionally omitted — defaults to null in DB
      questionText:     entry.questionText,
      questionType:     entry.questionType,
      options:          entry.options ?? undefined,
      required:         false,
      appliesTo:        entry.appliesTo,
      displayOrder:     entry.displayOrder,
      catalogSlug:      entry.catalogSlug,
      catalogCategory:  entry.catalogCategory,
      isTemplate:       true,
    })),
  })

  console.log(`✅ Inserted ${created.count} catalog template rows`)

  // Verification query — mirrors the SQL in the spec
  const rows = await prisma.customRegistrationQuestion.findMany({
    where:   { isTemplate: true },
    select:  { catalogSlug: true, questionText: true, catalogCategory: true, isTemplate: true },
    orderBy: { displayOrder: 'asc' },
  })

  console.log('\n📋 Verification — catalog templates (ordered by displayOrder):')
  console.log('─'.repeat(80))
  rows.forEach((r, i) => {
    const idx = String(i + 1).padStart(2, ' ')
    console.log(`${idx}. [${r.catalogCategory}] ${r.catalogSlug} — "${r.questionText}"`)
  })
  console.log('─'.repeat(80))
  console.log(`\nTotal template rows: ${rows.length} (expected 20)`)

  if (rows.length !== 20) {
    throw new Error(`Expected 20 template rows, got ${rows.length}`)
  }

  console.log('\n🎉 Question catalog seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Catalog seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
