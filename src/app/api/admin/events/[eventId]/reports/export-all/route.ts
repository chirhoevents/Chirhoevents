import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { generateCSV } from '@/lib/reports/generate-csv'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = params
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Fetch all registrations and participants
    const groupRegs = await prisma.groupRegistration.findMany({
      where: eventFilter,
      include: {
        participants: {
          include: {
            liabilityForm: true,
          },
        },
      },
    })

    const individualRegs = await prisma.individualRegistration.findMany({
      where: eventFilter,
    })

    const paymentBalances = await prisma.paymentBalance.findMany({
      where: eventFilter,
    })

    // Create comprehensive CSV
    const rows: any[] = []

    // Add group registrations
    for (const group of groupRegs) {
      const payment = paymentBalances.find(pb => pb.registrationId === group.id)
      rows.push({
        'Registration Type': 'Group',
        'Group Name': group.groupName,
        'Parish': group.parishName,
        'Leader Name': group.groupLeaderName,
        'Leader Email': group.groupLeaderEmail,
        'Leader Phone': group.groupLeaderPhone,
        'Participants': group.participants.length,
        'Housing Type': group.housingType,
        'Total Amount': payment ? `$${Number(payment.totalAmountDue).toFixed(2)}` : '$0.00',
        'Amount Paid': payment ? `$${Number(payment.amountPaid).toFixed(2)}` : '$0.00',
        'Balance': payment ? `$${Number(payment.amountRemaining).toFixed(2)}` : '$0.00',
        'Payment Status': payment?.paymentStatus || 'pending',
        'Registered At': group.registeredAt.toLocaleDateString(),
      })
    }

    // Add individual registrations
    for (const ind of individualRegs) {
      const payment = paymentBalances.find(pb => pb.registrationId === ind.id)
      rows.push({
        'Registration Type': 'Individual',
        'Group Name': '',
        'Parish': '',
        'Leader Name': `${ind.firstName} ${ind.lastName}`,
        'Leader Email': ind.email,
        'Leader Phone': ind.phone,
        'Participants': 1,
        'Housing Type': ind.housingType,
        'Total Amount': payment ? `$${Number(payment.totalAmountDue).toFixed(2)}` : '$0.00',
        'Amount Paid': payment ? `$${Number(payment.amountPaid).toFixed(2)}` : '$0.00',
        'Balance': payment ? `$${Number(payment.amountRemaining).toFixed(2)}` : '$0.00',
        'Payment Status': payment?.paymentStatus || 'pending',
        'Registered At': ind.registeredAt.toLocaleDateString(),
      })
    }

    const csv = generateCSV(rows, [
      'Registration Type',
      'Group Name',
      'Parish',
      'Leader Name',
      'Leader Email',
      'Leader Phone',
      'Participants',
      'Housing Type',
      'Total Amount',
      'Amount Paid',
      'Balance',
      'Payment Status',
      'Registered At',
    ])

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="complete_event_data.csv"',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
