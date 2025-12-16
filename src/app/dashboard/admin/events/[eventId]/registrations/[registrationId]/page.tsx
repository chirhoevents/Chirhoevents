import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import RegistrationDetailClient from './RegistrationDetailClient'

interface PageProps {
  params: {
    eventId: string
    registrationId: string
  }
}

export default async function RegistrationDetailPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId, registrationId } = params

  // Verify event exists and belongs to user's organization
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      pricing: {
        select: {
          youthRegularPrice: true,
          chaperoneRegularPrice: true,
          onCampusYouthPrice: true,
          offCampusYouthPrice: true,
          dayPassYouthPrice: true,
          onCampusChaperonePrice: true,
          offCampusChaperonePrice: true,
          dayPassChaperonePrice: true,
        },
      },
    },
  })

  if (!event) {
    notFound()
  }

  // Try to find individual registration first
  const individualRegistration = await prisma.individualRegistration.findUnique({
    where: { id: registrationId },
  })

  if (individualRegistration) {
    // Verify it belongs to this event and organization
    if (
      individualRegistration.eventId !== eventId ||
      individualRegistration.organizationId !== user.organizationId
    ) {
      notFound()
    }

    // Fetch payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    // Fetch payment history
    const payments = await prisma.payment.findMany({
      where: {
        registrationId: registrationId,
        registrationType: 'individual',
      },
      orderBy: {
        processedAt: 'desc',
      },
    })

    return (
      <RegistrationDetailClient
        event={{
          ...event,
          pricing: event.pricing ? {
            youthRegularPrice: Number(event.pricing.youthRegularPrice),
            chaperoneRegularPrice: Number(event.pricing.chaperoneRegularPrice),
            onCampusYouthPrice: event.pricing.onCampusYouthPrice ? Number(event.pricing.onCampusYouthPrice) : null,
            offCampusYouthPrice: event.pricing.offCampusYouthPrice ? Number(event.pricing.offCampusYouthPrice) : null,
            dayPassYouthPrice: event.pricing.dayPassYouthPrice ? Number(event.pricing.dayPassYouthPrice) : null,
            onCampusChaperonePrice: event.pricing.onCampusChaperonePrice ? Number(event.pricing.onCampusChaperonePrice) : null,
            offCampusChaperonePrice: event.pricing.offCampusChaperonePrice ? Number(event.pricing.offCampusChaperonePrice) : null,
            dayPassChaperonePrice: event.pricing.dayPassChaperonePrice ? Number(event.pricing.dayPassChaperonePrice) : null,
          } : null,
        }}
        registration={{
          ...individualRegistration,
          type: 'individual' as const,
        }}
        paymentBalance={paymentBalance ? {
          ...paymentBalance,
          totalAmountDue: Number(paymentBalance.totalAmountDue),
          amountPaid: Number(paymentBalance.amountPaid),
          amountRemaining: Number(paymentBalance.amountRemaining),
          lateFeesApplied: Number(paymentBalance.lateFeesApplied),
        } : null}
        payments={payments}
      />
    )
  }

  // Try group registration
  const groupRegistration = await prisma.groupRegistration.findUnique({
    where: { id: registrationId },
    include: {
      participants: true,
    },
  })

  if (groupRegistration) {
    // Verify it belongs to this event and organization
    if (
      groupRegistration.eventId !== eventId ||
      groupRegistration.organizationId !== user.organizationId
    ) {
      notFound()
    }

    // Fetch payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    // Fetch payment history
    const payments = await prisma.payment.findMany({
      where: {
        registrationId: registrationId,
        registrationType: 'group',
      },
      orderBy: {
        processedAt: 'desc',
      },
    })

    return (
      <RegistrationDetailClient
        event={{
          ...event,
          pricing: event.pricing ? {
            youthRegularPrice: Number(event.pricing.youthRegularPrice),
            chaperoneRegularPrice: Number(event.pricing.chaperoneRegularPrice),
            onCampusYouthPrice: event.pricing.onCampusYouthPrice ? Number(event.pricing.onCampusYouthPrice) : null,
            offCampusYouthPrice: event.pricing.offCampusYouthPrice ? Number(event.pricing.offCampusYouthPrice) : null,
            dayPassYouthPrice: event.pricing.dayPassYouthPrice ? Number(event.pricing.dayPassYouthPrice) : null,
            onCampusChaperonePrice: event.pricing.onCampusChaperonePrice ? Number(event.pricing.onCampusChaperonePrice) : null,
            offCampusChaperonePrice: event.pricing.offCampusChaperonePrice ? Number(event.pricing.offCampusChaperonePrice) : null,
            dayPassChaperonePrice: event.pricing.dayPassChaperonePrice ? Number(event.pricing.dayPassChaperonePrice) : null,
          } : null,
        }}
        registration={{
          ...groupRegistration,
          type: 'group' as const,
        }}
        paymentBalance={paymentBalance ? {
          ...paymentBalance,
          totalAmountDue: Number(paymentBalance.totalAmountDue),
          amountPaid: Number(paymentBalance.amountPaid),
          amountRemaining: Number(paymentBalance.amountRemaining),
          lateFeesApplied: Number(paymentBalance.lateFeesApplied),
        } : null}
        payments={payments}
      />
    )
  }

  // Registration not found
  notFound()
}
