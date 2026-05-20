import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LiabilityFormType, ParticipantType } from '@prisma/client'

// Maps a participant type to the liability form template type used to author
// waiver text for that role.
function formTypeForParticipantType(pt: string): LiabilityFormType {
  switch (pt) {
    case 'youth_u18':
      return LiabilityFormType.youth_u18
    case 'youth_o18':
    case 'chaperone':
      return LiabilityFormType.youth_o18_chaperone
    case 'religious_sister':
    case 'religious_brother':
      return LiabilityFormType.religious
    case 'priest':
    case 'deacon':
    case 'seminarian':
    default:
      return LiabilityFormType.clergy
  }
}

// GET /api/poros/events/[eventId]/form-config/[participantType]
//
// Public endpoint — returns only form structure (section visibility, waiver text,
// custom field definitions). Contains no personal data.
//
// Response shape:
// {
//   sections: [
//     {
//       sectionKey: string,
//       enabled: boolean,
//       required: boolean,
//       displayOrder: number,
//       label: string,           // customLabel ?? default label
//       helpText: string | null, // customHelpText
//       // Only present on letter_of_good_standing section:
//       letterConfig?: {
//         method: string,
//         contactName: string | null,
//         contactEmail: string | null,
//         instructions: string | null,
//       },
//       // Only present where template text exists:
//       waiverText?: string,
//     }
//   ],
//   customSections: [...],   // from liability_form_template.custom_sections
//   customQuestions: [...],  // from liability_form_template.custom_questions
// }
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; participantType: string }> }
) {
  try {
    const { eventId, participantType } = await params

    // Validate participantType
    const validTypes = new Set<string>(Object.values(ParticipantType))
    if (!validTypes.has(participantType)) {
      return NextResponse.json(
        { error: `Invalid participantType: ${participantType}` },
        { status: 400 }
      )
    }

    // Verify event exists and is accessible
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        name: true,
        startDate: true,
        endDate: true,
        organization: { select: { name: true } },
        settings: {
          select: {
            letterOfGoodStandingMethod: true,
            letterOfGoodStandingContactName: true,
            letterOfGoodStandingContactEmail: true,
            letterOfGoodStandingInstructions: true,
            letterOfGoodStandingRequiredFor: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // ── Fetch section configs ─────────────────────────────────────────────────
    const configs = await prisma.liabilityFormSectionConfig.findMany({
      where: { eventId, participantType: participantType as ParticipantType },
      orderBy: { displayOrder: 'asc' },
    })

    // ── Fetch active template for waiver text ─────────────────────────────────
    const formType = formTypeForParticipantType(participantType)
    const template = await prisma.liabilityFormTemplate.findFirst({
      where: {
        organizationId: event.organizationId,
        formType,
        active: true,
        OR: [{ eventId }, { eventId: null }],
      },
      orderBy: [{ eventId: 'asc' }, { version: 'desc' }],
      select: {
        generalWaiverText: true,
        medicalReleaseText: true,
        photoVideoConsentText: true,
        transportationConsentText: true,
        emergencyTreatmentText: true,
        customSections: true,
        customQuestions: true,
      },
    })

    // Fallback: if no template matched the strict query, try any active template for this org+formType
    const effectiveTemplate = template ?? await prisma.liabilityFormTemplate.findFirst({
      where: { organizationId: event.organizationId, formType, active: true },
      orderBy: { version: 'desc' },
      select: {
        generalWaiverText: true,
        medicalReleaseText: true,
        photoVideoConsentText: true,
        transportationConsentText: true,
        emergencyTreatmentText: true,
        customSections: true,
        customQuestions: true,
      },
    })

    console.log(`[FormConfig] eventId=${eventId} orgId=${event.organizationId} formType=${formType} template=${template ? 'found(OR query)' : effectiveTemplate ? 'found(fallback)' : 'NOT FOUND'}`)

    // Map section keys to their template waiver text field
    const waiverTextBySection: Record<string, string | null> = {
      medical_release: effectiveTemplate?.medicalReleaseText ?? null,
      photo_video_consent: effectiveTemplate?.photoVideoConsentText ?? null,
      transportation_consent: effectiveTemplate?.transportationConsentText ?? null,
      emergency_treatment: effectiveTemplate?.emergencyTreatmentText ?? null,
      // general_waiver_text is attached to the top-level consent block, not a
      // specific section key — expose it separately in the root response.
    }

    // Default human-readable labels for each section key
    const defaultLabels: Record<string, string> = {
      basic_info: 'Basic Information',
      medical: 'Medical Information',
      emergency_contacts: 'Emergency Contacts',
      insurance: 'Insurance Information',
      transportation_consent: 'Transportation Authorization',
      photo_video_consent: 'Photo & Video Consent',
      medical_release: 'Medical Release',
      emergency_treatment: 'Emergency Treatment Consent',
      safe_environment_cert: 'Safe Environment Certificate',
      letter_of_good_standing: 'Letter of Good Standing',
      clergy_info: 'Clergy / Religious Information',
      housing: 'Housing Preference',
    }

    // ── Build sections array ──────────────────────────────────────────────────
    const settings = event.settings
    const sections = configs.map((c) => {
      const base = {
        sectionKey: c.sectionKey,
        enabled: c.enabled,
        required: c.required,
        displayOrder: c.displayOrder,
        label: c.customLabel ?? defaultLabels[c.sectionKey] ?? c.sectionKey,
        helpText: c.customHelpText ?? null,
        ...(waiverTextBySection[c.sectionKey]
          ? { waiverText: waiverTextBySection[c.sectionKey] }
          : {}),
      }

      if (c.sectionKey === 'letter_of_good_standing' && settings) {
        return {
          ...base,
          letterConfig: {
            method: settings.letterOfGoodStandingMethod,
            contactName: settings.letterOfGoodStandingContactName,
            contactEmail: settings.letterOfGoodStandingContactEmail,
            instructions: settings.letterOfGoodStandingInstructions,
          },
        }
      }

      return base
    })

    // ── Parse custom sections/questions from template ─────────────────────────
    // Normalise to a typed shape so the frontend can render dynamically.
    // Template stores these as opaque JSON; pass through as-is but under
    // known keys so the frontend contract is stable.
    type CustomField = {
      key: string
      label: string
      type: string
      required?: boolean
      options?: string[]
      [k: string]: unknown
    }
    type CustomSection = {
      key: string
      label: string
      helpText?: string
      fields: CustomField[]
      [k: string]: unknown
    }

    const rawCustomSections = (effectiveTemplate?.customSections ?? []) as unknown[]
    const rawCustomQuestions = (effectiveTemplate?.customQuestions ?? []) as unknown[]

    // customSections: array of section objects with a `fields` array
    const customSections: CustomSection[] = Array.isArray(rawCustomSections)
      ? (rawCustomSections as CustomSection[])
      : []

    // customQuestions: flat array of question objects — wrap in a single
    // synthetic section so the frontend always deals with the same shape.
    const customQuestions: CustomField[] = Array.isArray(rawCustomQuestions)
      ? (rawCustomQuestions as CustomField[])
      : []

    const eventDates = `${new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    return NextResponse.json({
      eventId,
      participantType,
      formType,
      generalWaiverText: effectiveTemplate?.generalWaiverText ?? null,
      sections,
      customSections,
      customQuestions,
      eventName: event.name,
      eventDates,
      organizationName: event.organization.name,
    })
  } catch (err) {
    console.error('[FormConfig GET] error:', err)
    return NextResponse.json({ error: 'Failed to fetch form config' }, { status: 500 })
  }
}
