import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const searchTerm = searchParams.get('search') || ''

    // Verify user has forms.view permission and event access
    const { error } = await verifyFormsViewAccess(
      request,
      eventId,
      '[Poros Liability Groups]'
    )
    if (error) return error

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
    type FormType = { formStatus: string; participantType: string | null }
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

      // Calculate youth and chaperone submission counts
      const youthSubmittedCount = allCompletedForms.filter(
        (f: FormType) => f.participantType === 'youth_u18' || f.participantType === 'youth_o18' || f.participantType === 'youth'
      ).length
      const chaperoneSubmittedCount = allCompletedForms.filter(
        (f: FormType) => f.participantType === 'chaperone' || f.participantType === 'youth_o18_chaperone'
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
        // Youth and chaperone breakdown
        youthCount: group.youthCount,
        youthSubmittedCount,
        chaperoneCount: group.chaperoneCount,
        chaperoneSubmittedCount,
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
