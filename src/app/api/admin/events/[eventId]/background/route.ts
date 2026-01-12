import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { uploadEventBackground, deleteEventBackground } from '@/lib/r2/upload-event-background'

/**
 * POST /api/admin/events/[eventId]/background
 * Upload a background image for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify access
    const { error, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Upload Background]',
    })

    if (error) {
      return error
    }

    if (!effectiveOrgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPEG, GIF, or WebP.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max for backgrounds)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const imageUrl = await uploadEventBackground(
      buffer,
      file.name,
      effectiveOrgId,
      eventId
    )

    // Update event settings with new background URL
    await prisma.eventSettings.upsert({
      where: { eventId },
      create: {
        eventId,
        backgroundImageUrl: imageUrl,
      },
      update: {
        backgroundImageUrl: imageUrl,
      },
    })

    return NextResponse.json({
      success: true,
      backgroundImageUrl: imageUrl
    })
  } catch (err) {
    console.error('Error uploading background:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload background' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/events/[eventId]/background
 * Delete the background image for an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify access
    const { error, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Delete Background]',
    })

    if (error) {
      return error
    }

    if (!effectiveOrgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    // Delete from R2
    await deleteEventBackground(effectiveOrgId, eventId)

    // Clear background URL from settings
    await prisma.eventSettings.update({
      where: { eventId },
      data: {
        backgroundImageUrl: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting background:', err)
    return NextResponse.json(
      { error: 'Failed to delete background' },
      { status: 500 }
    )
  }
}
