import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the group registration linked to this Clerk user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        event: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
          }
        },
        participants: {
          select: {
            id: true,
            participantType: true,
            liabilityFormCompleted: true,
            safeEnvironmentCertStatus: true,
          }
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found for this user' },
        { status: 404 }
      )
    }

    // Update last accessed timestamp
    await prisma.groupRegistration.update({
      where: { id: groupRegistration.id },
      data: { dashboardLastAccessedAt: new Date() },
    })

    // Get payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: { registrationId: groupRegistration.id },
    })

    // Calculate forms status
    const totalParticipants = groupRegistration.participants.length
    const completedForms = groupRegistration.participants.filter(
      p => p.liabilityFormCompleted
    ).length
    const pendingForms = totalParticipants - completedForms

    // Calculate certificates status
    const chaperoneCount = groupRegistration.participants.filter(
      p => p.participantType === 'chaperone'
    ).length

    const certificatesUploaded = groupRegistration.participants.filter(
      p => p.participantType === 'chaperone' &&
           (p.safeEnvironmentCertStatus === 'uploaded' || p.safeEnvironmentCertStatus === 'verified')
    ).length

    const certificatesVerified = groupRegistration.participants.filter(
      p => p.participantType === 'chaperone' && p.safeEnvironmentCertStatus === 'verified'
    ).length

    const certificatesPending = chaperoneCount - certificatesUploaded

    // Format event dates
    const startDate = new Date(groupRegistration.event.startDate)
    const endDate = new Date(groupRegistration.event.endDate)
    const eventDates = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    // Check if payment is overdue
    const isOverdue = paymentBalance?.paymentStatus === 'overdue' || false

    return NextResponse.json({
      groupId: groupRegistration.id,
      groupName: groupRegistration.groupName,
      eventName: groupRegistration.event.name,
      eventDates,
      accessCode: groupRegistration.accessCode,
      totalParticipants,
      payment: {
        totalAmount: Number(paymentBalance?.totalAmountDue || 0),
        paidAmount: Number(paymentBalance?.amountPaid || 0),
        balanceRemaining: Number(paymentBalance?.amountRemaining || 0),
        dueDate: null, // TODO: Get from event pricing
        status: paymentBalance?.paymentStatus || 'unpaid',
        isOverdue,
        lateFeeApplied: Number(paymentBalance?.lateFeesApplied || 0),
      },
      forms: {
        totalRequired: totalParticipants,
        completed: completedForms,
        pending: pendingForms,
      },
      certificates: {
        totalRequired: chaperoneCount,
        uploaded: certificatesUploaded,
        verified: certificatesVerified,
        pending: certificatesPending,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
