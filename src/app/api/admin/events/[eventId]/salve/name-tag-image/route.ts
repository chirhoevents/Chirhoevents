import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { uploadNameTagImage, deleteNameTagImage, NameTagImageType } from '@/lib/r2/upload-name-tag-image'

// Helper function to check if user can access Salve portal
async function requireSalveAccess(eventId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Admins always have access
  if (isAdmin(user)) {
    return user
  }

  // Check for Salve-specific roles
  const portalRoles = ['salve_user', 'salve_coordinator', 'portals.salve.view']
  const hasPortalRole = user.permissions
    ? portalRoles.some(role => user.permissions?.[role] === true)
    : false

  if (!hasPortalRole) {
    throw new Error('Access denied')
  }

  // Verify the event belongs to the user's organization
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
  })

  if (!event) {
    throw new Error('Access denied to this event')
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
    await requireSalveAccess(eventId)

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
    await requireSalveAccess(eventId)

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
