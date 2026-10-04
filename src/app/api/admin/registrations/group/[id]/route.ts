import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from '@/lib/resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'
import { incrementOptionCapacity, decrementOptionCapacity, getGroupHousingCounts, type HousingType } from '@/lib/option-capacity'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { deriveBalance } from '@/lib/payment-balance-status'

const resend = new Resend(process.env.RESEND_API_KEY!)

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

    return NextResponse.json({
      registration: {
        ...registration,
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
      newTotal,
      eventId,
      // Inventory-style housing counts (new)
      onCampusYouth,
      onCampusChaperones,
      offCampusYouth,
      offCampusChaperones,
      dayPassYouth,
      dayPassChaperones,
    } = body

    // Calculate individual counts
    const finalYouthCount = youthCount !== undefined ? youthCount : existingRegistration.youthCount
    const finalChaperoneCount = chaperoneCount !== undefined ? chaperoneCount : existingRegistration.chaperoneCount
    const finalPriestCount = priestCount !== undefined ? priestCount : existingRegistration.priestCount

    // FIX 2.3: Compute new total server-side from event pricing (ignore client-supplied oldTotal/newTotal)
    const eventPricing = await prisma.eventPricing.findUnique({
      where: { eventId: existingRegistration.eventId },
    })
    let serverNewTotal: number | null = null
    if (eventPricing) {
      serverNewTotal =
        finalYouthCount * Number(eventPricing.youthRegularPrice) +
        finalChaperoneCount * Number(eventPricing.chaperoneRegularPrice) +
        finalPriestCount * Number(eventPricing.priestPrice)
    }

    // Use server-computed total for payment balance update; fall back to client-supplied newTotal
    const computedNewTotal = serverNewTotal ?? newTotal
    const currentTotal = paymentBalance ? Number(paymentBalance.totalAmountDue) : (oldTotal ?? 0)

    // When spots are dropped, the deposit already paid toward those spots is
    // non-refundable — it must not silently act as a credit against what the
    // remaining group members still owe. Without this, lowering the headcount
    // would under-bill the group by exactly the forfeited amount, because the
    // old amountPaid (which includes the forfeited deposit) would otherwise
    // get applied in full against the smaller recalculated total.
    //
    // Only computed for the two configurations where a deposit is a distinct
    // concept from the full price (flat per-person, or percentage-of-price) —
    // a flat total-group deposit or "no deposit" has no clean per-spot slice
    // to forfeit, so those are left unchanged.
    const droppedYouth = Math.max(0, existingRegistration.youthCount - finalYouthCount)
    const droppedChaperones = Math.max(0, existingRegistration.chaperoneCount - finalChaperoneCount)
    const droppedPriests = Math.max(0, existingRegistration.priestCount - finalPriestCount)
    const totalDropped = droppedYouth + droppedChaperones + droppedPriests

    let forfeitedDeposit = 0
    if (totalDropped > 0 && eventPricing && !eventPricing.requireFullPayment) {
      if (eventPricing.depositPercentage != null) {
        const droppedValue =
          droppedYouth * Number(eventPricing.youthRegularPrice) +
          droppedChaperones * Number(eventPricing.chaperoneRegularPrice) +
          droppedPriests * Number(eventPricing.priestPrice)
        forfeitedDeposit = (droppedValue * Number(eventPricing.depositPercentage)) / 100
      } else if (eventPricing.depositAmount != null && eventPricing.depositPerPerson) {
        forfeitedDeposit = totalDropped * Number(eventPricing.depositAmount)
      }
    }
    // Never forfeit more than what's actually been paid so far.
    forfeitedDeposit = Math.min(forfeitedDeposit, paymentBalance ? Number(paymentBalance.amountPaid) : 0)

    // The real new total the remaining headcount owes, plus the forfeited
    // deposit added back on so it stops counting as a credit. amountPaid
    // itself is left untouched — the org genuinely received that money, so
    // revenue reporting should keep reflecting it accurately.
    const finalNewTotal = computedNewTotal + forfeitedDeposit
    const difference = finalNewTotal - currentTotal

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
    if (Object.keys(changesMade).length > 0 || difference !== 0) {
      await prisma.registrationEdit.create({
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

    // Check org-level update email setting
    const orgSettings = await prisma.organization.findUnique({
      where: { id: existingRegistration.organizationId },
      select: { customFieldsEnabled: true },
    })
    const orgCustomFields = (orgSettings?.customFieldsEnabled as Record<string, any>) || {}
    const updateEmailsDisabled = orgCustomFields?.updateEmails?.disabled === true

    // Send email notification to group leader
    if (!updateEmailsDisabled && groupLeaderEmail && existingRegistration.event) {
      try {
        // Build list of changes for email
        const emailChanges: string[] = []

        if (existingRegistration.groupName !== groupName) {
          emailChanges.push(`Group Name: ${existingRegistration.groupName} → ${groupName}`)
        }
        if (existingRegistration.parishName !== parishName) {
          emailChanges.push(`Parish Name: ${existingRegistration.parishName} → ${parishName}`)
        }
        if (existingRegistration.housingType !== housingType) {
          emailChanges.push(`Housing Type: ${existingRegistration.housingType} → ${housingType}`)
        }
        if (existingRegistration.totalParticipants !== totalParticipants) {
          emailChanges.push(`Total Participants: ${existingRegistration.totalParticipants} → ${totalParticipants}`)
        }
        // Include housing count changes (inventory-style)
        if (onCampusDiff !== 0) {
          emailChanges.push(`On-Campus Total: ${oldHousing.on_campus} → ${newHousing.on_campus}`)
        }
        if (offCampusDiff !== 0) {
          emailChanges.push(`Off-Campus Total: ${oldHousing.off_campus} → ${newHousing.off_campus}`)
        }
        if (dayPassDiff !== 0) {
          emailChanges.push(`Day Pass Total: ${oldHousing.day_pass} → ${newHousing.day_pass}`)
        }
        if (difference !== 0) {
          emailChanges.push(`Total Amount Due: $${currentTotal.toFixed(2)} → $${finalNewTotal.toFixed(2)}`)
        }
        if (forfeitedDeposit > 0) {
          emailChanges.push(
            `Note: the $${forfeitedDeposit.toFixed(2)} deposit already paid for the ${totalDropped} dropped spot${totalDropped === 1 ? '' : 's'} is non-refundable and does not reduce the amount still owed.`
          )
        }

        if (emailChanges.length > 0) {
          const emailSubject = `Registration Updated - ${existingRegistration.event.name}`

          const emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1E3A5F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
                .info-box { background-color: white; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0; }
                .changes-list { background-color: #FFF4E6; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
                .changes-list ul { margin: 10px 0; padding-left: 20px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 180px; height: auto; margin-bottom: 12px;" />
                  <h1>Registration Updated</h1>
                </div>
                <div class="content">
                  <p>Hello ${groupLeaderName},</p>

                  <p>Your group registration for <strong>${existingRegistration.event.name}</strong> has been updated by event administrators.</p>

                  <div class="changes-list">
                    <h3 style="margin-top: 0; color: #F59E0B;">Changes Made</h3>
                    <ul>
                      ${emailChanges.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                  </div>

                  ${adminNotes ? `
                    <div class="info-box" style="background-color: #E8F4FD;">
                      <h3 style="margin-top: 0; color: #1E3A5F;">Admin Notes</h3>
                      <p style="margin: 0;">${adminNotes}</p>
                    </div>
                  ` : ''}

                  <p>If you have any questions about these changes, please contact the event organizers.</p>

                  <p>Thank you!</p>
                </div>
                <div class="footer">
                  <p>This is an automated message from ChiRho Events.</p>
                  <p>${existingRegistration.event.name}</p>
                </div>
              </div>
            </body>
            </html>
          `

          await resend.emails.send({
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: resolveReplyTo(existingRegistration.event.settings, existingRegistration.event.organization),
            to: groupLeaderEmail,
            subject: emailSubject,
            html: emailBody,
          })
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      registration: updatedRegistration,
    })
  } catch (error) {
    console.error('Error updating group registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
