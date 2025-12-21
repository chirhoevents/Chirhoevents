import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'

    // Get all group registrations with payment balances
    const groupRegs = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        participants: true,
      },
    })

    // Get payment balances for all groups
    const groupIds = groupRegs.map(g => g.id)
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: {
        registrationId: { in: groupIds },
        registrationType: 'group',
      },
    })

    // Create lookup map
    const balanceMap = new Map(paymentBalances.map(pb => [pb.registrationId, pb]))

    // Build group balance details
    const groupBalances = groupRegs.map(group => {
      const balance = balanceMap.get(group.id)

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
      }
    })

    // Sort by amount remaining (descending)
    groupBalances.sort((a, b) => b.amountRemaining - a.amountRemaining)

    // Calculate totals
    const totalDue = groupBalances.reduce((sum, g) => sum + g.totalDue, 0)
    const totalPaid = groupBalances.reduce((sum, g) => sum + g.amountPaid, 0)
    const totalRemaining = groupBalances.reduce((sum, g) => sum + g.amountRemaining, 0)
    const groupsFullyPaid = groupBalances.filter(g => g.amountRemaining === 0).length
    const groupsWithBalance = groupBalances.filter(g => g.amountRemaining > 0).length
    const groupsOverdue = groupBalances.filter(g => g.paymentStatus === 'unpaid' && g.amountRemaining > 0).length

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
    const overdueGroups = groupBalances.filter(g => g.paymentStatus === 'unpaid' && g.amountRemaining > 0)
    const partiallyPaidGroups = groupBalances.filter(g => g.paymentStatus === 'partial' && g.amountRemaining > 0)
    const fullyPaidGroups = groupBalances.filter(g => g.amountRemaining === 0)
    const unpaidGroups = groupBalances.filter(g => g.amountPaid === 0 && g.totalDue > 0)

    return NextResponse.json({
      totalDue,
      totalPaid,
      totalRemaining,
      groupsFullyPaid,
      groupsWithBalance,
      groupsOverdue,
      allGroups: groupBalances,
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
