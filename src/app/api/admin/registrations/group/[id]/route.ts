import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const registrationId = params.id

    // Fetch the registration with all related data
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        participants: true,
        event: true,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (registration.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment balance separately
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const registrationId = params.id
    const body = await request.json()

    // Verify the registration belongs to the user's organization
    const existingRegistration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        participants: true,
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (existingRegistration.organizationId !== user.organizationId) {
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
      groupLeaderName,
      groupLeaderEmail,
      groupLeaderPhone,
      housingType,
      totalParticipants,
      youthCount,
      chaperoneCount,
      priestCount,
      adminNotes,
      oldTotal,
      newTotal,
      eventId,
    } = body

    // Calculate the difference
    const difference = newTotal - oldTotal

    // Calculate individual counts from participantCounts if provided
    // The frontend sends youth_u18 and youth_o18, we need to combine them for youthCount
    const finalYouthCount = youthCount !== undefined ? youthCount : existingRegistration.youthCount
    const finalChaperoneCount = chaperoneCount !== undefined ? chaperoneCount : existingRegistration.chaperoneCount
    const finalPriestCount = priestCount !== undefined ? priestCount : existingRegistration.priestCount

    // Update the group registration
    const updatedRegistration = await prisma.groupRegistration.update({
      where: { id: registrationId },
      data: {
        groupName,
        parishName,
        groupLeaderName,
        groupLeaderEmail,
        groupLeaderPhone,
        housingType,
        totalParticipants: totalParticipants !== undefined ? totalParticipants : existingRegistration.totalParticipants,
        youthCount: finalYouthCount,
        chaperoneCount: finalChaperoneCount,
        priestCount: finalPriestCount,
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

    // Create audit trail entry if changes were made
    if (Object.keys(changesMade).length > 0 || difference !== 0) {
      await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'group',
          editedByUserId: user.id,
          editType: difference !== 0 ? 'payment_updated' : 'info_updated',
          changesMade: changesMade as any,
          oldTotal: oldTotal || null,
          newTotal: newTotal || null,
          difference: difference || null,
          adminNotes: adminNotes || null,
        },
      })
    }

    // Update payment balance if total changed
    if (difference !== 0 && paymentBalance) {
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          totalAmountDue: newTotal,
          amountRemaining: {
            increment: difference,
          },
        },
      })
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
