import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Use verifyEventAccess for consistent auth across all routes
    const { error, user, event, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Event Registrations]',
    })

    if (error) {
      return error
    }

    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    console.log('[GET Event Registrations] Fetching registrations for event:', event?.name)

    // Fetch registrations with payment data - filter by organizationId for security
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        eventId: eventId,
        organizationId: effectiveOrgId,
      },
      include: {
        participants: {
          select: {
            id: true,
            liabilityFormCompleted: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'desc',
      },
    })

    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: {
        eventId: eventId,
        organizationId: effectiveOrgId,
      },
      include: {
        liabilityForms: {
          select: {
            id: true,
            completed: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'desc',
      },
    })

    // Check if event requires liability forms for individuals
    const eventSettings = await prisma.eventSettings.findUnique({
      where: { eventId },
      select: { liabilityFormsRequiredIndividual: true },
    })
    const individualFormsRequired = eventSettings?.liabilityFormsRequiredIndividual ?? false

    // Fetch payment balances
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: {
        eventId: eventId,
      },
    })

    // Create a map of payment balances by registration ID
    const paymentMap = new Map(
      paymentBalances.map((pb: any) => [pb.registrationId, pb])
    )

    // Transform group registrations with payment data
    const groupRegs = groupRegistrations.map((reg: any) => {
      const payment: any = paymentMap.get(reg.id)
      const completedForms = reg.participants.filter(
        (p: any) => p.liabilityFormCompleted
      ).length

      return {
        id: reg.id,
        type: 'group' as const,
        groupName: reg.groupName,
        parishName: reg.parishName,
        leaderName: reg.groupLeaderName,
        leaderEmail: reg.groupLeaderEmail,
        leaderPhone: reg.groupLeaderPhone,
        participantCount: reg.participants.length,
        housingType: reg.housingType,
        registeredAt: reg.registeredAt.toISOString(),
        totalAmount: payment?.totalAmountDue ? Number(payment.totalAmountDue) : 0,
        amountPaid: payment?.amountPaid ? Number(payment.amountPaid) : 0,
        balance: payment?.amountRemaining ? Number(payment.amountRemaining) : 0,
        paymentStatus: payment?.paymentStatus || 'pending',
        formsCompleted: completedForms,
        formsTotal: reg.participants.length,
      }
    })

    // Transform individual registrations with payment data
    const individualRegs = individualRegistrations.map((reg: any) => {
      const payment: any = paymentMap.get(reg.id)

      // Determine form status for individual
      let formStatus: 'complete' | 'pending' | 'not_required' = 'not_required'
      if (individualFormsRequired) {
        if (reg.liabilityForms && reg.liabilityForms.length > 0) {
          const hasCompletedForm = reg.liabilityForms.some((f: any) => f.completed)
          formStatus = hasCompletedForm ? 'complete' : 'pending'
        } else {
          formStatus = 'pending'
        }
      }

      return {
        id: reg.id,
        type: 'individual' as const,
        firstName: reg.firstName,
        lastName: reg.lastName,
        preferredName: reg.preferredName,
        email: reg.email,
        phone: reg.phone,
        age: reg.age,
        gender: reg.gender,
        street: reg.street,
        city: reg.city,
        state: reg.state,
        zip: reg.zip,
        housingType: reg.housingType,
        roomType: reg.roomType,
        tShirtSize: reg.tShirtSize,
        preferredRoommate: reg.preferredRoommate,
        dietaryRestrictions: reg.dietaryRestrictions,
        adaAccommodations: reg.adaAccommodations,
        emergencyContact1Name: reg.emergencyContact1Name,
        emergencyContact1Phone: reg.emergencyContact1Phone,
        emergencyContact1Relation: reg.emergencyContact1Relation,
        emergencyContact2Name: reg.emergencyContact2Name,
        emergencyContact2Phone: reg.emergencyContact2Phone,
        emergencyContact2Relation: reg.emergencyContact2Relation,
        registeredAt: reg.registeredAt.toISOString(),
        totalAmount: payment?.totalAmountDue ? Number(payment.totalAmountDue) : 0,
        amountPaid: payment?.amountPaid ? Number(payment.amountPaid) : 0,
        balance: payment?.amountRemaining ? Number(payment.amountRemaining) : 0,
        paymentStatus: payment?.paymentStatus || 'pending',
        formStatus,
        confirmationCode: reg.confirmationCode,
      }
    })

    const totalRegistrations = groupRegs.length + individualRegs.length
    const totalParticipants =
      groupRegs.reduce((sum: number, reg: any) => sum + reg.participantCount, 0) +
      individualRegs.length

    return NextResponse.json({
      event: {
        id: eventId,
        name: event?.name || '',
      },
      groupRegistrations: groupRegs,
      individualRegistrations: individualRegs,
      totalRegistrations,
      totalParticipants,
    })
  } catch (error) {
    console.error('Error fetching event registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
