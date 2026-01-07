import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { parseQRCodeData } from '@/lib/qr-code'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireAdmin()
    const organizationId = await getEffectiveOrgId(user as any)
    const { eventId } = await params
    const { searchParams } = new URL(request.url)

    const participantId = searchParams.get('participantId')
    const qrCode = searchParams.get('qrCode') // Raw QR code data to parse

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
        organizationId: organizationId,
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Determine the participant ID to look up
    let lookupParticipantId = participantId

    // If raw QR code data is provided, parse it
    if (qrCode && !participantId) {
      const parsed = parseQRCodeData(qrCode)
      if (parsed.type === 'participant' && parsed.participantId) {
        lookupParticipantId = parsed.participantId
      } else {
        return NextResponse.json(
          { message: 'Invalid QR code format. Expected participant QR code.' },
          { status: 400 }
        )
      }
    }

    if (!lookupParticipantId) {
      return NextResponse.json(
        { message: 'participantId or qrCode parameter is required' },
        { status: 400 }
      )
    }

    // Look up participant and their medical information
    const participant = await prisma.participant.findFirst({
      where: {
        id: lookupParticipantId,
        groupRegistration: {
          eventId,
        },
      },
      include: {
        groupRegistration: {
          select: {
            groupName: true,
            dioceseName: true,
            groupLeaderName: true,
            groupLeaderPhone: true,
          },
        },
        liabilityForms: {
          where: {
            completed: true,
          },
          orderBy: {
            completedAt: 'desc',
          },
          take: 1,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      )
    }

    // Get liability form data for medical information
    const liabilityForm = participant.liabilityForms[0]

    // Check for incidents
    const incidents = await prisma.medicalIncident.findMany({
      where: {
        participantId: lookupParticipantId,
        eventId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    // Format response with medical information
    const hasSevereAllergy =
      liabilityForm?.allergies?.toLowerCase().includes('epi') ||
      liabilityForm?.allergies?.toLowerCase().includes('severe') ||
      false

    return NextResponse.json({
      participant: {
        id: participant.id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        preferredName: participant.preferredName,
        age: participant.age,
        gender: participant.gender,
        participantType: participant.participantType,
        groupName: participant.groupRegistration.groupName,
        diocese: participant.groupRegistration.dioceseName,
        groupLeader: {
          name: participant.groupRegistration.groupLeaderName,
          phone: participant.groupRegistration.groupLeaderPhone,
        },
        checkedIn: participant.checkedIn,
        checkedInAt: participant.checkedInAt,
      },
      medical: {
        hasSevereAllergy,
        allergies: liabilityForm?.allergies || null,
        medicalConditions: liabilityForm?.medicalConditions || null,
        medications: liabilityForm?.medications || null,
        dietaryRestrictions: liabilityForm?.dietaryRestrictions || null,
        adaAccommodations: liabilityForm?.adaAccommodations || null,
        insuranceProvider: liabilityForm?.insuranceProvider || null,
        insurancePolicyNumber: liabilityForm?.insurancePolicyNumber || null,
        insuranceGroupNumber: liabilityForm?.insuranceGroupNumber || null,
      },
      emergencyContacts: liabilityForm ? [
        liabilityForm.emergencyContact1Name ? {
          name: liabilityForm.emergencyContact1Name,
          phone: liabilityForm.emergencyContact1Phone,
          relation: liabilityForm.emergencyContact1Relation,
        } : null,
        liabilityForm.emergencyContact2Name ? {
          name: liabilityForm.emergencyContact2Name,
          phone: liabilityForm.emergencyContact2Phone,
          relation: liabilityForm.emergencyContact2Relation,
        } : null,
      ].filter(Boolean) : [],
      recentIncidents: incidents.map((incident: any) => ({
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        description: incident.description,
        createdAt: incident.createdAt,
      })),
      lookupType: 'participant',
    })
  } catch (error) {
    console.error('Failed to lookup participant:', error)
    return NextResponse.json(
      { message: 'Failed to lookup participant' },
      { status: 500 }
    )
  }
}
