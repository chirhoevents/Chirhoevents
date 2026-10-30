import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from '@/lib/resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'
import { incrementOptionCapacity, decrementOptionCapacity, getGroupHousingCounts, type HousingType } from '@/lib/option-capacity'
import { buildGroupUpdateEmailChanges, sendGroupUpdateEmail } from '@/lib/group-update-email'
import { deriveBalance } from '@/lib/payment-balance-status'
import {
  calculateSpotChange,
  getRegistrationSpotCounts,
  spotCountsEqual,
  type SpotCounts,
} from '@/lib/group-spot-pricing'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Percentage coupon the group used at sign-up (0 if none, or a fixed-amount
// coupon — that discount is already baked into the stored total).
async function getGroupCouponPercent(registrationId: string): Promise<number> {
  const redemption = await prisma.couponRedemption.findFirst({
    where: { registrationId, registrationType: 'group' },
    include: { coupon: { select: { discountType: true, discountValue: true } } },
  })
  return redemption?.coupon.discountType === 'percentage' ? Number(redemption.coupon.discountValue) : 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || (user.role !== 'org_admin' && user.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const registrationId = id

    // Fetch the registration with all related data
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        participants: true,
        event: {
          include: {
            settings: true,
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Cast user to any since Prisma types differ slightly from AuthUser
    if (!canAccessOrganization(user as any, registration.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment balance separately
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    // Get payment records for this registration
    const payments = await prisma.payment.findMany({
      where: {
        registrationId: registrationId,
        registrationType: 'group',
        // Pending rows are "pay later" placeholders, not payments — the amount
        // already shows as the balance remaining.
        paymentStatus: { not: 'pending' },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const couponPercent = await getGroupCouponPercent(registrationId)

    return NextResponse.json({
      registration: {
        ...registration,
        couponPercent,
        paymentBalance: paymentBalance ? {
          totalAmountDue: Number(paymentBalance.totalAmountDue),
          amountPaid: Number(paymentBalance.amountPaid),
          amountRemaining: Number(paymentBalance.amountRemaining),
          paymentStatus: paymentBalance.paymentStatus,
        } : null,
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          checkNumber: p.checkNumber,
          checkDate: p.checkDate,
          checkReceivedDate: p.checkReceivedDate,
          notes: p.notes,
          createdAt: p.createdAt,
          processedAt: p.processedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching group registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || (user.role !== 'org_admin' && user.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user as any)
    const registrationId = id
    const body = await request.json()

    // Verify the registration belongs to the user's organization
    const existingRegistration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          include: {
            organization: true,
            settings: true,
          },
        },
        participants: true,
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Cast user to any since Prisma types differ slightly from AuthUser
    if (!canAccessOrganization(user as any, existingRegistration.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment balance separately
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    const {
      groupName,
      parishName,
      dioceseName,
      groupLeaderName,
      groupLeaderEmail,
      groupLeaderPhone,
      groupLeaderStreet,
      groupLeaderCity,
      groupLeaderState,
      groupLeaderZip,
      alternativeContact1Name,
      alternativeContact1Email,
      alternativeContact1Phone,
      alternativeContact2Name,
      alternativeContact2Email,
      alternativeContact2Phone,
      housingType,
      specialRequests,
      totalParticipants,
      youthCount,
      chaperoneCount,
      priestCount,
      adminNotes,
      oldTotal,
      eventId,
      // Inventory-style housing counts (new)
      onCampusYouth,
      onCampusChaperones,
      offCampusYouth,
      offCampusChaperones,
      dayPassYouth,
      dayPassChaperones,
      sendEmail,
    } = body

    // Calculate individual counts
    const finalYouthCount = youthCount !== undefined ? youthCount : existingRegistration.youthCount
    const finalChaperoneCount = chaperoneCount !== undefined ? chaperoneCount : existingRegistration.chaperoneCount
    const finalPriestCount = priestCount !== undefined ? priestCount : existingRegistration.priestCount

    const currentTotal = paymentBalance ? Number(paymentBalance.totalAmountDue) : (oldTotal ?? 0)

    // Adjust the total by just the spots that were added/dropped, priced the
    // way this group was priced at sign-up (see group-spot-pricing). The rest
    // of the total is left alone, so discounts and manual adjustments survive,
    // and an info-only edit (no spot changes) never touches the amount due.
    const oldSpotCounts = getRegistrationSpotCounts(existingRegistration)
    const newSpotCounts: SpotCounts = {
      onCampusYouth: onCampusYouth ?? 0,
      onCampusChaperones: onCampusChaperones ?? 0,
      offCampusYouth: offCampusYouth ?? 0,
      offCampusChaperones: offCampusChaperones ?? 0,
      dayPassYouth: dayPassYouth ?? 0,
      dayPassChaperones: dayPassChaperones ?? 0,
      priests: finalPriestCount,
    }
    // Callers that don't send inventory counts can't be changing spots.
    const sentSpotCounts = onCampusYouth !== undefined || offCampusYouth !== undefined || dayPassYouth !== undefined
    const spotsChanged = sentSpotCounts && !spotCountsEqual(oldSpotCounts, newSpotCounts)

    const eventPricing = await prisma.eventPricing.findUnique({
      where: { eventId: existingRegistration.eventId },
    })
    const spotChange = spotsChanged && eventPricing
      ? calculateSpotChange({
          currentTotal,
          oldCounts: oldSpotCounts,
          newCounts: newSpotCounts,
          pricing: eventPricing,
          registeredAt: existingRegistration.registeredAt,
          couponPercent: await getGroupCouponPercent(registrationId),
          amountPaid: paymentBalance ? Number(paymentBalance.amountPaid) : 0,
        })
      : null
    const forfeitedDeposit = spotChange?.forfeitedDeposit ?? 0
    const totalDropped = spotChange?.droppedSpots ?? 0

    // amountPaid itself is left untouched — the org genuinely received that
    // money, so revenue reporting keeps reflecting it accurately.
    const finalNewTotal = spotChange ? spotChange.newTotal : currentTotal
    const difference = Math.round((finalNewTotal - currentTotal) * 100) / 100

    // FIX 2.2: Update event-level capacity when totalParticipants changes
    const oldTotalParticipants = existingRegistration.totalParticipants ?? 0
    const newTotalParticipants = totalParticipants !== undefined ? totalParticipants : oldTotalParticipants
    const totalParticipantDiff = newTotalParticipants - oldTotalParticipants
    if (totalParticipantDiff !== 0) {
      // positive diff = using more spots (decrement remaining), negative = freeing spots (increment remaining)
      await prisma.$executeRaw`
        UPDATE events
        SET capacity_remaining = GREATEST(0, capacity_remaining - ${totalParticipantDiff})
        WHERE id = ${existingRegistration.eventId}::uuid
          AND capacity_remaining IS NOT NULL
      `
    }

    // Handle housing count changes and capacity adjustment (inventory-style)
    // Priests count toward their group's housing pool (see getGroupHousingCounts)
    const oldHousing = getGroupHousingCounts(existingRegistration)
    const newHousing = getGroupHousingCounts({
      housingType: housingType !== undefined ? housingType : existingRegistration.housingType,
      ticketType: existingRegistration.ticketType,
      totalParticipants: newTotalParticipants,
      priestCount: finalPriestCount,
      onCampusYouth: onCampusYouth ?? null,
      onCampusChaperones: onCampusChaperones ?? null,
      offCampusYouth: offCampusYouth ?? null,
      offCampusChaperones: offCampusChaperones ?? null,
      dayPassYouth: dayPassYouth ?? null,
      dayPassChaperones: dayPassChaperones ?? null,
    })

    // Calculate capacity changes needed for each housing type
    const onCampusDiff = newHousing.on_campus - oldHousing.on_campus
    const offCampusDiff = newHousing.off_campus - oldHousing.off_campus
    const dayPassDiff = newHousing.day_pass - oldHousing.day_pass

    // Update option-level capacity if housing counts changed
    if (onCampusDiff !== 0) {
      if (onCampusDiff > 0) {
        await decrementOptionCapacity(existingRegistration.eventId, 'on_campus', null, onCampusDiff)
      } else {
        await incrementOptionCapacity(existingRegistration.eventId, 'on_campus', null, Math.abs(onCampusDiff))
      }
    }
    if (offCampusDiff !== 0) {
      if (offCampusDiff > 0) {
        await decrementOptionCapacity(existingRegistration.eventId, 'off_campus', null, offCampusDiff)
      } else {
        await incrementOptionCapacity(existingRegistration.eventId, 'off_campus', null, Math.abs(offCampusDiff))
      }
    }
    if (dayPassDiff !== 0) {
      if (dayPassDiff > 0) {
        await decrementOptionCapacity(existingRegistration.eventId, 'day_pass', null, dayPassDiff)
      } else {
        await incrementOptionCapacity(existingRegistration.eventId, 'day_pass', null, Math.abs(dayPassDiff))
      }
    }

    // Update the group registration
    const updatedRegistration = await prisma.groupRegistration.update({
      where: { id: registrationId },
      data: {
        groupName,
        parishName,
        dioceseName: dioceseName || null,
        groupLeaderName,
        groupLeaderEmail,
        groupLeaderPhone,
        groupLeaderStreet: groupLeaderStreet || null,
        groupLeaderCity: groupLeaderCity || null,
        groupLeaderState: groupLeaderState || null,
        groupLeaderZip: groupLeaderZip || null,
        ...(alternativeContact1Name !== undefined && { alternativeContact1Name: alternativeContact1Name || null }),
        ...(alternativeContact1Email !== undefined && { alternativeContact1Email: alternativeContact1Email || null }),
        ...(alternativeContact1Phone !== undefined && { alternativeContact1Phone: alternativeContact1Phone || null }),
        ...(alternativeContact2Name !== undefined && { alternativeContact2Name: alternativeContact2Name || null }),
        ...(alternativeContact2Email !== undefined && { alternativeContact2Email: alternativeContact2Email || null }),
        ...(alternativeContact2Phone !== undefined && { alternativeContact2Phone: alternativeContact2Phone || null }),
        housingType,
        specialRequests: specialRequests || null,
        totalParticipants: totalParticipants !== undefined ? totalParticipants : existingRegistration.totalParticipants,
        youthCount: finalYouthCount,
        chaperoneCount: finalChaperoneCount,
        priestCount: finalPriestCount,
        // Inventory-style housing counts
        onCampusYouth: onCampusYouth ?? null,
        onCampusChaperones: onCampusChaperones ?? null,
        offCampusYouth: offCampusYouth ?? null,
        offCampusChaperones: offCampusChaperones ?? null,
        dayPassYouth: dayPassYouth ?? null,
        dayPassChaperones: dayPassChaperones ?? null,
        updatedAt: new Date(),
      },
    })

    // Track changes made
    const changesMade: Record<string, {old: unknown, new: unknown}> = {}
    if (existingRegistration.groupName !== groupName) {
      changesMade.groupName = { old: existingRegistration.groupName, new: groupName }
    }
    if (existingRegistration.parishName !== parishName) {
      changesMade.parishName = { old: existingRegistration.parishName, new: parishName }
    }
    if (existingRegistration.groupLeaderName !== groupLeaderName) {
      changesMade.groupLeaderName = { old: existingRegistration.groupLeaderName, new: groupLeaderName }
    }
    if (existingRegistration.groupLeaderEmail !== groupLeaderEmail) {
      changesMade.groupLeaderEmail = { old: existingRegistration.groupLeaderEmail, new: groupLeaderEmail }
    }
    if (existingRegistration.groupLeaderPhone !== groupLeaderPhone) {
      changesMade.groupLeaderPhone = { old: existingRegistration.groupLeaderPhone, new: groupLeaderPhone }
    }
    if (existingRegistration.housingType !== housingType) {
      changesMade.housingType = { old: existingRegistration.housingType, new: housingType }
    }
    if (totalParticipants !== undefined && existingRegistration.totalParticipants !== totalParticipants) {
      changesMade.totalParticipants = { old: existingRegistration.totalParticipants, new: totalParticipants }
    }
    // Track housing count changes (inventory-style)
    if (onCampusDiff !== 0) {
      changesMade.onCampusTotal = { old: oldHousing.on_campus, new: newHousing.on_campus }
    }
    if (offCampusDiff !== 0) {
      changesMade.offCampusTotal = { old: oldHousing.off_campus, new: newHousing.off_campus }
    }
    if (dayPassDiff !== 0) {
      changesMade.dayPassTotal = { old: oldHousing.day_pass, new: newHousing.day_pass }
    }
    if (forfeitedDeposit > 0) {
      changesMade.depositForfeited = {
        old: null,
        new: `$${forfeitedDeposit.toFixed(2)} (${totalDropped} dropped spot${totalDropped === 1 ? '' : 's'}) — non-refundable, excluded from the remaining balance`,
      }
    }

    // Create audit trail entry if changes were made
    let auditEditId: string | null = null
    if (Object.keys(changesMade).length > 0 || difference !== 0) {
      const auditEdit = await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'group',
          organizationId: existingRegistration.organizationId, // Fix #11
          editedByUserId: user.id,
          editType: difference !== 0 ? 'payment_updated' : 'info_updated',
          changesMade: changesMade as any,
          oldTotal: currentTotal || null,
          newTotal: finalNewTotal || null,
          difference: difference || null,
          adminNotes: adminNotes || null,
        },
      })
      auditEditId = auditEdit.id
    }

    // Update payment balance if total changed (FIX 2.3: use server-computed total,
    // plus any forfeited deposit added back on — see comment above)
    if (difference !== 0 && paymentBalance) {
      // Derive from total − paid (not remaining + difference) so lowering the
      // total below what was already paid shows as "overpaid" (refund owed)
      // instead of being silently clamped to a $0 balance.
      const { amountRemaining, paymentStatus } = deriveBalance(
        finalNewTotal,
        Number(paymentBalance.amountPaid),
        paymentBalance.paymentStatus
      )
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          totalAmountDue: finalNewTotal,
          amountRemaining,
          paymentStatus,
        },
      })
    }

    // Email the group leader only when the admin ticked the box. That box is an
    // explicit per-save choice, so the org's "Disable participant update emails"
    // setting (meant for bulk participant edits) does not override it.
    let emailStatus: 'not_requested' | 'sent' | 'no_changes' | 'failed' = 'not_requested'
    let emailError: string | null = null
    if (sendEmail === true) {
      const emailChanges = buildGroupUpdateEmailChanges({
        changesMade,
        oldTotal: difference !== 0 ? currentTotal : null,
        newTotal: difference !== 0 ? finalNewTotal : null,
        forfeitedDeposit,
        droppedSpots: totalDropped,
      })
      const recipient = groupLeaderEmail || existingRegistration.groupLeaderEmail
      if (emailChanges.length === 0) {
        emailStatus = 'no_changes'
      } else if (!recipient || !existingRegistration.event) {
        emailStatus = 'failed'
        emailError = 'No group leader email on file'
      } else {
        try {
          await sendGroupUpdateEmail(resend, {
            to: recipient,
            groupLeaderName: groupLeaderName || existingRegistration.groupLeaderName,
            event: existingRegistration.event,
            changes: emailChanges,
            adminNotes,
          })
          emailStatus = 'sent'
          if (auditEditId) {
            await prisma.registrationEdit.update({
              where: { id: auditEditId },
              data: { emailSent: true },
            })
          }
        } catch (err) {
          console.error('Failed to send group update email:', err)
          emailStatus = 'failed'
          emailError = err instanceof Error ? err.message : String(err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      registration: updatedRegistration,
      emailStatus,
      emailError,
    })
  } catch (error) {
    console.error('Error updating group registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
