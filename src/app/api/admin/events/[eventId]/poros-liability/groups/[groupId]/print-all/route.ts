import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { generateLiabilityFormPDF } from '@/lib/pdf/generate-liability-form-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params

    const { error } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Print All Forms]',
    })
    if (error) return error

    // Load the group and all completed forms with full data needed for PDF generation
    const group = await prisma.groupRegistration.findUnique({
      where: { id: groupId },
      include: {
        liabilityForms: {
          where: { completed: true },
          include: {
            event: true,
            organization: true,
            safeEnvironmentCertificates: true,
          },
          orderBy: [
            { participantLastName: 'asc' },
            { participantFirstName: 'asc' },
          ],
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.liabilityForms.length === 0) {
      return NextResponse.json({ error: 'No completed forms found for this group' }, { status: 404 })
    }

    // Generate individual PDFs in parallel (capped to avoid memory spikes)
    const BATCH_SIZE = 5
    const pdfBuffers: Buffer[] = []

    for (let i = 0; i < group.liabilityForms.length; i += BATCH_SIZE) {
      const batch = group.liabilityForms.slice(i, i + BATCH_SIZE)
      const batchBuffers = await Promise.all(
        batch.map(form => generateLiabilityFormPDF(form))
      )
      pdfBuffers.push(...batchBuffers)
    }

    // Merge all PDFs into one document
    const merged = await PDFDocument.create()
    for (const buf of pdfBuffers) {
      const src = await PDFDocument.load(buf)
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach(page => merged.addPage(page))
    }

    const mergedBytes = Buffer.from(await merged.save())

    const groupSlug = group.groupName.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)
    const filename = `liability-forms-${groupSlug}.pdf`

    return new Response(mergedBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': mergedBytes.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('[Print All Forms] error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF packet' }, { status: 500 })
  }
}
