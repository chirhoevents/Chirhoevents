import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Rapha Search Participants]',
    })
    if (error) return error
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ participants: [] })
    }

    // Search participants from liability forms (has medical data)
    const liabilityForms = await prisma.liabilityForm.findMany({
      where: {
        eventId,
        completed: true,
        OR: [
          { participantFirstName: { contains: query, mode: 'insensitive' } },
          { participantLastName: { contains: query, mode: 'insensitive' } },
          { allergies: { contains: query, mode: 'insensitive' } },
          { medicalConditions: { contains: query, mode: 'insensitive' } },
          { medications: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        groupRegistration: {
          select: {
            groupName: true,
          },
        },
      },
      take: 20,
      orderBy: [
        { participantLastName: 'asc' },
        { participantFirstName: 'asc' },
      ],
    })

    const participants = liabilityForms.map((form: any) => {
      const hasSevereAllergy =
        form.allergies?.toLowerCase().includes('epi') ||
        form.allergies?.toLowerCase().includes('severe')

      return {
        id: form.participantId || null, // Participant table ID (may be null)
        liabilityFormId: form.id, // LiabilityForm ID (always exists)
        firstName: form.participantFirstName,
        lastName: form.participantLastName,
        age: form.participantAge,
        gender: form.participantGender,
        groupName: form.groupRegistration?.groupName || 'Individual',
        hasSevereAllergy,
        allergies: form.allergies,
        medicalConditions: form.medicalConditions,
        medications: form.medications,
      }
    })

    return NextResponse.json({ participants })
  } catch (error) {
    console.error('Failed to search participants:', error)
    return NextResponse.json(
      { message: 'Failed to search participants' },
      { status: 500 }
    )
  }
}
