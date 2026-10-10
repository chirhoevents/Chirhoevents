import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'

const VIEWS: Record<string, string[]> = {
  review: ['received'],
  lookup: ['parish_lookup'],
  missing: ['missing', 'needs_resubmission'],
  approved: ['approved'],
}

/**
 * GET /api/lux/documents?view=review|lookup|missing|approved&programId=
 * The document checklist across all current programs.
 */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const q = request.nextUrl.searchParams
  const view = VIEWS[q.get('view') || ''] ? q.get('view')! : 'review'
  const programId = q.get('programId') || undefined

  const live = {
    organizationId: ctx.organizationId,
    programRegistration: { cancelledAt: null, program: { status: { not: 'archived' } }, ...(programId ? { programId } : {}) },
  }
  const [rows, counts, programs] = await Promise.all([
    prisma.luxDocumentSubmission.findMany({
      where: { ...live, status: { in: VIEWS[view] } },
      include: {
        requirement: { select: { label: true, required: true } },
        child: { select: { firstName: true, lastName: true } },
        household: { select: { id: true, guardian1FirstName: true, guardian1LastName: true } },
        programRegistration: { select: { program: { select: { id: true, name: true } } } },
      },
      orderBy: view === 'review' ? { uploadedAt: 'asc' } : { createdAt: 'asc' },
      take: 1000,
    }),
    prisma.luxDocumentSubmission.groupBy({ by: ['status'], where: live, _count: { _all: true } }),
    prisma.luxProgram.findMany({
      where: { organizationId: ctx.organizationId, status: { not: 'archived' }, requirements: { some: {} } },
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const countBy = Object.fromEntries(counts.map(c => [c.status, c._count._all]))
  const sum = (statuses: string[]) => statuses.reduce((s, st) => s + (countBy[st] ?? 0), 0)

  return NextResponse.json({
    view,
    counts: { review: sum(VIEWS.review), lookup: sum(VIEWS.lookup), missing: sum(VIEWS.missing), approved: sum(VIEWS.approved) },
    programs,
    documents: rows
      .sort((a, b) => view === 'missing'
        ? a.household.guardian1LastName.localeCompare(b.household.guardian1LastName) || a.child.firstName.localeCompare(b.child.firstName)
        : 0)
      .map(d => ({
        id: d.id,
        label: d.requirement.label,
        required: d.requirement.required,
        status: d.status,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt,
        uploadedVia: d.uploadedVia,
        reviewerNote: d.reviewerNote,
        lastReminderAt: d.lastReminderAt,
        hasFile: !!d.storageRef,
        childName: `${d.child.firstName} ${d.child.lastName}`,
        householdId: d.household.id,
        familyName: `${d.household.guardian1FirstName} ${d.household.guardian1LastName}`,
        programId: d.programRegistration.program.id,
        programName: d.programRegistration.program.name,
      })),
  })
}
