import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; participantId: string }> }
) {
  try {
    const { eventId, participantId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Rapha Participant Details]',
    })
    if (error) return error
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Get participant's liability form (which has medical info)
    // participantId might be the participant ID or the liability form ID
    const liabilityForm = await prisma.liabilityForm.findFirst({
      where: {
        eventId,
        OR: [
          { participantId: participantId },
          { id: participantId },
        ],
        completed: true,
      },
      include: {
        groupRegistration: {
          select: {
            id: true,
            groupName: true,
            parishName: true,
            groupLeaderName: true,
            groupLeaderEmail: true,
            groupLeaderPhone: true,
          },
        },
        participant: {
          select: {
            id: true,
            checkedIn: true,
            checkedInAt: true,
          },
        },
      },
    })

    if (!liabilityForm) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      )
    }

    // Get room assignment
    let roomAssignment = null
    if (liabilityForm.participantId) {
      const assignment = await prisma.roomAssignment.findFirst({
        where: {
          participantId: liabilityForm.participantId,
        },
        include: {
          room: {
            include: {
              building: {
                select: { name: true },
              },
            },
          },
        },
      })
      if (assignment) {
        roomAssignment = `${assignment.room.building.name} ${assignment.room.roomNumber}`
      }
    }

    // Get incident history for this participant
    const incidents = await prisma.medicalIncident.findMany({
      where: {
        eventId,
        participantId: liabilityForm.participantId,
      },
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate severity
    const hasSevereAllergy =
      liabilityForm.allergies?.toLowerCase().includes('epi') ||
      liabilityForm.allergies?.toLowerCase().includes('severe') ||
      liabilityForm.allergies?.toLowerCase().includes('anaphyl')

    // Log access for HIPAA compliance
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'view_participant_details',
        resourceType: 'participant',
        resourceId: liabilityForm.participantId || liabilityForm.id,
        details: `Viewed medical profile for ${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}`,
      },
    })

    return NextResponse.json({
      participant: {
        id: liabilityForm.participantId || liabilityForm.id,
        liabilityFormId: liabilityForm.id,
        firstName: liabilityForm.participantFirstName,
        lastName: liabilityForm.participantLastName,
        preferredName: liabilityForm.participantPreferredName,
        age: liabilityForm.participantAge,
        gender: liabilityForm.participantGender,
        email: liabilityForm.participantEmail,
        phone: liabilityForm.participantPhone,
        participantType: liabilityForm.participantType,
        checkedIn: liabilityForm.participant?.checkedIn || false,
        checkedInAt: liabilityForm.participant?.checkedInAt,
        roomAssignment,
        group: liabilityForm.groupRegistration
          ? {
              id: liabilityForm.groupRegistration.id,
              name: liabilityForm.groupRegistration.groupName,
              parish: liabilityForm.groupRegistration.parishName,
              leaderName: liabilityForm.groupRegistration.groupLeaderName,
              leaderEmail: liabilityForm.groupRegistration.groupLeaderEmail,
              leaderPhone: liabilityForm.groupRegistration.groupLeaderPhone,
            }
          : null,
        hasSevereAllergy,
        medical: {
          allergies: liabilityForm.allergies,
          medicalConditions: liabilityForm.medicalConditions,
          medications: liabilityForm.medications,
          dietaryRestrictions: liabilityForm.dietaryRestrictions,
          adaAccommodations: liabilityForm.adaAccommodations,
        },
        emergency: {
          contact1: {
            name: liabilityForm.emergencyContact1Name,
            phone: liabilityForm.emergencyContact1Phone,
            relation: liabilityForm.emergencyContact1Relation,
          },
          contact2: {
            name: liabilityForm.emergencyContact2Name,
            phone: liabilityForm.emergencyContact2Phone,
            relation: liabilityForm.emergencyContact2Relation,
          },
        },
        insurance: {
          provider: liabilityForm.insuranceProvider,
          policyNumber: liabilityForm.insurancePolicyNumber,
          groupNumber: liabilityForm.insuranceGroupNumber,
        },
        parentEmail: liabilityForm.parentEmail,
        formCompletedAt: liabilityForm.completedAt,
        formCompletedBy: liabilityForm.completedByEmail,
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
        treatment: incident.treatmentProvided,
        staffName: incident.staffMemberName,
        parentContacted: incident.parentContacted,
        ambulanceCalled: incident.ambulanceCalled,
        sentToHospital: incident.sentToHospital,
        disposition: incident.participantDisposition,
        resolvedAt: incident.resolvedAt,
        resolutionNotes: incident.resolutionNotes,
        updates: incident.updates,
        createdAt: incident.createdAt,
      })),
    })
  } catch (error) {
    console.error('Failed to get participant details:', error)
    return NextResponse.json(
      { message: 'Failed to get participant details' },
      { status: 500 }
    )
  }
}
