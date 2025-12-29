import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// Define interface for payment balance data
interface PaymentBalanceData {
  id: string
  registrationId: string
  registrationType: string
  totalAmountDue: number | bigint | { toNumber: () => number }
  amountPaid: number | bigint | { toNumber: () => number }
  amountRemaining: number | bigint | { toNumber: () => number }
  paymentStatus: string
  lastPaymentDate: Date | null
}

// Define interfaces for the Prisma query results
interface GroupReg {
  id: string
  groupName: string
  parishName: string | null
  groupLeaderName: string | null
  groupLeaderEmail: string | null
  groupLeaderPhone: string | null
  participants: unknown[]
}

interface IndividualReg {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = await params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'

    // Get all group registrations with payment balances
    const groupRegs = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        participants: true,
      },
    }) as GroupReg[]

    // Get payment balances for all groups
    const groupIds = groupRegs.map((g: GroupReg) => g.id)
    const groupPaymentBalances = await prisma.paymentBalance.findMany({
      where: {
        registrationId: { in: groupIds },
        registrationType: 'group',
      },
    })

    // Create lookup map for group balances
    const groupBalanceMap = new Map<string, PaymentBalanceData>()
    for (const pb of groupPaymentBalances) {
      groupBalanceMap.set(pb.registrationId, pb as PaymentBalanceData)
    }

    // Build group balance details
    const groupBalances = groupRegs.map((group: GroupReg) => {
      const balance = groupBalanceMap.get(group.id)

      return {
        groupId: group.id,
        groupName: group.groupName,
        parishName: group.parishName,
        groupLeaderName: group.groupLeaderName,
        groupLeaderEmail: group.groupLeaderEmail,
        groupLeaderPhone: group.groupLeaderPhone,
        participantCount: group.participants.length,
        totalDue: balance ? Number(balance.totalAmountDue) : 0,
        amountPaid: balance ? Number(balance.amountPaid) : 0,
        amountRemaining: balance ? Number(balance.amountRemaining) : 0,
        paymentStatus: balance?.paymentStatus || 'unpaid',
        lastPaymentDate: balance?.lastPaymentDate,
        _type: 'group',
      }
    })

    // Get all individual registrations
    const individualRegs = await prisma.individualRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    }) as IndividualReg[]

    // Get payment balances for all individual registrations
    const individualIds = individualRegs.map((i: IndividualReg) => i.id)
    const individualPaymentBalances = await prisma.paymentBalance.findMany({
      where: {
        registrationId: { in: individualIds },
        registrationType: 'individual',
      },
    })

    // Create lookup map for individual balances
    const individualBalanceMap = new Map<string, PaymentBalanceData>()
    for (const pb of individualPaymentBalances) {
      individualBalanceMap.set(pb.registrationId, pb as PaymentBalanceData)
    }

    // Build individual balance details
    const individualBalances = individualRegs.map((individual: IndividualReg) => {
      const balance = individualBalanceMap.get(individual.id)

      return {
        groupId: individual.id,
        groupName: `${individual.firstName} ${individual.lastName}`,
        parishName: 'Individual Registration',
        groupLeaderName: `${individual.firstName} ${individual.lastName}`,
        groupLeaderEmail: individual.email,
        groupLeaderPhone: individual.phone,
        participantCount: 1,
        totalDue: balance ? Number(balance.totalAmountDue) : 0,
        amountPaid: balance ? Number(balance.amountPaid) : 0,
        amountRemaining: balance ? Number(balance.amountRemaining) : 0,
        paymentStatus: balance?.paymentStatus || 'unpaid',
        lastPaymentDate: balance?.lastPaymentDate,
        _type: 'individual',
      }
    })

    // Combine both arrays
    const allBalances = [...groupBalances, ...individualBalances]

    // Sort by amount remaining (descending)
    allBalances.sort((a, b) => b.amountRemaining - a.amountRemaining)

    // Calculate totals
    const totalDue = allBalances.reduce((sum, g) => sum + g.totalDue, 0)
    const totalPaid = allBalances.reduce((sum, g) => sum + g.amountPaid, 0)
    const totalRemaining = allBalances.reduce((sum, g) => sum + g.amountRemaining, 0)
    const groupsFullyPaid = allBalances.filter(g => g.amountRemaining === 0).length
    const groupsWithBalance = allBalances.filter(g => g.amountRemaining > 0).length
    const groupsOverdue = allBalances.filter(g => g.paymentStatus === 'unpaid' && g.amountRemaining > 0).length

    if (isPreview) {
      return NextResponse.json({
        totalDue,
        totalPaid,
        totalRemaining,
        groupsFullyPaid,
        groupsWithBalance,
        groupsOverdue,
      })
    }

    // Separate into categories
    const overdueGroups = allBalances.filter(g => g.paymentStatus === 'unpaid' && g.amountRemaining > 0)
    const partiallyPaidGroups = allBalances.filter(g => g.paymentStatus === 'partial' && g.amountRemaining > 0)
    const fullyPaidGroups = allBalances.filter(g => g.amountRemaining === 0)
    const unpaidGroups = allBalances.filter(g => g.amountPaid === 0 && g.totalDue > 0)

    return NextResponse.json({
      totalDue,
      totalPaid,
      totalRemaining,
      groupsFullyPaid,
      groupsWithBalance,
      groupsOverdue,
      allGroups: allBalances,
      categories: {
        overdue: overdueGroups,
        partiallyPaid: partiallyPaidGroups,
        fullyPaid: fullyPaidGroups,
        unpaid: unpaidGroups,
      },
    })
  } catch (error) {
    console.error('Error generating balances report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
