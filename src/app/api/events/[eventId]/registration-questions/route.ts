import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// GET /api/events/[eventId]/registration-questions?type=individual|group
//
// Public (no auth). Returns the custom questions an organizer has enabled for
// this event that are applicable to the given registration type.
//
// type=individual  → appliesTo IN ['individual','both','all']
// type=group       → appliesTo IN ['group','both','all']
//   (group forms show group-level questions only; per-participant individual
//    questions are deferred to the liability-form flow when Participant rows
//    exist and have real IDs.)
//
// Only returns event-scoped, non-template rows (isTemplate=false).
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'individual' or 'group'

    if (!type || !['individual', 'group'].includes(type)) {
      return NextResponse.json(
        { error: 'type query param must be "individual" or "group"' },
        { status: 400 }
      )
    }

    // Build the appliesTo filter for this registration type
    const appliesToValues =
      type === 'individual'
        ? ['individual', 'both', 'all']
        : ['group', 'both', 'all']

    const questions = await prisma.customRegistrationQuestion.findMany({
      where: {
        eventId,
        isTemplate: false,
        appliesTo: { in: appliesToValues as any },
      },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        options: true,
        required: true,
        appliesTo: true,
        displayOrder: true,
      },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[GET registration-questions] error:', err)
    return NextResponse.json({ error: 'Failed to fetch registration questions' }, { status: 500 })
  }
}
