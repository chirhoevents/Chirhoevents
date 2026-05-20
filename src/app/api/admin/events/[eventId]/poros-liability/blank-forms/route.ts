import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { generateBlankFormPDF } from '@/lib/pdf/generate-blank-form-pdf'
import type { BlankFormType } from '@/lib/pdf/templates/blank-form-template'

const VALID_FORM_TYPES = ['youth_u18', 'youth_o18_chaperone', 'clergy', 'religious'] as const

// Representative participant type used to look up section config per form type
const FORM_TYPE_TO_PARTICIPANT_TYPE: Record<BlankFormType, string> = {
  youth_u18: 'youth_u18',
  youth_o18_chaperone: 'youth_o18',
  clergy: 'priest',
  religious: 'religious_sister',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Blank Form]',
    })
    if (error) return error

    const formType = request.nextUrl.searchParams.get('formType') as BlankFormType | null
    if (!formType || !VALID_FORM_TYPES.includes(formType as (typeof VALID_FORM_TYPES)[number])) {
      return NextResponse.json(
        { error: 'formType must be one of: youth_u18, youth_o18_chaperone, clergy, religious' },
        { status: 400 }
      )
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Load stored template wording — prefer event-specific, fall back to org-level
    const template = await prisma.liabilityFormTemplate.findFirst({
      where: {
        organizationId: event.organizationId,
        formType: formType as any,
        active: true,
        OR: [{ eventId }, { eventId: null }],
      },
      orderBy: [{ eventId: 'asc' }, { updatedAt: 'desc' }],
    })

    // Load section config to know which consent sections are enabled for this form type
    const participantType = FORM_TYPE_TO_PARTICIPANT_TYPE[formType]
    const sectionConfigs = await prisma.liabilityFormSectionConfig.findMany({
      where: { eventId, participantType: participantType as any },
      select: { sectionKey: true, enabled: true },
    })
    const sectionMap = new Map(sectionConfigs.map((s) => [s.sectionKey, s.enabled]))
    // Default true when no config row exists (not yet seeded or new section key)
    const sectionEnabled = (key: string) => sectionMap.get(key) ?? true

    const pdfBuffer = await generateBlankFormPDF(
      formType,
      event,
      event.organization,
      template,
      {
        generalWaiver: sectionEnabled('general_waiver'),
        medicalRelease: sectionEnabled('medical_release'),
        photoVideoConsent: sectionEnabled('photo_video_consent'),
        transportationConsent: sectionEnabled('transportation_consent'),
        emergencyTreatment: sectionEnabled('emergency_treatment'),
      }
    )

    const typeLabels: Record<BlankFormType, string> = {
      youth_u18: 'youth-u18',
      youth_o18_chaperone: 'adult-chaperone',
      clergy: 'clergy',
      religious: 'religious',
    }

    const eventSlug = event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)
    const filename = `blank-form-${typeLabels[formType]}-${eventSlug}.pdf`

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Blank Form] error:', err)
    return NextResponse.json({ error: 'Failed to generate blank form', detail: message }, { status: 500 })
  }
}
