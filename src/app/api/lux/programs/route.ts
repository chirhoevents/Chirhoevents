import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { createProgram, programIsOpen, validateProgramInput } from '@/lib/lux/program-server'

/** GET /api/lux/programs: programs with registration, payment and document counts */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error

  const programs = await prisma.luxProgram.findMany({
    where: { organizationId: ctx.organizationId, ...(request.nextUrl.searchParams.get('archived') === '1' ? {} : { status: { not: 'archived' } }) },
    orderBy: [{ term: 'desc' }, { name: 'asc' }],
    include: { requirements: { select: { id: true, required: true } } },
  })
  const ids = programs.map(p => p.id)

  const [registrations, outstandingDocs, unpaid] = await Promise.all([
    prisma.luxProgramRegistration.groupBy({
      by: ['programId'],
      where: { programId: { in: ids }, cancelledAt: null },
      _count: { _all: true },
    }),
    prisma.luxDocumentSubmission.groupBy({
      by: ['requirementId'],
      where: {
        organizationId: ctx.organizationId,
        status: { in: ['missing', 'needs_resubmission'] },
        requirement: { required: true, programId: { in: ids } },
        programRegistration: { cancelledAt: null },
      },
      _count: { _all: true },
    }),
    prisma.luxProgramRegistration.groupBy({
      by: ['programId'],
      where: { programId: { in: ids }, cancelledAt: null, order: { status: { in: ['office_pending', 'assistance_requested', 'pending_payment'] } } },
      _count: { _all: true },
    }),
  ])
  const count = (rows: Array<{ programId: string; _count: { _all: number } }>, id: string) => rows.find(r => r.programId === id)?._count._all ?? 0
  const requirementProgram = new Map(programs.flatMap(p => p.requirements.map(r => [r.id, p.id] as const)))
  const docsByProgram = new Map<string, number>()
  for (const row of outstandingDocs) {
    const pid = requirementProgram.get(row.requirementId)
    if (pid) docsByProgram.set(pid, (docsByProgram.get(pid) || 0) + row._count._all)
  }

  return NextResponse.json({
    programs: programs.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      term: p.term,
      templateKey: p.templateKey,
      status: p.status,
      isOpen: programIsOpen(p),
      capacity: p.capacity,
      tuitionPerChild: Number(p.tuitionPerChild),
      registrationClosesAt: p.registrationClosesAt,
      registered: count(registrations, p.id),
      unpaid: count(unpaid, p.id),
      outstandingDocuments: docsByProgram.get(p.id) ?? 0,
    })),
  })
}

/** POST /api/lux/programs: create a program (as a draft) */
export async function POST(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error

  const parsed = validateProgramInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const program = await createProgram(ctx.organizationId, ctx.user.id, parsed.value)
  return NextResponse.json({ program: { id: program.id } }, { status: 201 })
}
