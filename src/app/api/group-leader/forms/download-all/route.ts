import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the group registration
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        liabilityForms: {
          where: { completed: true },
          select: {
            id: true,
            pdfUrl: true,
            participantFirstName: true,
            participantLastName: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    if (groupRegistration.liabilityForms.length === 0) {
      return NextResponse.json(
        { error: 'No completed forms to download' },
        { status: 404 }
      )
    }

    // TODO: Generate ZIP file of all PDFs
    // For now, return a list of PDF URLs
    // In production, you would:
    // 1. Fetch all PDFs from R2
    // 2. Create a ZIP archive using a library like 'archiver'
    // 3. Return the ZIP file as a blob

    return NextResponse.json({
      message: 'ZIP generation not yet implemented',
      forms: groupRegistration.liabilityForms,
      totalForms: groupRegistration.liabilityForms.length,
    })
  } catch (error) {
    console.error('Error downloading all forms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
