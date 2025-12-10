import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateLiabilityFormPDF } from '@/lib/pdf/generate-liability-form-pdf'
import { uploadLiabilityFormPDF } from '@/lib/r2/upload-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const { formId } = params

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

    // If PDF already exists, redirect to it
    if (form.pdfUrl) {
      return NextResponse.redirect(form.pdfUrl)
    }

    // If no PDF exists, generate on-demand
    try {
      const pdfBuffer = await generateLiabilityFormPDF(form)
      const pdfUrl = await uploadLiabilityFormPDF(
        pdfBuffer,
        form.id,
        form.organizationId,
        form.eventId
      )

      // Update database with PDF URL
      await prisma.liabilityForm.update({
        where: { id: form.id },
        data: { pdfUrl },
      })

      // Redirect to the PDF
      return NextResponse.redirect(pdfUrl)
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError)
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('PDF download endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve PDF' },
      { status: 500 }
    )
  }
}
