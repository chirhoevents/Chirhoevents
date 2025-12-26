import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const registrationType = searchParams.get('type') // 'group' or 'individual'

    if (!registrationType || !['group', 'individual'].includes(registrationType)) {
      return NextResponse.json(
        { error: 'Invalid registration type. Must be "group" or "individual".' },
        { status: 400 }
      )
    }

    if (registrationType === 'group') {
      return await getGroupRegistration(params.registrationId, user.organizationId)
    } else {
      return await getIndividualRegistration(params.registrationId, user.organizationId)
    }
  } catch (error) {
    console.error('Error fetching registration view data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getGroupRegistration(registrationId: string, organizationId: string) {
  const registration = await prisma.groupRegistration.findUnique({
    where: { id: registrationId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
      participants: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          age: true,
          gender: true,
          participantType: true,
          tShirtSize: true,
          liabilityFormCompleted: true,
          liabilityFormUrl: true,
          email: true,
        },
        orderBy: { lastName: 'asc' },
      },
    },
  })

  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  if (registration.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch payment balance
  const paymentBalance = await prisma.paymentBalance.findUnique({
    where: { registrationId },
  })

  // Fetch payments
  const payments = await prisma.payment.findMany({
    where: {
      registrationId,
      registrationType: 'group',
    },
    include: {
      processedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch refunds
  const refunds = await prisma.refund.findMany({
    where: {
      registrationId,
      registrationType: 'group',
    },
    include: {
      processedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch email logs
  const emailLogs = await prisma.emailLog.findMany({
    where: {
      registrationId: registrationId,
      registrationType: 'group',
    },
    select: {
      id: true,
      subject: true,
      recipientEmail: true,
      emailType: true,
      sentStatus: true,
      sentAt: true,
      sentVia: true,
    },
    orderBy: { sentAt: 'desc' },
    take: 50,
  })

  // Fetch registration edits (audit log)
  const registrationEdits = await prisma.registrationEdit.findMany({
    where: {
      registrationId,
      registrationType: 'group',
    },
    include: {
      editedBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { editedAt: 'desc' },
    take: 50,
  })

  // Calculate liability forms status
  const liabilityFormsCompleted = registration.participants.filter(
    (p) => p.liabilityFormCompleted
  ).length
  const liabilityFormsTotal = registration.totalParticipants || registration.participants.length
  const liabilityFormsPercentage =
    liabilityFormsTotal > 0
      ? Math.round((liabilityFormsCompleted / liabilityFormsTotal) * 100)
      : 0

  return NextResponse.json({
    id: registration.id,
    groupName: registration.groupName,
    parishName: registration.parishName,
    dioceseName: registration.dioceseName,
    groupLeaderName: registration.groupLeaderName,
    groupLeaderEmail: registration.groupLeaderEmail,
    groupLeaderPhone: registration.groupLeaderPhone,
    groupLeaderStreet: registration.groupLeaderStreet,
    groupLeaderCity: registration.groupLeaderCity,
    groupLeaderState: registration.groupLeaderState,
    groupLeaderZip: registration.groupLeaderZip,
    alternativeContact1Name: registration.alternativeContact1Name,
    alternativeContact1Email: registration.alternativeContact1Email,
    alternativeContact1Phone: registration.alternativeContact1Phone,
    alternativeContact2Name: registration.alternativeContact2Name,
    alternativeContact2Email: registration.alternativeContact2Email,
    alternativeContact2Phone: registration.alternativeContact2Phone,
    accessCode: registration.accessCode,
    youthCount: registration.youthCount,
    chaperoneCount: registration.chaperoneCount,
    priestCount: registration.priestCount,
    totalParticipants: registration.totalParticipants,
    housingType: registration.housingType,
    specialRequests: registration.specialRequests,
    dietaryRestrictionsSummary: registration.dietaryRestrictionsSummary,
    adaAccommodationsSummary: registration.adaAccommodationsSummary,
    registrationStatus: registration.registrationStatus,
    registeredAt: registration.createdAt.toISOString(),
    participants: registration.participants,
    paymentBalance: paymentBalance
      ? {
          totalAmountDue: Number(paymentBalance.totalAmountDue),
          amountPaid: Number(paymentBalance.amountPaid),
          amountRemaining: Number(paymentBalance.amountRemaining),
          lateFeesApplied: Number(paymentBalance.lateFeesApplied),
          paymentStatus: paymentBalance.paymentStatus,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      checkNumber: p.checkNumber,
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
      receiptUrl: p.receiptUrl,
      notes: p.notes,
      processedAt: p.processedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      processedBy: p.processedBy,
    })),
    refunds: refunds.map((r) => ({
      id: r.id,
      refundAmount: Number(r.refundAmount),
      refundMethod: r.refundMethod,
      refundReason: r.refundReason,
      notes: r.notes,
      status: r.status,
      processedAt: r.createdAt.toISOString(),
      processedBy: r.processedBy,
    })),
    emailLogs,
    registrationEdits: registrationEdits.map((e) => ({
      id: e.id,
      editType: e.editType,
      changesMade: e.changesMade,
      oldTotal: e.oldTotal ? Number(e.oldTotal) : null,
      newTotal: e.newTotal ? Number(e.newTotal) : null,
      difference: e.difference ? Number(e.difference) : null,
      adminNotes: e.adminNotes,
      editedAt: e.editedAt.toISOString(),
      editedBy: e.editedBy,
    })),
    event: {
      id: registration.event.id,
      name: registration.event.name,
      startDate: registration.event.startDate?.toISOString() || '',
      endDate: registration.event.endDate?.toISOString() || '',
    },
    liabilityFormsCompleted,
    liabilityFormsTotal,
    liabilityFormsPercentage,
  })
}

async function getIndividualRegistration(registrationId: string, organizationId: string) {
  const registration = await prisma.individualRegistration.findUnique({
    where: { id: registrationId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  })

  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  if (registration.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch payment balance
  const paymentBalance = await prisma.paymentBalance.findUnique({
    where: { registrationId },
  })

  // Fetch payments
  const payments = await prisma.payment.findMany({
    where: {
      registrationId,
      registrationType: 'individual',
    },
    include: {
      processedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch refunds
  const refunds = await prisma.refund.findMany({
    where: {
      registrationId,
      registrationType: 'individual',
    },
    include: {
      processedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch email logs
  const emailLogs = await prisma.emailLog.findMany({
    where: {
      registrationId: registrationId,
      registrationType: 'individual',
    },
    select: {
      id: true,
      subject: true,
      recipientEmail: true,
      emailType: true,
      sentStatus: true,
      sentAt: true,
      sentVia: true,
    },
    orderBy: { sentAt: 'desc' },
    take: 50,
  })

  // Fetch registration edits (audit log)
  const registrationEdits = await prisma.registrationEdit.findMany({
    where: {
      registrationId,
      registrationType: 'individual',
    },
    include: {
      editedBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { editedAt: 'desc' },
    take: 50,
  })

  // Fetch liability forms for individual from LiabilityForm table
  const liabilityFormsDb = await prisma.liabilityForm.findMany({
    where: {
      individualRegistrationId: registrationId,
    },
    select: {
      id: true,
      status: true,
      completedAt: true,
    },
  })

  const liabilityForms = liabilityFormsDb.length > 0
    ? liabilityFormsDb.map((form) => ({
        id: form.id,
        completed: form.status === 'completed',
        completedAt: form.completedAt?.toISOString() || null,
      }))
    : [
        {
          id: registration.id,
          completed: false,
          completedAt: null,
        },
      ]

  return NextResponse.json({
    id: registration.id,
    firstName: registration.firstName,
    lastName: registration.lastName,
    preferredName: registration.preferredName,
    email: registration.email,
    phone: registration.phone,
    street: registration.street,
    city: registration.city,
    state: registration.state,
    zip: registration.zip,
    age: registration.age,
    gender: registration.gender,
    housingType: registration.housingType,
    roomType: registration.roomType,
    preferredRoommate: registration.preferredRoommate,
    tShirtSize: registration.tShirtSize,
    dietaryRestrictions: registration.dietaryRestrictions,
    adaAccommodations: registration.adaAccommodations,
    emergencyContact1Name: registration.emergencyContact1Name,
    emergencyContact1Phone: registration.emergencyContact1Phone,
    emergencyContact1Relation: registration.emergencyContact1Relation,
    emergencyContact2Name: registration.emergencyContact2Name,
    emergencyContact2Phone: registration.emergencyContact2Phone,
    emergencyContact2Relation: registration.emergencyContact2Relation,
    registrationStatus: registration.registrationStatus,
    confirmationCode: registration.confirmationCode,
    registeredAt: registration.createdAt.toISOString(),
    paymentBalance: paymentBalance
      ? {
          totalAmountDue: Number(paymentBalance.totalAmountDue),
          amountPaid: Number(paymentBalance.amountPaid),
          amountRemaining: Number(paymentBalance.amountRemaining),
          lateFeesApplied: Number(paymentBalance.lateFeesApplied),
          paymentStatus: paymentBalance.paymentStatus,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      checkNumber: p.checkNumber,
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
      receiptUrl: p.receiptUrl,
      notes: p.notes,
      processedAt: p.processedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      processedBy: p.processedBy,
    })),
    refunds: refunds.map((r) => ({
      id: r.id,
      refundAmount: Number(r.refundAmount),
      refundMethod: r.refundMethod,
      refundReason: r.refundReason,
      notes: r.notes,
      status: r.status,
      processedAt: r.createdAt.toISOString(),
      processedBy: r.processedBy,
    })),
    emailLogs,
    registrationEdits: registrationEdits.map((e) => ({
      id: e.id,
      editType: e.editType,
      changesMade: e.changesMade,
      oldTotal: e.oldTotal ? Number(e.oldTotal) : null,
      newTotal: e.newTotal ? Number(e.newTotal) : null,
      difference: e.difference ? Number(e.difference) : null,
      adminNotes: e.adminNotes,
      editedAt: e.editedAt.toISOString(),
      editedBy: e.editedBy,
    })),
    liabilityForms,
    event: {
      id: registration.event.id,
      name: registration.event.name,
      startDate: registration.event.startDate?.toISOString() || '',
      endDate: registration.event.endDate?.toISOString() || '',
    },
  })
}
