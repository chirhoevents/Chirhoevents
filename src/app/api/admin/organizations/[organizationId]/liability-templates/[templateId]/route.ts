import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; templateId: string }> }
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
    const effectiveOrgId = await getEffectiveOrgId(user as any)

    const { organizationId, templateId } = await Promise.resolve(params)

    // Verify organization matches user's effective organization
    if (organizationId !== effectiveOrgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get template
    const template = await prisma.liabilityFormTemplate.findUnique({
      where: {
        id: templateId,
        organizationId,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; templateId: string }> }
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
    const effectiveOrgId = await getEffectiveOrgId(user as any)

    const { organizationId, templateId } = await Promise.resolve(params)

    // Verify organization matches user's effective organization
    if (organizationId !== effectiveOrgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify template exists and belongs to organization
    const existingTemplate = await prisma.liabilityFormTemplate.findUnique({
      where: {
        id: templateId,
        organizationId,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      templateName,
      description,
      generalWaiverText,
      medicalReleaseText,
      photoVideoConsentText,
      transportationConsentText,
      emergencyTreatmentText,
      customSections,
      active,
    } = body

    // Update template
    const template = await prisma.liabilityFormTemplate.update({
      where: { id: templateId },
      data: {
        templateName,
        description,
        generalWaiverText,
        medicalReleaseText,
        photoVideoConsentText,
        transportationConsentText,
        emergencyTreatmentText,
        customSections,
        active: active ?? existingTemplate.active,
        version: existingTemplate.version + 1,
      },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Template update error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; templateId: string }> }
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
    const effectiveOrgId = await getEffectiveOrgId(user as any)

    const { organizationId, templateId } = await Promise.resolve(params)

    // Verify organization matches user's effective organization
    if (organizationId !== effectiveOrgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Soft delete by setting active to false
    await prisma.liabilityFormTemplate.update({
      where: { id: templateId },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
