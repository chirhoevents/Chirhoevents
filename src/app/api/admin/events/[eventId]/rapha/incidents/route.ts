import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

// GET: List all incidents
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const { searchParams } = new URL(request.url)

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Verify event exists and belongs to user's org
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(user.role !== 'master_admin' ? { organizationId: user.organizationId } : {}),
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Parse filters
    const status = searchParams.get('status') || 'all' // all, active, monitoring, resolved
    const severity = searchParams.get('severity') || 'all' // all, minor, moderate, severe
    const type = searchParams.get('type') || 'all'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const whereClause: any = { eventId }

    if (status !== 'all') {
      whereClause.status = status
    }

    if (severity !== 'all') {
      whereClause.severity = severity
    }

    if (type !== 'all') {
      whereClause.incidentType = type
    }

    if (dateFrom || dateTo) {
      whereClause.incidentDate = {}
      if (dateFrom) {
        whereClause.incidentDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.incidentDate.lte = new Date(dateTo)
      }
    }

    // Get incidents
    const incidents = await prisma.medicalIncident.findMany({
      where: whereClause,
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [
        { status: 'asc' }, // active first
        { severity: 'desc' }, // severe first
        { createdAt: 'desc' },
      ],
    })

    // Transform incidents - use stored participant info, fall back to lookup for legacy data
    const incidentsWithNames = await Promise.all(
      incidents.map(async (incident) => {
        let participantName = incident.participantName
        let groupName = incident.groupName

        // For legacy incidents without stored names, try to look up
        if (!participantName && incident.participantId) {
          const participant = await prisma.participant.findUnique({
            where: { id: incident.participantId },
            include: { groupRegistration: { select: { groupName: true } } },
          })
          if (participant) {
            participantName = `${participant.firstName} ${participant.lastName}`
            groupName = participant.groupRegistration.groupName
          }
        }

        // Also try LiabilityForm for legacy data
        if (!participantName && incident.liabilityFormId) {
          const form = await prisma.liabilityForm.findUnique({
            where: { id: incident.liabilityFormId },
            include: { groupRegistration: { select: { groupName: true } } },
          })
          if (form) {
            participantName = `${form.participantFirstName} ${form.participantLastName}`
            groupName = form.groupRegistration?.groupName || 'Individual'
          }
        }

        return {
          id: incident.id,
          participantId: incident.participantId,
          liabilityFormId: incident.liabilityFormId,
          participantName: participantName || 'Unknown',
          participantAge: incident.participantAge,
          groupName: groupName || 'Unknown',
          type: incident.incidentType,
          severity: incident.severity,
          status: incident.status,
          date: incident.incidentDate,
          time: incident.incidentTime,
          location: incident.location,
          description: incident.description,
          treatment: incident.treatmentProvided,
          staffName: incident.staffMemberName,
          parentContacted: incident.parentContacted,
          parentContactTime: incident.parentContactTime,
          ambulanceCalled: incident.ambulanceCalled,
          sentToHospital: incident.sentToHospital,
          hospitalName: incident.hospitalName,
          disposition: incident.participantDisposition,
          followUpRequired: incident.followUpRequired,
          nextCheckTime: incident.nextCheckTime,
          resolvedAt: incident.resolvedAt,
          resolutionNotes: incident.resolutionNotes,
          recentUpdates: incident.updates,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
        }
      })
    )

    // Get stats
    const [activeCount, monitoringCount, resolvedCount, totalCount] = await Promise.all([
      prisma.medicalIncident.count({ where: { eventId, status: 'active' } }),
      prisma.medicalIncident.count({ where: { eventId, status: 'monitoring' } }),
      prisma.medicalIncident.count({ where: { eventId, status: 'resolved' } }),
      prisma.medicalIncident.count({ where: { eventId } }),
    ])

    return NextResponse.json({
      incidents: incidentsWithNames,
      stats: {
        active: activeCount,
        monitoring: monitoringCount,
        resolved: resolvedCount,
        total: totalCount,
      },
      filters: { status, severity, type },
    })
  } catch (error) {
    console.error('Failed to get incidents:', error)
    return NextResponse.json(
      { message: 'Failed to get incidents' },
      { status: 500 }
    )
  }
}

