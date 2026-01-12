import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// Get all billing notes
export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const noteType = searchParams.get('noteType')

    const where: Record<string, unknown> = {}

    if (orgId) {
      where.organizationId = orgId
    }

    if (noteType && noteType !== 'all') {
      where.noteType = noteType
    }

    const notes = await prisma.billingNote.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    type NoteType = typeof notes[number]
    return NextResponse.json({
      notes: notes.map((note: NoteType) => ({
        id: note.id,
        organizationId: note.organizationId,
        organizationName: note.organization?.name || 'Unknown',
        paymentId: note.paymentId,
        invoiceId: note.invoiceId,
        noteType: note.noteType,
        note: note.note,
        createdByName: `${note.createdBy.firstName} ${note.createdBy.lastName}`,
        createdAt: note.createdAt,
      })),
    })
  } catch (error) {
    console.error('List billing notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing notes' },
      { status: 500 }
    )
  }
}

// Create a billing note
export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { organizationId, paymentId, invoiceId, noteType, note } = body

    if (!organizationId || !note) {
      return NextResponse.json(
        { error: 'Organization and note are required' },
        { status: 400 }
      )
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const billingNote = await prisma.billingNote.create({
      data: {
        organizationId,
        paymentId: paymentId || null,
        invoiceId: invoiceId || null,
        noteType: noteType || 'general',
        note,
        createdByUserId: user.id,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId,
        userId: user.id,
        activityType: 'billing_note_created',
        description: `Billing note added for ${org.name}: ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      note: {
        id: billingNote.id,
        noteType: billingNote.noteType,
        note: billingNote.note,
        createdByName: `${billingNote.createdBy.firstName} ${billingNote.createdBy.lastName}`,
        createdAt: billingNote.createdAt,
      },
    })
  } catch (error) {
    console.error('Create billing note error:', error)
    return NextResponse.json(
      { error: 'Failed to create billing note' },
      { status: 500 }
    )
  }
}
