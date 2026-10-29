import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAccess } from '@/lib/api-auth'

// GET all report templates for an organization
export async function GET(request: NextRequest) {
  try {
    // Organization comes from auth context (handles master admin impersonation)
    const { error, user, effectiveOrgId: organizationId } = await verifyAdminAccess(request, '[Report Templates GET]')
    if (error) return error
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Get templates - either public ones or ones created by this user
    const templates = await prisma.reportTemplate.findMany({
      where: {
        organizationId,
        OR: [
          { isPublic: true },
          { createdByUserId: user.id },
        ],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { reportType: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching report templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST create new report template
export async function POST(request: NextRequest) {
  try {
    // Organization comes from auth context (handles master admin impersonation)
    const { error, user, effectiveOrgId: organizationId } = await verifyAdminAccess(request, '[Report Templates POST]')
    if (error) return error
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, reportType, configuration, isPublic } = body

    if (!name || !reportType || !configuration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the template
    const template = await prisma.reportTemplate.create({
      data: {
        organizationId,
        createdByUserId: user.id,
        name,
        description,
        reportType,
        configuration,
        isPublic: isPublic || false,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating report template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
