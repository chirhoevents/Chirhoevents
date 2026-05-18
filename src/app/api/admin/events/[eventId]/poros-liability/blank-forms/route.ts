import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { generateBlankFormPDF } from '@/lib/pdf/generate-blank-form-pdf'
import type { BlankFormType } from '@/lib/pdf/templates/blank-form-template'

const VALID_FORM_TYPES = ['youth_u18', 'youth_o18_chaperone', 'clergy', 'religious'] as const

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

    // Load stored template wording for this form type, if any
    const template = await prisma.liabilityFormTemplate.findFirst({
      where: {
        eventId,
        formType: formType as any,
        active: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    const pdfBuffer = await generateBlankFormPDF(
      formType,
      event,
      event.organization,
      template
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
    console.error('[Blank Form] error:', err)
    return NextResponse.json({ error: 'Failed to generate blank form' }, { status: 500 })
  }
}
