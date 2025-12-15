import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import RegistrationsClient from './RegistrationsClient'

interface PageProps {
  params: {
    eventId: string
  }
}

export default async function EventRegistrationsPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId } = params

  // Verify event exists and belongs to user's organization
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!event) {
    notFound()
  }

  // Fetch registrations with payment data
  const groupRegistrations = await prisma.groupRegistration.findMany({
    where: {
      eventId: eventId,
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
    },
    orderBy: {
      registeredAt: 'desc',
    },
  })

  // Fetch payment balances
  const paymentBalances = await prisma.paymentBalance.findMany({
    where: {
      eventId: eventId,
    },
  })

  // Create a map of payment balances by registration ID
  const paymentMap = new Map(
    paymentBalances.map((pb) => [pb.registrationId, pb])
  )

  // Transform group registrations with payment data
  const groupRegs = groupRegistrations.map((reg) => {
    const payment = paymentMap.get(reg.id)
    const completedForms = reg.participants.filter(
      (p) => p.liabilityFormCompleted
    ).length

    return {
      id: reg.id,
      type: 'group' as const,
      groupName: reg.groupName,
      parishName: reg.parishName,
      leaderName: reg.groupLeaderName,
      leaderEmail: reg.groupLeaderEmail,
      leaderPhone: reg.groupLeaderPhone,
      participantCount: reg.totalParticipants,
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
  const individualRegs = individualRegistrations.map((reg) => {
    const payment = paymentMap.get(reg.id)

    return {
      id: reg.id,
      type: 'individual' as const,
      firstName: reg.firstName,
      lastName: reg.lastName,
      email: reg.email,
      phone: reg.phone,
      age: reg.age,
      housingType: reg.housingType,
      registeredAt: reg.registeredAt.toISOString(),
      totalAmount: payment?.totalAmountDue ? Number(payment.totalAmountDue) : 0,
      amountPaid: payment?.amountPaid ? Number(payment.amountPaid) : 0,
      balance: payment?.amountRemaining ? Number(payment.amountRemaining) : 0,
      paymentStatus: payment?.paymentStatus || 'pending',
      formCompleted: false, // TODO: Add liability form status for individuals
    }
  })

  const totalRegistrations = groupRegs.length + individualRegs.length
  const totalParticipants =
    groupRegs.reduce((sum, reg) => sum + reg.participantCount, 0) +
    individualRegs.length

  return (
    <RegistrationsClient
      eventId={eventId}
      eventName={event.name}
      groupRegistrations={groupRegs}
      individualRegistrations={individualRegs}
      totalRegistrations={totalRegistrations}
      totalParticipants={totalParticipants}
    />
  )
}
