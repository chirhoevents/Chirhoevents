import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

// GET: Get all incidents for a participant (for printing visit history)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; participantId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { eventId, participantId } = await params
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')

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
      include: {
        organization: {
          select: { name: true, logoUrl: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Get participant info from LiabilityForm
    // participantId here could be either the Participant ID or LiabilityForm ID
    // Skip this query if participantId is 'unknown' (not a valid UUID)
    let liabilityForm = null
    if (participantId !== 'unknown') {
      liabilityForm = await prisma.liabilityForm.findFirst({
        where: {
          OR: [
            { id: participantId },
            { participantId: participantId },
          ],
          eventId,
        },
        include: {
          groupRegistration: {
            select: { groupName: true, parishName: true },
          },
        },
      })
    }

    // If no liability form found and we have an incident ID, try to find by incident's stored name
    if (!liabilityForm && incidentId) {
      const incident = await prisma.medicalIncident.findUnique({
        where: { id: incidentId },
      })

      if (incident?.participantName) {
        // Parse name and search for matching liability form
        const nameParts = incident.participantName.split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ')

        liabilityForm = await prisma.liabilityForm.findFirst({
          where: {
            eventId,
            participantFirstName: { equals: firstName, mode: 'insensitive' },
            participantLastName: { equals: lastName, mode: 'insensitive' },
          },
          include: {
            groupRegistration: {
              select: { groupName: true, parishName: true },
            },
          },
        })
      }
    }

    // If still no liability form, try to find by searching with the participantId as a name lookup fallback
    if (!liabilityForm && participantId !== 'unknown') {
      // Try to find by participant record
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          liabilityForms: {
            where: { eventId },
            include: {
              groupRegistration: {
                select: { groupName: true, parishName: true },
              },
            },
            take: 1,
          },
        },
      })

      if (participant?.liabilityForms[0]) {
        liabilityForm = participant.liabilityForms[0]
      }
    }

    if (!liabilityForm) {
      // If we still can't find a liability form but have an incident, create a minimal response
      if (incidentId) {
        const incident = await prisma.medicalIncident.findUnique({
          where: { id: incidentId },
          include: {
            updates: {
              orderBy: { createdAt: 'asc' },
            },
          },
        })

        if (incident) {
          // Return just this incident with stored info
          return NextResponse.json({
            participant: {
              name: incident.participantName || 'Unknown',
              preferredName: null,
              age: incident.participantAge,
              gender: null,
              groupName: incident.groupName || 'Unknown',
              parishName: null,
              allergies: null,
              medicalConditions: null,
              medications: null,
              emergencyContact1: { name: null, phone: null, relation: null },
              emergencyContact2: { name: null, phone: null, relation: null },
              insuranceProvider: null,
              insurancePolicyNumber: null,
            },
            event: {
              name: event.name,
              organizationName: event.organization.name,
              startDate: event.startDate,
              endDate: event.endDate,
            },
            incidents: [{
              id: incident.id,
              type: incident.incidentType,
              severity: incident.severity,
              status: incident.status,
              date: incident.incidentDate,
              time: incident.incidentTime,
              location: incident.location,
              description: incident.description,
              treatmentProvided: incident.treatmentProvided,
              staffMemberName: incident.staffMemberName,
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
              createdAt: incident.createdAt,
              updates: incident.updates.map((u: any) => ({
                text: u.updateText,
                by: u.updatedByName,
                at: u.createdAt,
              })),
            }],
            generatedAt: new Date().toISOString(),
            generatedBy: `${user.firstName} ${user.lastName}`,
          })
        }
      }

      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      )
    }

    // Get all incidents for this participant
    const incidents = await prisma.medicalIncident.findMany({
      where: {
        eventId,
        OR: [
          { participantId: participantId },
          { liabilityFormId: participantId },
          { liabilityFormId: liabilityForm.id },
          ...(liabilityForm.participantId ? [{ participantId: liabilityForm.participantId }] : []),
        ],
      },
      include: {
        updates: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [
        { incidentDate: 'desc' },
        { incidentTime: 'desc' },
      ],
    })

    // Log access for HIPAA compliance
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'view_participant_incidents',
        resourceType: 'participant_incidents',
        resourceId: participantId,
        details: `Viewed incident history for ${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}`,
      },
    })

    return NextResponse.json({
      participant: {
        name: `${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}`,
        preferredName: liabilityForm.participantPreferredName,
        age: liabilityForm.participantAge,
        gender: liabilityForm.participantGender,
        groupName: liabilityForm.groupRegistration?.groupName || 'Individual',
        parishName: liabilityForm.groupRegistration?.parishName,
        allergies: liabilityForm.allergies,
        medicalConditions: liabilityForm.medicalConditions,
        medications: liabilityForm.medications,
        emergencyContact1: {
          name: liabilityForm.emergencyContact1Name,
          phone: liabilityForm.emergencyContact1Phone,
          relation: liabilityForm.emergencyContact1Relation,
        },
        emergencyContact2: {
          name: liabilityForm.emergencyContact2Name,
          phone: liabilityForm.emergencyContact2Phone,
          relation: liabilityForm.emergencyContact2Relation,
        },
        insuranceProvider: liabilityForm.insuranceProvider,
        insurancePolicyNumber: liabilityForm.insurancePolicyNumber,
      },
      event: {
        name: event.name,
        organizationName: event.organization.name,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      incidents: incidents.map((incident: any) => ({
        id: incident.id,
        type: incident.incidentType,
        severity: incident.severity,
        status: incident.status,
        date: incident.incidentDate,
        time: incident.incidentTime,
        location: incident.location,
        description: incident.description,
        treatmentProvided: incident.treatmentProvided,
        staffMemberName: incident.staffMemberName,
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
        createdAt: incident.createdAt,
        updates: incident.updates.map((u: any) => ({
          text: u.updateText,
          by: u.updatedByName,
          at: u.createdAt,
        })),
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: `${user.firstName} ${user.lastName}`,
    })
  } catch (error) {
    console.error('Failed to get participant incidents:', error)
    return NextResponse.json(
      { message: 'Failed to get participant incidents' },
      { status: 500 }
    )
  }
}
