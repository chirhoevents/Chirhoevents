import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /manual/lookup-group?accessCode=XXX — verify a group's access code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Manual Liability Form Lookup]',
    })
    if (error) return error

    const accessCode = request.nextUrl.searchParams.get('accessCode')?.trim()
    if (!accessCode) {
      return NextResponse.json({ error: 'accessCode is required' }, { status: 400 })
    }

    const group = await prisma.groupRegistration.findFirst({
      where: { accessCode, eventId },
      select: { id: true, groupName: true, groupLeaderName: true },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'No group found with that access code for this event.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: group.id,
      name: group.groupName,
      leaderName: group.groupLeaderName,
    })
  } catch (err) {
    console.error('[Manual Liability Form Lookup] error:', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Manual Liability Form]',
    })
    if (error) return error
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const {
      formType,
      participantType,
      groupAccessCode,
      participantFirstName,
      participantLastName,
      participantPreferredName,
      participantAge,
      participantGender,
      participantEmail,
      participantPhone,
      tShirtSize,
      // clergy/religious fields
      clergyTitle,
      dioceseOfIncardination,
      currentAssignment,
      facultyInformation,
      needsHousing,
      // medical
      medicalConditions,
      medications,
      allergies,
      dietaryRestrictions,
      adaAccommodations,
      // emergency contacts
      emergencyContact1Name,
      emergencyContact1Phone,
      emergencyContact1Relation,
      emergencyContact2Name,
      emergencyContact2Phone,
      emergencyContact2Relation,
      // insurance
      insuranceProvider,
      insurancePolicyNumber,
      insuranceGroupNumber,
      // signature
      signerFullLegalName,
      dateSigned,
    } = body

    if (!formType || !participantFirstName || !participantLastName) {
      return NextResponse.json(
        { error: 'formType, participantFirstName, and participantLastName are required' },
        { status: 400 }
      )
    }

    const validFormTypes = ['youth_u18', 'youth_o18_chaperone', 'clergy', 'religious']
    if (!validFormTypes.includes(formType)) {
      return NextResponse.json({ error: 'Invalid formType' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizationId: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Resolve group registration ID from access code (if provided)
    let groupRegistrationId: string | null = null
    if (groupAccessCode?.trim()) {
      const group = await prisma.groupRegistration.findFirst({
        where: { accessCode: groupAccessCode.trim(), eventId },
        select: { id: true },
      })
      if (!group) {
        return NextResponse.json(
          { error: `No group found with access code "${groupAccessCode.trim()}" for this event.` },
          { status: 400 }
        )
      }
      groupRegistrationId = group.id
    }

    const resolvedParticipantType =
      participantType ||
      (formType === 'youth_u18' ? 'youth_u18' :
       formType === 'clergy' ? 'priest' :
       formType === 'religious' ? 'religious_sister' :
       'youth_o18')

    const form = await prisma.liabilityForm.create({
      data: {
        organizationId: event.organizationId,
        eventId,
        groupRegistrationId,
        formType: formType as any,
        participantType: resolvedParticipantType as any,
        participantFirstName: participantFirstName.trim(),
        participantLastName: participantLastName.trim(),
        participantPreferredName: participantPreferredName?.trim() || null,
        participantAge: participantAge ? parseInt(participantAge, 10) : null,
        participantGender: participantGender || null,
        participantEmail: participantEmail?.trim() || null,
        participantPhone: participantPhone?.trim() || null,
        tShirtSize: tShirtSize || null,
        clergyTitle: clergyTitle || null,
        dioceseOfIncardination: dioceseOfIncardination?.trim() || null,
        currentAssignment: currentAssignment?.trim() || null,
        facultyInformation: facultyInformation?.trim() || null,
        needsHousing: needsHousing ?? null,
        medicalConditions: medicalConditions?.trim() || null,
        medications: medications?.trim() || null,
        allergies: allergies?.trim() || null,
        dietaryRestrictions: dietaryRestrictions?.trim() || null,
        adaAccommodations: adaAccommodations?.trim() || null,
        emergencyContact1Name: emergencyContact1Name?.trim() || null,
        emergencyContact1Phone: emergencyContact1Phone?.trim() || null,
        emergencyContact1Relation: emergencyContact1Relation?.trim() || null,
        emergencyContact2Name: emergencyContact2Name?.trim() || null,
        emergencyContact2Phone: emergencyContact2Phone?.trim() || null,
        emergencyContact2Relation: emergencyContact2Relation?.trim() || null,
        insuranceProvider: insuranceProvider?.trim() || null,
        insurancePolicyNumber: insurancePolicyNumber?.trim() || null,
        insuranceGroupNumber: insuranceGroupNumber?.trim() || null,
        signatureData: {
          full_legal_name: signerFullLegalName?.trim() || `${participantFirstName} ${participantLastName}`,
          initials: (signerFullLegalName || `${participantFirstName} ${participantLastName}`)
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase(),
          date_signed: dateSigned || new Date().toISOString().split('T')[0],
          manually_entered_by: user.email,
        },
        completed: true,
        completedByEmail: user.email,
        completedAt: new Date(),
        formStatus: 'approved',
      },
    })

    return NextResponse.json({ formId: form.id }, { status: 201 })
  } catch (err) {
    console.error('[Manual Liability Form] error:', err)
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
  }
}
