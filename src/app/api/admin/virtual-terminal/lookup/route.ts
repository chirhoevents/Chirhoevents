import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check permission
    if (!hasPermission(user.role, 'payments.process')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user)

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Access code required' }, { status: 400 })
    }

    // Try to find as group registration
    const groupReg = await prisma.groupRegistration.findFirst({
      where: {
        accessCode: code.trim(),
        organizationId: organizationId
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true
          }
        }
      }
    })

    if (groupReg) {
      // Get payment balance
      const paymentBalance = await prisma.paymentBalance.findFirst({
        where: {
          registrationId: groupReg.id,
          registrationType: 'group'
        }
      })

      // Get recent payments
      const payments = await prisma.payment.findMany({
        where: {
          registrationId: groupReg.id,
          registrationType: 'group',
          paymentStatus: 'succeeded'
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          stripePaymentMethodId: true,
          cardBrand: true,
          cardLast4: true,
          createdAt: true
        }
      })

      // Get event pricing for deposit amount
      const eventPricing = await prisma.eventPricing.findUnique({
        where: { eventId: groupReg.eventId }
      })

      const totalAmount = paymentBalance?.totalAmountDue || 0
      const amountPaid = paymentBalance?.amountPaid || 0
      const balance = paymentBalance?.amountRemaining || 0
      const participantCount = groupReg.totalParticipants || 0

      // Calculate deposit amount
      let depositAmount = 0
      if (eventPricing?.depositAmount) {
        if (eventPricing.depositPerPerson) {
          depositAmount = Number(eventPricing.depositAmount) * participantCount
        } else {
          depositAmount = Number(eventPricing.depositAmount)
        }
      } else if (eventPricing?.depositPercentage) {
        depositAmount = Number(totalAmount) * (Number(eventPricing.depositPercentage) / 100)
      }

      return NextResponse.json({
        type: 'group',
        id: groupReg.id,
        accessCode: groupReg.accessCode,
        groupName: groupReg.groupName,
        parishName: groupReg.parishName,
        leaderName: groupReg.groupLeaderName,
        leaderEmail: groupReg.groupLeaderEmail,
        leaderPhone: groupReg.groupLeaderPhone,
        event: {
          id: groupReg.event.id,
          name: groupReg.event.name,
          startDate: groupReg.event.startDate.toISOString()
        },
        totalAmount: Number(totalAmount),
        amountPaid: Number(amountPaid),
        balance: Number(balance),
        participantCount,
        depositAmount,
        payments: payments.map((p: typeof payments[number]) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          stripePaymentMethodId: p.stripePaymentMethodId,
          cardBrand: p.cardBrand,
          cardLast4: p.cardLast4,
          createdAt: p.createdAt.toISOString()
        }))
      })
    }

    // Try to find as individual registration
    const individualReg = await prisma.individualRegistration.findFirst({
      where: {
        confirmationCode: code.trim(),
        organizationId: organizationId
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true
          }
        }
      }
    })

    if (individualReg) {
      // Get payment balance
      const paymentBalance = await prisma.paymentBalance.findFirst({
        where: {
          registrationId: individualReg.id,
          registrationType: 'individual'
        }
      })

      // Get recent payments
      const payments = await prisma.payment.findMany({
        where: {
          registrationId: individualReg.id,
          registrationType: 'individual',
          paymentStatus: 'succeeded'
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          stripePaymentMethodId: true,
          cardBrand: true,
          cardLast4: true,
          createdAt: true
        }
      })

      const totalAmount = paymentBalance?.totalAmountDue || 0
      const amountPaid = paymentBalance?.amountPaid || 0
      const balance = paymentBalance?.amountRemaining || 0

      return NextResponse.json({
        type: 'individual',
        id: individualReg.id,
        confirmationCode: individualReg.confirmationCode,
        firstName: individualReg.firstName,
        lastName: individualReg.lastName,
        email: individualReg.email,
        phone: individualReg.phone,
        event: {
          id: individualReg.event.id,
          name: individualReg.event.name,
          startDate: individualReg.event.startDate.toISOString()
        },
        totalAmount: Number(totalAmount),
        amountPaid: Number(amountPaid),
        balance: Number(balance),
        roomType: individualReg.roomType,
        housingType: individualReg.housingType,
        payments: payments.map((p: typeof payments[number]) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          stripePaymentMethodId: p.stripePaymentMethodId,
          cardBrand: p.cardBrand,
          cardLast4: p.cardLast4,
          createdAt: p.createdAt.toISOString()
        }))
      })
    }

    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  } catch (error) {
    console.error('Virtual terminal lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup registration' }, { status: 500 })
  }
}
