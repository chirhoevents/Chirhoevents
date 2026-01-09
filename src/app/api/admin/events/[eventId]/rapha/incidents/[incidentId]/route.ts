import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

// GET: Get single incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; incidentId: string }> }
) {
  try {
    const { eventId, incidentId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Rapha Get Incident]',
    })
    if (error) return error

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Get incident with updates
    const incident = await prisma.medicalIncident.findFirst({
      where: {
        id: incidentId,
        eventId,
      },
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!incident) {
      return NextResponse.json(
        { message: 'Incident not found' },
        { status: 404 }
      )
    }

    // Get participant info
    let participant = null
    if (incident.participantId) {
      const p = await prisma.participant.findUnique({
        where: { id: incident.participantId },
        include: {
          groupRegistration: {
            select: {
              groupName: true,
              parishName: true,
            },
          },
        },
      })
      if (p) {
        // Get liability form for medical info
        const form = await prisma.liabilityForm.findFirst({
          where: {
            participantId: incident.participantId,
            eventId,
            completed: true,
          },
        })

        participant = {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          age: p.age,
          gender: p.gender,
          groupName: p.groupRegistration.groupName,
          parishName: p.groupRegistration.parishName,
          allergies: form?.allergies,
          medicalConditions: form?.medicalConditions,
          medications: form?.medications,
          emergencyContact1: {
            name: form?.emergencyContact1Name,
            phone: form?.emergencyContact1Phone,
            relation: form?.emergencyContact1Relation,
          },
          emergencyContact2: {
            name: form?.emergencyContact2Name,
            phone: form?.emergencyContact2Phone,
            relation: form?.emergencyContact2Relation,
          },
        }
      }
    }

    // Log access
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'view_incident',
        resourceType: 'incident',
        resourceId: incidentId,
        details: `Viewed incident ${incident.incidentType}`,
      },
    })

    return NextResponse.json({
      incident: {
        id: incident.id,
        type: incident.incidentType,
        severity: incident.severity,
        status: incident.status,
        date: incident.incidentDate,
        time: incident.incidentTime,
        location: incident.location,
        description: incident.description,
        treatment: incident.treatmentProvided,
        staffName: incident.staffMemberName,
        staffUserId: incident.staffMemberUserId,
        parentContacted: incident.parentContacted,
        parentContactTime: incident.parentContactTime,
        parentContactMethod: incident.parentContactMethod,
        parentContactNotes: incident.parentContactNotes,
        ambulanceCalled: incident.ambulanceCalled,
        sentToHospital: incident.sentToHospital,
        hospitalName: incident.hospitalName,
        disposition: incident.participantDisposition,
        followUpRequired: incident.followUpRequired,
        followUpNotes: incident.followUpNotes,
        nextCheckTime: incident.nextCheckTime,
        resolvedAt: incident.resolvedAt,
        resolutionNotes: incident.resolutionNotes,
        updates: incident.updates,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
      },
      participant,
    })
  } catch (error) {
    console.error('Failed to get incident:', error)
    return NextResponse.json(
      { message: 'Failed to get incident' },
      { status: 500 }
    )
  }
}

// PUT: Update incident
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; incidentId: string }> }
) {
  try {
    const { eventId, incidentId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Rapha Update Incident]',
    })
    if (error) return error
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

    const {
      updateNote,
      status,
      severity,
      treatment,
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

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (status !== undefined) updateData.status = status
    if (severity !== undefined) updateData.severity = severity
    if (treatment !== undefined) updateData.treatmentProvided = treatment
    if (parentContacted !== undefined) updateData.parentContacted = parentContacted
    if (parentContactTime !== undefined) updateData.parentContactTime = new Date(parentContactTime)
    if (parentContactMethod !== undefined) updateData.parentContactMethod = parentContactMethod
    if (parentContactNotes !== undefined) updateData.parentContactNotes = parentContactNotes
    if (ambulanceCalled !== undefined) updateData.ambulanceCalled = ambulanceCalled
    if (sentToHospital !== undefined) updateData.sentToHospital = sentToHospital
    if (hospitalName !== undefined) updateData.hospitalName = hospitalName
    if (participantDisposition !== undefined) updateData.participantDisposition = participantDisposition
    if (followUpRequired !== undefined) updateData.followUpRequired = followUpRequired
    if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes
    if (nextCheckTime !== undefined) {
      updateData.nextCheckTime = nextCheckTime ? new Date(nextCheckTime) : null
    }

    // Update incident
    const incident = await prisma.medicalIncident.update({
      where: { id: incidentId },
      data: updateData,
    })

    // Create update record if there's an update note
    if (updateNote && updateNote.trim()) {
      await prisma.medicalIncidentUpdate.create({
        data: {
          incidentId,
          updateText: updateNote,
          updatedByName: `${user.firstName} ${user.lastName}`,
          updatedByUserId: user.id,
        },
      })
    }

    // Log access
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'update_incident',
        resourceType: 'incident',
        resourceId: incidentId,
        details: updateNote || 'Updated incident',
      },
    })

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        status: incident.status,
        updatedAt: incident.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to update incident:', error)
    return NextResponse.json(
      { message: 'Failed to update incident' },
      { status: 500 }
    )
  }
}
