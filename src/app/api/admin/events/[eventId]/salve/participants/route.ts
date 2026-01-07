import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireAdmin()
    const { eventId } = await params
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const filterStatus = searchParams.get('status') || 'all' // all, checked_in, not_checked_in

    // Get all group participants for this event
    const groupParticipants = await prisma.participant.findMany({
      where: {
        groupRegistration: {
          eventId,
        },
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(filterStatus === 'checked_in' && { checkedIn: true }),
        ...(filterStatus === 'not_checked_in' && { checkedIn: false }),
      },
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

    // Get all individual registrations for this event
    const individuals = await prisma.individualRegistration.findMany({
      where: {
        eventId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(filterStatus === 'checked_in' && { checkedIn: true }),
        ...(filterStatus === 'not_checked_in' && { checkedIn: false }),
      },
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
