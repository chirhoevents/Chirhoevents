import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateLiabilityFormPDF } from '@/lib/pdf/generate-liability-form-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    // Find liability form with all relations needed for PDF
    const form = await prisma.liabilityForm.findUnique({
      where: { id: formId },
      include: {
        event: true,
        organization: true,
        safeEnvironmentCertificates: true,
      },
    })

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdfBuffer = await generateLiabilityFormPDF(form)

    // Create filename
    const filename = `liability-form-${form.participantFirstName}-${form.participantLastName}-${formId.substring(0, 8)}.pdf`

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(pdfBuffer)

    // Return PDF as downloadable file
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF download endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
