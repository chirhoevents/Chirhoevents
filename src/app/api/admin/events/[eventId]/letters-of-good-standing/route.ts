import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'

// GET /api/admin/events/[eventId]/letters-of-good-standing
// Query params:
//   status  — filter by status (pending|submitted_externally|uploaded|verified|rejected)
//   type    — filter by participant_type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') ?? undefined
    const typeFilter = searchParams.get('type') ?? undefined

    const { error } = await verifyFormsViewAccess(
      request,
      eventId,
      '[LettersOfGoodStanding GET]'
    )
    if (error) return error

    const letters = await prisma.letterOfGoodStanding.findMany({
      where: {
        eventId,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { participantType: typeFilter as any } : {}),
      },
      select: {
        id: true,
        participantName: true,
        participantType: true,
        submissionMethod: true,
        status: true,
        fileUrl: true,
        originalFilename: true,
        uploadedAt: true,
        submittedToContact: true,
        submittedToEmail: true,
        externalSubmissionNotes: true,
        verifiedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        verifiedBy: {
          select: { firstName: true, lastName: true },
        },
        liabilityForm: {
          select: {
            id: true,
            participantFirstName: true,
            participantLastName: true,
            formStatus: true,
          },
        },
      },
      orderBy: [{ participantType: 'asc' }, { createdAt: 'desc' }],
    })

    // Summary counts for the response header
    const summary = {
      total: letters.length,
      pending: letters.filter((l) => l.status === 'pending').length,
      submittedExternally: letters.filter((l) => l.status === 'submitted_externally').length,
      uploaded: letters.filter((l) => l.status === 'uploaded').length,
      verified: letters.filter((l) => l.status === 'verified').length,
      rejected: letters.filter((l) => l.status === 'rejected').length,
    }

    return NextResponse.json({ letters, summary })
  } catch (err) {
    console.error('[LettersOfGoodStanding GET] error:', err)
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 })
  }
}
