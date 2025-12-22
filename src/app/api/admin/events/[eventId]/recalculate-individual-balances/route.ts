import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params

    // Get event with pricing
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { pricing: true },
    })

    if (!event || !event.pricing) {
      return NextResponse.json(
        { error: 'Event or pricing not found' },
        { status: 404 }
      )
    }

    // Get all individual registrations for this event
    const individualRegs = await prisma.individualRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        housingType: true,
      },
    })

    let updated = 0
    let created = 0
    let errors = 0

    // Process each individual registration
    for (const reg of individualRegs) {
      try {
        // Calculate correct amount based on housing type
        let totalAmount = Number(event.pricing.individualBasePrice || event.pricing.youthRegularPrice || 0)

        if (reg.housingType === 'on_campus' && event.pricing.individualBasePrice) {
          totalAmount = Number(event.pricing.individualBasePrice)
        } else if (reg.housingType === 'off_campus' && event.pricing.individualOffCampusPrice) {
          totalAmount = Number(event.pricing.individualOffCampusPrice)
        } else if (reg.housingType === 'day_pass' && event.pricing.individualDayPassPrice) {
          totalAmount = Number(event.pricing.individualDayPassPrice)
        }

        // Check if payment balance exists
        const existingBalance = await prisma.paymentBalance.findFirst({
          where: {
            registrationId: reg.id,
            registrationType: 'individual',
          },
        })

        if (existingBalance) {
          // Update existing balance
          const amountPaid = Number(existingBalance.amountPaid || 0)
          const newAmountRemaining = totalAmount - amountPaid

          await prisma.paymentBalance.update({
            where: { id: existingBalance.id },
            data: {
              totalAmountDue: totalAmount,
              amountRemaining: newAmountRemaining,
              paymentStatus: newAmountRemaining <= 0 ? 'paid_full' :
                           amountPaid > 0 ? 'partial' : 'unpaid',
            },
          })
          updated++
        } else {
          // Create new payment balance
          await prisma.paymentBalance.create({
            data: {
              organizationId: event.organizationId,
              eventId: event.id,
              registrationId: reg.id,
              registrationType: 'individual',
              totalAmountDue: totalAmount,
              amountPaid: 0,
              amountRemaining: totalAmount,
              lateFeesApplied: 0,
              paymentStatus: 'unpaid',
            },
          })
          created++
        }
      } catch (error) {
        console.error(`Error processing registration ${reg.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated payment balances for ${individualRegs.length} individual registrations`,
      updated,
      created,
      errors,
      totalProcessed: individualRegs.length,
    })
  } catch (error) {
    console.error('Error recalculating balances:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate balances' },
      { status: 500 }
    )
  }
}
