import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// GET single report template
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { templateId } = params

    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
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

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify user has access to this template
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId, organizationId: template.organizationId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this template (public or created by them)
    if (!template.isPublic && template.createdByUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching report template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// PUT update report template
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { templateId } = params
    const body = await request.json()
    const { name, description, configuration, isPublic } = body

    const existingTemplate = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify user owns this template
    const user = await prisma.user.findFirst({
      where: {
        clerkUserId: userId,
        organizationId: existingTemplate.organizationId
      },
    })

    if (!user || existingTemplate.createdByUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update the template
    const updatedTemplate = await prisma.reportTemplate.update({
      where: { id: templateId },
      data: {
        name,
        description,
        configuration,
        isPublic,
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

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Error updating report template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE report template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { templateId } = params

    const existingTemplate = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify user owns this template
    const user = await prisma.user.findFirst({
      where: {
        clerkUserId: userId,
        organizationId: existingTemplate.organizationId
      },
    })

    if (!user || existingTemplate.createdByUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the template
    await prisma.reportTemplate.delete({
      where: { id: templateId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting report template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
