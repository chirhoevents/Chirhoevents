import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; incidentId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId, incidentId } = params
    const body = await request.json()

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Verify incident exists
    const existingIncident = await prisma.medicalIncident.findFirst({
      where: {
        id: incidentId,
        eventId,
      },
    })

    if (!existingIncident) {
      return NextResponse.json(
        { message: 'Incident not found' },
        { status: 404 }
      )
    }

    if (existingIncident.status === 'resolved') {
      return NextResponse.json(
        { message: 'Incident is already resolved' },
        { status: 400 }
      )
    }

    const { resolutionNotes, participantDisposition } = body

    // Update incident to resolved
    const incident = await prisma.medicalIncident.update({
      where: { id: incidentId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || 'Resolved without additional notes',
        participantDisposition:
          participantDisposition || existingIncident.participantDisposition || 'returned_to_activities',
        followUpRequired: false,
        nextCheckTime: null,
      },
    })

    // Create update record
    await prisma.medicalIncidentUpdate.create({
      data: {
        incidentId,
        updateText: `Incident resolved. ${resolutionNotes || ''}`.trim(),
        updatedByName: `${user.firstName} ${user.lastName}`,
        updatedByUserId: user.id,
      },
    })

    // Log access
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'resolve_incident',
        resourceType: 'incident',
        resourceId: incidentId,
        details: resolutionNotes || 'Incident resolved',
      },
    })

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        status: incident.status,
        resolvedAt: incident.resolvedAt,
      },
    })
  } catch (error) {
    console.error('Failed to resolve incident:', error)
    return NextResponse.json(
      { message: 'Failed to resolve incident' },
      { status: 500 }
    )
  }
}
