import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'
import { secureFileLink } from '@/lib/r2/private-files'
import { storeLetterFile, validateLetterFile } from '@/lib/letters-of-good-standing'

// POST /api/admin/events/[eventId]/letters-of-good-standing/[letterId]/file
//
// Attach a letter the organization received some other way (email, mail) to
// an existing letter record, so it is kept in the system and included in the
// master report. multipart/form-data:
//   file — PDF, JPEG or PNG, up to 10 MB (required)
// The letter becomes "uploaded" so it can be verified as usual; a letter that
// was already verified stays verified with the new file.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; letterId: string }> }
) {
  try {
    const { eventId, letterId } = await params

    const { error } = await verifyFormsEditAccess(
      request,
      eventId,
      '[LetterOfGoodStanding file POST]'
    )
    if (error) return error

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    const fileError = validateLetterFile(file)
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 })

    const letter = await prisma.letterOfGoodStanding.findUnique({
      where: { id: letterId },
      select: { id: true, eventId: true, organizationId: true, status: true },
    })
    if (!letter || letter.eventId !== eventId) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    const stored = await storeLetterFile(file!, letter.organizationId, eventId)

    const updated = await prisma.letterOfGoodStanding.update({
      where: { id: letterId },
      data: {
        ...stored,
        status: letter.status === 'verified' ? 'verified' : 'uploaded',
        rejectionReason: null,
      },
      select: {
        id: true,
        status: true,
        fileUrl: true,
        originalFilename: true,
        uploadedAt: true,
      },
    })

    return NextResponse.json({
      letter: { ...updated, fileUrl: secureFileLink('letter', updated.id, updated.fileUrl) },
    })
  } catch (err) {
    console.error('[LetterOfGoodStanding file POST] error:', err)
    return NextResponse.json({ error: 'Failed to upload letter' }, { status: 500 })
  }
}
