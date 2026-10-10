import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'

type Params = { params: Promise<{ id: string }> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null)
const day = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}
const bool = (v: unknown) => (v === true ? true : v === false ? false : null)

/** GET /api/lux/households/[id] — one family: details, children, registrations, documents and payments */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params

  const household = await prisma.luxHousehold.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      children: { orderBy: [{ archivedAt: 'asc' }, { dateOfBirth: 'asc' }] },
      registrations: {
        include: {
          program: { select: { id: true, name: true, term: true, status: true } },
          documents: {
            include: { requirement: { select: { label: true, required: true, displayOrder: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      orders: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!household) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  return NextResponse.json({
    household: {
      id: household.id,
      guardian1FirstName: household.guardian1FirstName,
      guardian1LastName: household.guardian1LastName,
      guardian1Relationship: household.guardian1Relationship,
      guardian2FirstName: household.guardian2FirstName,
      guardian2LastName: household.guardian2LastName,
      guardian2Relationship: household.guardian2Relationship,
      guardian2Email: household.guardian2Email,
      guardian2Phone: household.guardian2Phone,
      email: household.email,
      phone: household.phone,
      street: household.street,
      city: household.city,
      state: household.state,
      zip: household.zip,
      emergencyContactName: household.emergencyContactName,
      emergencyContactPhone: household.emergencyContactPhone,
      registeredParishioner: household.registeredParishioner,
      staffNotes: household.staffNotes,
      createdAt: household.createdAt,
    },
    children: household.children.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      dateOfBirth: c.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      gender: c.gender,
      grade: c.grade,
      school: c.school,
      baptized: c.baptized,
      baptismDate: c.baptismDate?.toISOString().slice(0, 10) ?? null,
      baptismParish: c.baptismParish,
      baptismCity: c.baptismCity,
      baptizedAtThisParish: c.baptizedAtThisParish,
      firstCommunionDate: c.firstCommunionDate?.toISOString().slice(0, 10) ?? null,
      firstCommunionParish: c.firstCommunionParish,
      allergies: c.allergies,
      medicalNotes: c.medicalNotes,
      archived: !!c.archivedAt,
    })),
    registrations: household.registrations.map(r => ({
      id: r.id,
      childId: r.childId,
      orderId: r.orderId,
      programId: r.program.id,
      programName: r.program.name,
      programArchived: r.program.status === 'archived',
      term: r.term,
      grade: r.grade,
      status: r.cancelledAt ? 'cancelled' : r.status,
      feeAmount: Number(r.feeAmount),
      documents: r.documents
        .sort((a, b) => a.requirement.displayOrder - b.requirement.displayOrder)
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
        })),
    })),
    orders: household.orders.map(o => ({
      id: o.id,
      confirmationCode: o.confirmationCode,
      status: o.status,
      total: Number(o.total),
      amountDue: Number(o.amountDue),
      amountPaid: Number(o.amountPaid),
      owed: Math.max(0, Math.round((Number(o.amountDue) - Number(o.amountPaid)) * 100) / 100),
      feeAssistanceStatus: o.feeAssistanceStatus,
      createdAt: o.createdAt,
    })),
  })
}

/**
 * PUT /api/lux/households/[id]
 * Staff update a family's details and children.
 * { household: {...}, children: [{ id, ...fields, archived? }] }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const existing = await prisma.luxHousehold.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const h = body.household
  if (h) {
    const email = (s(h.email, 255) ?? '').toLowerCase()
    if (!s(h.guardian1FirstName, 100) || !s(h.guardian1LastName, 100)) return NextResponse.json({ error: 'Enter the parent or guardian’s name.' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    if (!s(h.phone, 30)) return NextResponse.json({ error: 'Enter a phone number.' }, { status: 400 })
    const clash = await prisma.luxHousehold.findUnique({
      where: { lux_household_org_email: { organizationId: ctx.organizationId, emailNormalized: email } },
      select: { id: true },
    })
    if (clash && clash.id !== id) return NextResponse.json({ error: 'Another family on file already uses that email.' }, { status: 400 })

    await prisma.luxHousehold.update({
      where: { id },
      data: {
        guardian1FirstName: s(h.guardian1FirstName, 100)!,
        guardian1LastName: s(h.guardian1LastName, 100)!,
        guardian1Relationship: s(h.guardian1Relationship, 50),
        email,
        emailNormalized: email,
        phone: s(h.phone, 30)!,
        street: s(h.street, 255),
        city: s(h.city, 100),
        state: s(h.state, 50),
        zip: s(h.zip, 20),
        guardian2FirstName: s(h.guardian2FirstName, 100),
        guardian2LastName: s(h.guardian2LastName, 100),
        guardian2Relationship: s(h.guardian2Relationship, 50),
        guardian2Email: s(h.guardian2Email, 255)?.toLowerCase() ?? null,
        guardian2Phone: s(h.guardian2Phone, 30),
        emergencyContactName: s(h.emergencyContactName, 255),
        emergencyContactPhone: s(h.emergencyContactPhone, 30),
        registeredParishioner: bool(h.registeredParishioner),
        staffNotes: s(h.staffNotes, 5000),
      },
    })
  }

  for (const c of Array.isArray(body.children) ? body.children.slice(0, 30) : []) {
    if (typeof c?.id !== 'string') continue
    if (!s(c.firstName, 100) || !s(c.lastName, 100)) return NextResponse.json({ error: 'Each child needs a first and last name.' }, { status: 400 })
    await prisma.luxChild.updateMany({
      where: { id: c.id, householdId: id },
      data: {
        firstName: s(c.firstName, 100)!,
        lastName: s(c.lastName, 100)!,
        dateOfBirth: day(c.dateOfBirth),
        gender: s(c.gender, 20),
        grade: s(c.grade, 10),
        school: s(c.school, 255),
        baptized: bool(c.baptized),
        baptismDate: day(c.baptismDate),
        baptismParish: s(c.baptismParish, 255),
        baptismCity: s(c.baptismCity, 255),
        baptizedAtThisParish: c.baptizedAtThisParish === true,
        firstCommunionDate: day(c.firstCommunionDate),
        firstCommunionParish: s(c.firstCommunionParish, 255),
        allergies: s(c.allergies, 2000),
        medicalNotes: s(c.medicalNotes, 2000),
        archivedAt: c.archived === true ? new Date() : null,
      },
    })
  }

  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: 'household.updated',
    targetType: 'lux_household', targetId: id, ip: clientIp(request),
  })
  return NextResponse.json({ success: true })
}
