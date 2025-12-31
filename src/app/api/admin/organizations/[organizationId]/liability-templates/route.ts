import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user)

    const { organizationId } = await Promise.resolve(params)

    // Verify organization matches user's organization
    if (organizationId !== organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get templates
    const templates = await prisma.liabilityFormTemplate.findMany({
      where: {
        organizationId,
      },
      orderBy: [{ active: 'desc' }, { version: 'desc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user)

    const { organizationId } = await Promise.resolve(params)

    // Verify organization matches user's organization
    if (organizationId !== organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      templateName,
      description,
      formType = 'youth_u18',
      generalWaiverText,
      medicalReleaseText,
      photoVideoConsentText,
      transportationConsentText,
      emergencyTreatmentText,
      customSections,
    } = body

    // Create new template
    const template = await prisma.liabilityFormTemplate.create({
      data: {
        organizationId,
        templateName,
        description,
        formType,
        generalWaiverText,
        medicalReleaseText,
        photoVideoConsentText,
        transportationConsentText,
        emergencyTreatmentText,
        customSections,
        createdByUserId: user.id,
        active: true,
        version: 1,
      },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
