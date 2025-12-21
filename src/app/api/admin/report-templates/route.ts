import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// GET all report templates for an organization
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organizationId = request.nextUrl.searchParams.get('organizationId')
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Get user to verify they belong to this organization
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId, organizationId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { organizationId, name, description, reportType, configuration, isPublic } = body

    if (!organizationId || !name || !reportType || !configuration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user to verify they belong to this organization
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId, organizationId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
