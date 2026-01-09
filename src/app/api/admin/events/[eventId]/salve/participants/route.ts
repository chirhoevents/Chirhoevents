import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

// Helper function to check if user can access Salve portal
async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if user has salve.access permission (covers salve_coordinator, event_manager, org_admin, master_admin)
  // Also check custom permissions for salve_user role or explicit portal access
  const hasSalvePermission = hasPermission(user.role, 'salve.access')
  const hasCustomSalveAccess = user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true

  if (!hasSalvePermission && !hasCustomSalveAccess) {
    console.error(`[SALVE] ❌ User ${user.email} (role: ${user.role}) lacks salve.access permission`)
    throw new Error('Access denied - SALVE portal access required')
  }

  // Verify the event belongs to the user's organization (unless master_admin)
  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      throw new Error('Access denied to this event')
    }
  }

  return user
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const filterStatus = searchParams.get('status') || 'all' // all, checked_in, not_checked_in

    // Build where clause for group participants
    const groupWhere: any = {
      groupRegistration: {
        eventId,
      },
    }
    if (search) {
      groupWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (filterStatus === 'checked_in') {
      groupWhere.checkedIn = true
    } else if (filterStatus === 'not_checked_in') {
      groupWhere.checkedIn = false
    }

    // Get all group participants for this event
    const groupParticipants = await prisma.participant.findMany({
      where: groupWhere,
      include: {
        groupRegistration: {
          select: {
            id: true,
            groupName: true,
            parishName: true,
            accessCode: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    // Build where clause for individual registrations
    const individualWhere: any = {
      eventId,
    }
    if (search) {
      individualWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (filterStatus === 'checked_in') {
      individualWhere.checkedIn = true
    } else if (filterStatus === 'not_checked_in') {
      individualWhere.checkedIn = false
    }

    // Get all individual registrations for this event
    const individuals = await prisma.individualRegistration.findMany({
      where: individualWhere,
      include: {
        liabilityForms: {
          take: 1,
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    // Format group participants
    const formattedGroupParticipants = groupParticipants.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      age: p.age,
      gender: p.gender,
      participantType: p.participantType,
      checkedIn: p.checkedIn,
      checkedInAt: p.checkedInAt,
      checkInNotes: p.checkInNotes,
      liabilityFormCompleted: p.liabilityFormCompleted,
      registrationType: 'group',
      groupId: p.groupRegistration.id,
      groupName: p.groupRegistration.groupName,
      parishName: p.groupRegistration.parishName,
      accessCode: p.groupRegistration.accessCode,
    }))

    // Format individual registrations
    const formattedIndividuals = individuals.map((i: any) => ({
      id: i.id,
      firstName: i.firstName,
      lastName: i.lastName,
      email: i.email,
      age: i.age || null,
      gender: i.gender || null,
      participantType: 'individual',
      checkedIn: i.checkedIn || false,
      checkedInAt: i.checkedInAt,
      checkInNotes: i.checkInNotes,
      liabilityFormCompleted: i.liabilityForms?.[0]?.completed || false,
      registrationType: 'individual',
      groupId: null,
      groupName: 'Individual Registration',
      parishName: null,
      accessCode: i.confirmationCode,
    }))

    // Combine and sort
    const allParticipants = [...formattedGroupParticipants, ...formattedIndividuals].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName)
      if (lastNameCompare !== 0) return lastNameCompare
      return a.firstName.localeCompare(b.firstName)
    })

    // Calculate stats
    const totalParticipants = allParticipants.length
    const checkedInCount = allParticipants.filter(p => p.checkedIn).length
    const notCheckedInCount = totalParticipants - checkedInCount

    return NextResponse.json({
      participants: allParticipants,
      stats: {
        total: totalParticipants,
        checkedIn: checkedInCount,
        notCheckedIn: notCheckedInCount,
      },
    })
  } catch (error) {
    console.error('Failed to fetch all participants:', error)
    return NextResponse.json(
      { message: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}
