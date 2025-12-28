import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { eventId } = await Promise.resolve(params)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const searchTerm = searchParams.get('search') || ''

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Build search filter for groups
    const groupSearchFilter = searchTerm
      ? {
          OR: [
            { groupName: { contains: searchTerm, mode: 'insensitive' as const } },
            { parishName: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Get all group registrations for this event
    const groups = await prisma.groupRegistration.findMany({
      where: {
        eventId,
        ...groupSearchFilter,
      },
      include: {
        liabilityForms: {
          where: {
            completed: true,
            ...(status !== 'all' ? { formStatus: status } : {}),
          },
          include: {
            approvedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            participant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ formStatus: 'asc' }, { participantLastName: 'asc' }],
        },
      },
      orderBy: { groupName: 'asc' },
    })

    // Format response with stats
    type GroupResult = typeof groups[number]
    type FormType = { formStatus: string }
    const formattedGroups = groups.map((group: GroupResult) => {
      const totalSpots = group.totalParticipants

      const allCompletedForms = group.liabilityForms
      const submittedCount = allCompletedForms.length
      const approvedCount = allCompletedForms.filter(
        (f: FormType) => f.formStatus === 'approved'
      ).length
      const pendingCount = allCompletedForms.filter(
        (f: FormType) => f.formStatus === 'pending'
      ).length
      const deniedCount = allCompletedForms.filter(
        (f: FormType) => f.formStatus === 'denied'
      ).length

      return {
        id: group.id,
        groupName: group.groupName,
        parishName: group.parishName,
        totalSpots,
        submittedCount,
        approvedCount,
        pendingCount,
        deniedCount,
        participants: allCompletedForms.map((form: GroupResult['liabilityForms'][number]) => ({
          id: form.participant?.id || form.id,
          firstName: form.participantFirstName,
          lastName: form.participantLastName,
          age: form.participantAge,
          gender: form.participantGender,
          participantType: form.participantType,
          formStatus: form.formStatus,
          formId: form.id,
          pdfUrl: form.pdfUrl,
          allergies: form.allergies,
          medications: form.medications,
          medicalConditions: form.medicalConditions,
          dietaryRestrictions: form.dietaryRestrictions,
          tShirtSize: form.tShirtSize,
          emergencyContact1Name: form.emergencyContact1Name,
          emergencyContact1Phone: form.emergencyContact1Phone,
          completedAt: form.completedAt?.toISOString() || null,
          approvedAt: form.approvedAt?.toISOString() || null,
          approvedByName: form.approvedBy
            ? `${form.approvedBy.firstName} ${form.approvedBy.lastName}`
            : null,
          deniedReason: form.deniedReason,
        })),
      }
    })

    // Filter out groups with no matching forms when status filter is applied
    const filteredGroups =
      status !== 'all'
        ? formattedGroups.filter((g: { participants: unknown[] }) => g.participants.length > 0)
        : formattedGroups

    return NextResponse.json(filteredGroups)
  } catch (error) {
    console.error('Groups fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}
