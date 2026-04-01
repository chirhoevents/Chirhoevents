import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

// ---------------------------------------------------------------------------
// GET /api/admin/events/[eventId]/catalog-questions
//
// Returns all catalog template questions (isTemplate=true) merged with
// any event-specific copies already enabled for this event.  Each item
// indicates whether it is currently enabled and carries required/hasAnswers
// state from the event copy.
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Catalog Questions]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Fetch templates and event copies in parallel
    const [templates, eventCopies] = await Promise.all([
      prisma.customRegistrationQuestion.findMany({
        where: { isTemplate: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.customRegistrationQuestion.findMany({
        where: {
          eventId,
          isTemplate: false,
          catalogSlug: { not: null },
        },
      }),
    ])

    // Check which event copies have existing answers
    const copiesWithAnswerCounts =
      eventCopies.length > 0
        ? await prisma.customRegistrationAnswer.groupBy({
            by: ['questionId'],
            where: { questionId: { in: eventCopies.map((c) => c.id) } },
            _count: { questionId: true },
          })
        : []

    const answerCountByQuestionId = new Map(
      copiesWithAnswerCounts.map((r) => [r.questionId, r._count.questionId])
    )
    const eventCopyBySlug = new Map(eventCopies.map((c) => [c.catalogSlug, c]))

    const questions = templates.map((t) => {
      const copy = eventCopyBySlug.get(t.catalogSlug ?? '')
      return {
        // Template fields (read-only)
        id: t.id,
        catalogSlug: t.catalogSlug,
        catalogCategory: t.catalogCategory,
        questionText: t.questionText,
        questionType: t.questionType,
        options: t.options,
        appliesTo: t.appliesTo,
        displayOrder: t.displayOrder,
        // Event-copy state
        enabled: copy != null,
        eventCopyId: copy?.id ?? null,
        required: copy?.required ?? false,
        hasAnswers: copy != null && (answerCountByQuestionId.get(copy.id) ?? 0) > 0,
      }
    })

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[GET Catalog Questions] error:', err)
    return NextResponse.json({ error: 'Failed to fetch catalog questions' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/events/[eventId]/catalog-questions
//
// Batch enable / disable / update-required for catalog questions.
//
// Body: { questions: Array<{ catalogSlug: string, enabled: boolean, required: boolean }> }
//
// For enabled=true:
//   • If an event copy already exists (same eventId + catalogSlug + isTemplate=false),
//     update its `required` field.
//   • Otherwise copy the template row into a new event-scoped question.
//
// For enabled=false:
//   • If the event copy has no answers → hard-delete it.
//   • If the event copy has answers → return 409 for that slug; leave it in place.
//     (The UI should reflect this and prevent the toggle-off until answers are exported.)
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Catalog Questions]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const incoming: Array<{ catalogSlug: string; enabled: boolean; required: boolean }> =
      body.questions

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
    }

    // Validate slugs
    const slugs = incoming.map((q) => q.catalogSlug)
    const templates = await prisma.customRegistrationQuestion.findMany({
      where: { isTemplate: true, catalogSlug: { in: slugs } },
    })
    const templateBySlug = new Map(templates.map((t) => [t.catalogSlug!, t]))

    const unknownSlugs = slugs.filter((s) => !templateBySlug.has(s))
    if (unknownSlugs.length > 0) {
      return NextResponse.json(
        { error: `Unknown catalog slugs: ${unknownSlugs.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch existing event copies for these slugs
    const existingCopies = await prisma.customRegistrationQuestion.findMany({
      where: { eventId, isTemplate: false, catalogSlug: { in: slugs } },
    })
    const existingBySlug = new Map(existingCopies.map((c) => [c.catalogSlug!, c]))

    // Check answer counts for copies being toggled off
    const toDisableSlugs = incoming
      .filter((q) => !q.enabled)
      .map((q) => q.catalogSlug)
      .filter((s) => existingBySlug.has(s))

    const disableCopyIds = toDisableSlugs.map((s) => existingBySlug.get(s)!.id)
    const answerCounts =
      disableCopyIds.length > 0
        ? await prisma.customRegistrationAnswer.groupBy({
            by: ['questionId'],
            where: { questionId: { in: disableCopyIds } },
            _count: { questionId: true },
          })
        : []
    const answerCountById = new Map(answerCounts.map((r) => [r.questionId, r._count.questionId]))

    // Collect slugs that cannot be disabled (have answers)
    const blockedSlugs: string[] = []
    for (const slug of toDisableSlugs) {
      const copy = existingBySlug.get(slug)!
      if ((answerCountById.get(copy.id) ?? 0) > 0) {
        blockedSlugs.push(slug)
      }
    }

    // Process each question
    let created = 0
    let updated = 0
    let deleted = 0

    for (const item of incoming) {
      if (blockedSlugs.includes(item.catalogSlug)) continue // skip — will be reported as error

      const template = templateBySlug.get(item.catalogSlug)!
      const existing = existingBySlug.get(item.catalogSlug)

      if (item.enabled) {
        if (existing) {
          // Update required only if it changed
          if (existing.required !== item.required) {
            await prisma.customRegistrationQuestion.update({
              where: { id: existing.id },
              data: { required: item.required },
            })
            updated++
          }
        } else {
          // Copy template into an event-scoped question
          await prisma.customRegistrationQuestion.create({
            data: {
              eventId,
              questionText: template.questionText,
              questionType: template.questionType,
              options: template.options ?? Prisma.JsonNull,
              required: item.required,
              appliesTo: template.appliesTo,
              displayOrder: template.displayOrder,
              catalogSlug: template.catalogSlug,
              catalogCategory: template.catalogCategory,
              isTemplate: false,
            },
          })
          created++
        }
      } else {
        // enabled=false: delete the event copy (no answers — checked above)
        if (existing) {
          await prisma.customRegistrationQuestion.delete({ where: { id: existing.id } })
          deleted++
        }
      }
    }

    const response: Record<string, unknown> = { created, updated, deleted }
    if (blockedSlugs.length > 0) {
      response.warnings = blockedSlugs.map((slug) => ({
        catalogSlug: slug,
        reason: 'This question has existing responses and cannot be disabled. Export the responses before removing it.',
      }))
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('[POST Catalog Questions] error:', err)
    return NextResponse.json({ error: 'Failed to update catalog questions' }, { status: 500 })
  }
}
