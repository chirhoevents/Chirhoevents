import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { documentsSummary } from '@/lib/lux/program-status'
import { parseSessions } from '@/lib/lux/program-templates'

type Params = { params: Promise<{ id: string }> }

/** GET /api/lux/programs/[id]/roster: every child in the program with family, payment and document status */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params

  const program = await prisma.luxProgram.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { requirements: { orderBy: { displayOrder: 'asc' } } },
  })
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  const includeCancelled = request.nextUrl.searchParams.get('cancelled') === '1'

  const registrations = await prisma.luxProgramRegistration.findMany({
    where: { programId: id, ...(includeCancelled ? {} : { cancelledAt: null }) },
    include: {
      child: true,
      household: {
        select: {
          id: true, guardian1FirstName: true, guardian1LastName: true, guardian2FirstName: true, guardian2LastName: true,
          email: true, phone: true,
        },
      },
      order: { select: { id: true, status: true, confirmationCode: true, amountDue: true, amountPaid: true, feeAssistanceStatus: true } },
      documents: {
        select: {
          id: true, requirementId: true, status: true, fileName: true, uploadedAt: true, uploadedVia: true,
          reviewerNote: true, reviewedAt: true, lastReminderAt: true, storageRef: true,
        },
      },
    },
    orderBy: [{ child: { lastName: 'asc' } }, { child: { firstName: 'asc' } }],
  })

  return NextResponse.json({
    program: {
      id: program.id,
      name: program.name,
      term: program.term,
      collectSponsor: program.collectSponsor,
      collectServiceHours: program.collectServiceHours,
      serviceHoursRequired: program.serviceHoursRequired,
      questions: program.questions,
      audience: program.audience,
      feeType: program.feeType,
      sessions: parseSessions(program.sessions).map(sess => ({ id: sess.id, name: sess.name, schedule: sess.schedule, capacity: sess.capacity })),
    },
    requirements: program.requirements.map(r => ({ id: r.id, key: r.key, label: r.label, required: r.required, allowParishLookup: r.allowParishLookup })),
    registrations: registrations.map(r => ({
      id: r.id,
      status: r.status,
      cancelledAt: r.cancelledAt,
      grade: r.grade ?? r.child.grade,
      sessionId: r.sessionId,
      feeAmount: Number(r.feeAmount),
      discountAmount: Number(r.discountAmount),
      answers: r.answers,
      sponsorInfo: r.sponsorInfo,
      serviceHoursCompleted: r.serviceHoursCompleted,
      staffNotes: r.staffNotes,
      createdAt: r.createdAt,
      child: {
        id: r.child.id, firstName: r.child.firstName, lastName: r.child.lastName, dateOfBirth: r.child.dateOfBirth,
        gender: r.child.gender, baptized: r.child.baptized, baptismDate: r.child.baptismDate, baptismParish: r.child.baptismParish,
        baptismCity: r.child.baptismCity, baptizedAtThisParish: r.child.baptizedAtThisParish, allergies: r.child.allergies,
        medicalNotes: r.child.medicalNotes, school: r.child.school, firstCommunionDate: r.child.firstCommunionDate,
        firstCommunionParish: r.child.firstCommunionParish, isAdult: r.child.isAdult,
      },
      household: r.household,
      order: r.order && {
        ...r.order,
        amountDue: Number(r.order.amountDue),
        amountPaid: Number(r.order.amountPaid),
      },
      documents: r.documents.map(({ storageRef, ...d }) => ({ ...d, hasFile: !!storageRef })),
      documentSummary: documentsSummary(program.requirements, r.documents),
    })),
  })
}
