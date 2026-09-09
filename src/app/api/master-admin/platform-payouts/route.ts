import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

async function requireMasterAdmin(request: NextRequest) {
  const clerkUserId = await getClerkUserIdFromRequest(request)
  if (!clerkUserId) return null

  const user = await prisma.user.findFirst({
    where: { clerkUserId },
    select: { id: true, role: true },
  })

  if (!user || user.role !== 'master_admin') return null
  return user
}

// Balance owed to a platform-collected org = gross amount of its succeeded,
// platform-collected payments minus the platform's own fee, minus whatever
// has already been paid out via PlatformPayout.
async function getBalanceOwed(organizationId: string) {
  const [collected, paidOut] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        organizationId,
        collectedByPlatform: true,
        paymentStatus: 'succeeded',
      },
      _sum: { amount: true, platformFeeAmount: true },
    }),
    prisma.platformPayout.aggregate({
      where: { organizationId },
      _sum: { amount: true },
    }),
  ])

  const grossCollected = Number(collected._sum.amount || 0)
  const platformFeesTaken = Number(collected._sum.platformFeeAmount || 0)
  const totalPaidOut = Number(paidOut._sum.amount || 0)
  const netOwed = grossCollected - platformFeesTaken
  const balanceOwed = netOwed - totalPaidOut

  return { grossCollected, platformFeesTaken, netOwed, totalPaidOut, balanceOwed }
}

export async function GET(request: NextRequest) {
  try {
    const masterAdmin = await requireMasterAdmin(request)
    if (!masterAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgs = await prisma.organization.findMany({
      where: { usePlatformStripeAccount: true },
      select: {
        id: true,
        name: true,
        checkPaymentName: true,
        checkPaymentAddress: true,
        platformPayouts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            processedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const results = await Promise.all(
      orgs.map(async (org) => ({
        id: org.id,
        name: org.name,
        checkPaymentName: org.checkPaymentName,
        checkPaymentAddress: org.checkPaymentAddress,
        ...(await getBalanceOwed(org.id)),
        recentPayouts: org.platformPayouts.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          checkNumber: p.checkNumber,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          notes: p.notes,
          createdAt: p.createdAt,
          processedByName: p.processedBy
            ? `${p.processedBy.firstName} ${p.processedBy.lastName}`
            : null,
        })),
      }))
    )

    return NextResponse.json({ organizations: results })
  } catch (error) {
    console.error('Platform payouts list error:', error)
    return NextResponse.json(
      { error: 'Failed to load platform-collected organizations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const masterAdmin = await requireMasterAdmin(request)
    if (!masterAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      organizationId,
      amount,
      method,
      checkNumber,
      periodStart,
      periodEnd,
      notes,
    } = body

    if (!organizationId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'organizationId and a positive amount are required' },
        { status: 400 }
      )
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, usePlatformStripeAccount: true },
    })

    if (!org || !org.usePlatformStripeAccount) {
      return NextResponse.json(
        { error: 'Organization is not set up for platform-collected payments' },
        { status: 400 }
      )
    }

    const { balanceOwed } = await getBalanceOwed(organizationId)
    if (Number(amount) > balanceOwed + 0.01) {
      return NextResponse.json(
        {
          error: `Payout amount ($${Number(amount).toFixed(2)}) exceeds the current balance owed ($${balanceOwed.toFixed(2)})`,
          balanceOwed,
        },
        { status: 400 }
      )
    }

    const payout = await prisma.platformPayout.create({
      data: {
        organizationId,
        amount,
        method: method || 'check',
        checkNumber: checkNumber || null,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        notes: notes || null,
        processedByUserId: masterAdmin.id,
      },
    })

    const updatedBalance = await getBalanceOwed(organizationId)

    return NextResponse.json({ success: true, payout, balance: updatedBalance })
  } catch (error) {
    console.error('Platform payout record error:', error)
    return NextResponse.json(
      { error: 'Failed to record payout' },
      { status: 500 }
    )
  }
}