// POST: Create new incident
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const body = await request.json()

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Verify event exists and belongs to user's org
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(user.role !== 'master_admin' ? { organizationId: user.organizationId } : {}),
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Validate required fields
    const {
      participantId,
      liabilityFormId,
      incidentType,
      severity,
      description,
      treatmentProvided,
      staffMemberName,
      location,
      incidentDate,
      incidentTime,
      parentContacted,
      parentContactTime,
      parentContactMethod,
      parentContactNotes,
      ambulanceCalled,
      sentToHospital,
      hospitalName,
      participantDisposition,
      followUpRequired,
      followUpNotes,
      nextCheckTime,
    } = body

    if (!incidentType || !severity || !description || !treatmentProvided || !staffMemberName) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get participant info - prefer LiabilityForm, fall back to Participant table
    let participantName: string | null = null
    let participantAge: number | null = null
    let groupName: string | null = null
    let resolvedParticipantId: string | null = participantId || null
    let resolvedLiabilityFormId: string | null = liabilityFormId || null

    // Try to get info from LiabilityForm first
    if (liabilityFormId) {
      const form = await prisma.liabilityForm.findUnique({
        where: { id: liabilityFormId },
        include: {
          groupRegistration: { select: { groupName: true } },
        },
      })
      if (form) {
        participantName = `${form.participantFirstName} ${form.participantLastName}`
        participantAge = form.participantAge
        groupName = form.groupRegistration?.groupName || 'Individual'
        // Also get the linked participantId if available
        if (form.participantId) {
          resolvedParticipantId = form.participantId
        }
      }
    }

    // If no LiabilityForm, try Participant table
    if (!participantName && participantId) {
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          groupRegistration: { select: { groupName: true } },
          liabilityForm: { select: { id: true, participantAge: true } },
        },
      })
      if (participant) {
        participantName = `${participant.firstName} ${participant.lastName}`
        participantAge = participant.liabilityForm?.participantAge || null
        groupName = participant.groupRegistration.groupName
        if (participant.liabilityForm?.id) {
          resolvedLiabilityFormId = participant.liabilityForm.id
        }
      }
    }

    // Determine initial status
    let status: 'active' | 'monitoring' | 'resolved' = 'active'
    if (participantDisposition === 'returned_to_activities' && !followUpRequired) {
      status = 'resolved'
    } else if (followUpRequired || participantDisposition === 'resting_in_health_office') {
      status = 'monitoring'
    }

    // Create incident with stored participant info
    const incident = await prisma.medicalIncident.create({
      data: {
        eventId,
        participantId: resolvedParticipantId,
        liabilityFormId: resolvedLiabilityFormId,
        participantName,
        participantAge,
        groupName,
        incidentType,
        severity,
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        incidentTime: incidentTime || new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' }),
        location: location || null,
        description,
        treatmentProvided,
        staffMemberName,
        staffMemberUserId: user.id,
        parentContacted: parentContacted || false,
        parentContactTime: parentContactTime ? new Date(parentContactTime) : null,
        parentContactMethod: parentContactMethod || null,
        parentContactNotes: parentContactNotes || null,
        ambulanceCalled: ambulanceCalled || false,
        sentToHospital: sentToHospital || false,
        hospitalName: hospitalName || null,
        status,
        participantDisposition: participantDisposition || null,
        followUpRequired: followUpRequired || false,
        followUpNotes: followUpNotes || null,
        nextCheckTime: nextCheckTime ? new Date(nextCheckTime) : null,
        resolvedAt: status === 'resolved' ? new Date() : null,
      },
    })

    // Log access for HIPAA compliance
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'create_incident',
        resourceType: 'incident',
        resourceId: incident.id,
        details: `Created ${severity} ${incidentType} incident for ${participantName || 'Unknown'}`,
      },
    })

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        participantName: participantName || 'Unknown',
        groupName: groupName || 'Unknown',
        type: incident.incidentType,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt,
      },
    })
  } catch (error) {
    console.error('Failed to create incident:', error)
    return NextResponse.json(
      { message: 'Failed to create incident' },
      { status: 500 }
    )
  }
}
