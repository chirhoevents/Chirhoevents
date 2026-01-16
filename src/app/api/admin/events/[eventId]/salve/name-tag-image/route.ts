import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { uploadNameTagImage, deleteNameTagImage, NameTagImageType } from '@/lib/r2/upload-name-tag-image'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'
import { incrementOrgStorage } from '@/lib/storage/track-storage'

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

// POST - Upload a name tag image (logo or background)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const imageType = formData.get('type') as NameTagImageType

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!imageType || !['logo', 'background'].includes(imageType)) {
      return NextResponse.json(
        { error: 'Invalid image type. Must be "logo" or "background"' },
        { status: 400 }
      )
    }

    // Validate file type (images only)
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max for backgrounds, 2MB for logos)
    const maxSize = imageType === 'background' ? 5 * 1024 * 1024 : 2 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${imageType === 'background' ? '5MB' : '2MB'}` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const imageUrl = await uploadNameTagImage(buffer, file.name, eventId, imageType)

    // Get event to track storage for the organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    })

    if (event) {
      await incrementOrgStorage(event.organizationId, file.size)
    }

    // Update the name tag template in database
    const updateData = imageType === 'logo'
      ? { logoUrl: imageUrl }
      : { backgroundUrl: imageUrl }

    await prisma.nameTagTemplate.upsert({
      where: { eventId },
      create: {
        eventId,
        ...updateData,
      },
      update: updateData,
    })

    return NextResponse.json({
      success: true,
      imageUrl,
      type: imageType,
    })
  } catch (error: any) {
    console.error('Error uploading name tag image:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please sign in to upload images' },
        { status: 401 }
      )
    }
    if (error.message === 'Access denied' || error.message === 'Access denied to this event') {
      return NextResponse.json(
        { error: 'You do not have permission to upload images for this event' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a name tag image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const { searchParams } = new URL(request.url)
    const imageType = searchParams.get('type') as NameTagImageType

    if (!imageType || !['logo', 'background'].includes(imageType)) {
      return NextResponse.json(
        { error: 'Invalid image type. Must be "logo" or "background"' },
        { status: 400 }
      )
    }

    // Delete from R2
    await deleteNameTagImage(eventId, imageType)

    // Update the name tag template in database
    const updateData = imageType === 'logo'
      ? { logoUrl: null }
      : { backgroundUrl: null }

    await prisma.nameTagTemplate.update({
      where: { eventId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      type: imageType,
    })
  } catch (error: any) {
    console.error('Error deleting name tag image:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please sign in to delete images' },
        { status: 401 }
      )
    }
    if (error.message === 'Access denied' || error.message === 'Access denied to this event') {
      return NextResponse.json(
        { error: 'You do not have permission to delete images for this event' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete image' },
      { status: 500 }
    )
  }
}
