import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { uploadPacketInsert, deletePacketInsert } from '@/lib/r2/upload-packet-insert'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'
import { incrementOrgStorage, decrementOrgStorage } from '@/lib/storage/track-storage'

// Helper function to check if user can access Salve portal
async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if user has salve.access permission (covers salve_coordinator, event_manager, org_admin, master_admin)
  // Also check custom permissions for salve_user role or explicit portal access
  const hasSalvePermission = hasPermission(user.role, 'salve.access')
  const hasCustomSalveAccess = user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true

  if (!hasSalvePermission && !hasCustomSalveAccess) {
    console.error(`[SALVE] ❌ User ${user.email} (role: ${user.role}) lacks salve.access permission`)
    throw new Error('Access denied - SALVE portal access required')
  }

  // Verify the event belongs to the user's organization (unless master_admin)
  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      throw new Error('Access denied to this event')
    }
  }

  return user
}

// GET - List all inserts for the event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const inserts = await prisma.welcomePacketInsert.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({ inserts })
  } catch (error) {
    console.error('Failed to fetch inserts:', error)
    return NextResponse.json(
      { message: 'Failed to fetch inserts' },
      { status: 500 }
    )
  }
}

// POST - Create a new insert (with optional file upload)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    try {
      await requireSalveAccess(request, eventId)
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Unauthorized'
      return NextResponse.json({ message }, { status: 403 })
    }

    // Get event to find organization ID for file storage
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    const contentType = request.headers.get('content-type') || ''

    // Handle file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const name = formData.get('name') as string

      if (!file) {
        return NextResponse.json(
          { message: 'File is required' },
          { status: 400 }
        )
      }

      if (!name?.trim()) {
        return NextResponse.json(
          { message: 'Name is required' },
          { status: 400 }
        )
      }

      // Validate file type (PDF or images)
      const isPdf = file.type.includes('pdf')
      const isImage = file.type.startsWith('image/')
      const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

      if (!isPdf && !allowedImageTypes.includes(file.type)) {
        return NextResponse.json(
          { message: 'Only PDF and image files (PNG, JPG, WEBP) are accepted' },
          { status: 400 }
        )
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        return NextResponse.json(
          { message: 'File size must be less than 10MB' },
          { status: 400 }
        )
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to R2
      const fileUrl = await uploadPacketInsert(
        buffer,
        file.name,
        event.organizationId,
        eventId
      )

      // Track storage usage
      await incrementOrgStorage(event.organizationId, file.size)

      // Get current max display order
      const maxOrder = await prisma.welcomePacketInsert.aggregate({
        where: { eventId },
        _max: { displayOrder: true },
      })

      // Determine file type for direct embedding
      const fileType = isImage ? 'image' : 'pdf'

      // Create insert record
      const insert = await prisma.welcomePacketInsert.create({
        data: {
          eventId,
          name: name.trim(),
          fileUrl,
          fileType,
          fileSizeBytes: BigInt(file.size),
          // Only include imageUrls for images (can be embedded directly in print)
          ...(isImage ? { imageUrls: [fileUrl] } : {}),
          displayOrder: (maxOrder._max.displayOrder || 0) + 1,
          isActive: true,
        },
      })

      return NextResponse.json({ insert })
    }

    // Handle JSON request (text-only insert without file)
    const body = await request.json()
    const { name, fileUrl } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      )
    }

    // Get current max display order
    const maxOrder = await prisma.welcomePacketInsert.aggregate({
      where: { eventId },
      _max: { displayOrder: true },
    })

    const insert = await prisma.welcomePacketInsert.create({
      data: {
        eventId,
        name: name.trim(),
        fileUrl: fileUrl || '',
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        isActive: true,
      },
    })

    return NextResponse.json({ insert })
  } catch (error) {
    console.error('Failed to create insert:', error)
    const message = error instanceof Error ? error.message : 'Failed to create insert'
    return NextResponse.json(
      { message },
      { status: 500 }
    )
  }
}

// PUT - Update insert order or toggle active status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)
    const body = await request.json()
    const { inserts, insertId, isActive } = body

    // Bulk update order
    if (inserts && Array.isArray(inserts)) {
      await prisma.$transaction(
        inserts.map((insert: { id: string; displayOrder: number }) =>
          prisma.welcomePacketInsert.update({
            where: { id: insert.id },
            data: { displayOrder: insert.displayOrder },
          })
        )
      )

      return NextResponse.json({ success: true })
    }

    // Toggle active status
    if (insertId && typeof isActive === 'boolean') {
      const insert = await prisma.welcomePacketInsert.update({
        where: { id: insertId },
        data: { isActive },
      })

      return NextResponse.json({ insert })
    }

    return NextResponse.json(
      { message: 'Invalid request' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to update inserts:', error)
    return NextResponse.json(
      { message: 'Failed to update inserts' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an insert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)
    const { searchParams } = new URL(request.url)
    const insertId = searchParams.get('id')

    if (!insertId) {
      return NextResponse.json(
        { message: 'Insert ID is required' },
        { status: 400 }
      )
    }

    // Get the insert to find file URL and size
    const insert = await prisma.welcomePacketInsert.findFirst({
      where: {
        id: insertId,
        eventId,
      },
    })

    if (!insert) {
      return NextResponse.json(
        { message: 'Insert not found' },
        { status: 404 }
      )
    }

    // Get event to find organization ID for storage tracking
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    })

    // Delete file from R2 if exists
    if (insert.fileUrl) {
      try {
        await deletePacketInsert(insert.fileUrl)
        // Decrement storage if we have the file size and org ID
        if (insert.fileSizeBytes && event) {
          await decrementOrgStorage(event.organizationId, insert.fileSizeBytes)
        }
      } catch (err) {
        console.error('Failed to delete file from R2:', err)
        // Continue with DB deletion even if R2 delete fails
      }
    }

    // Delete from database
    await prisma.welcomePacketInsert.delete({
      where: { id: insertId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete insert:', error)
    return NextResponse.json(
      { message: 'Failed to delete insert' },
      { status: 500 }
    )
  }
}
