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

    const { error } = await verifyFormsViewAccess(
      request,
      eventId,
      '[Poros Liability Staff]'
    )
    if (error) return error

    const searchFilter = searchTerm
      ? {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
            { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
            { role: { contains: searchTerm, mode: 'insensitive' as const } },
            { email: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Primary: staff registrations for this event
    const staffRegs = await prisma.staffRegistration.findMany({
      where: { eventId, ...searchFilter },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    // Fetch linked liability forms (if any)
    const formIds = staffRegs
      .map(sr => sr.liabilityFormId)
      .filter((id): id is string => id !== null)

    const forms = formIds.length > 0
      ? await prisma.liabilityForm.findMany({
          where: { id: { in: formIds } },
          include: { approvedBy: { select: { firstName: true, lastName: true } } },
        })
      : []

    const formMap = new Map(forms.map(f => [f.id, f]))

    // Fallback: completed forms for this event linked to staff registrations
    // whose StaffRegistration may have a different eventId (edge case)
    const staffRegIdSet = new Set(staffRegs.map(sr => sr.id))
    const fallbackForms = await prisma.liabilityForm.findMany({
      where: {
        eventId,
        staffRegistrations: { some: {} },
        id: { notIn: formIds.length > 0 ? formIds : ['00000000-0000-0000-0000-000000000000'] },
      },
      include: {
        staffRegistrations: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isVendorStaff: true,
            tshirtSize: true,
            dietaryRestrictions: true,
            porosAccessCode: true,
          },
        },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    })

    type FormRow = typeof forms[number]

    const buildMember = (
      sr: { id: string; firstName: string; lastName: string; email: string; phone: string; role: string; isVendorStaff: boolean; tshirtSize: string; dietaryRestrictions: string | null; porosAccessCode: string | null },
      form: FormRow | null
    ) => {
      const formStatus = form?.completed ? (form.formStatus || 'pending') : 'not_submitted'
      return {
        id: sr.id,
        firstName: sr.firstName,
        lastName: sr.lastName,
        email: sr.email,
        phone: sr.phone,
        role: sr.role,
        isVendorStaff: sr.isVendorStaff,
        tShirtSize: sr.tshirtSize,
        dietaryRestrictions: sr.dietaryRestrictions,
        porosAccessCode: sr.porosAccessCode,
        formStatus,
        formId: form?.id ?? null,
        formCompleted: form?.completed ?? false,
        completedAt: form?.completedAt?.toISOString() ?? null,
        approvedAt: form?.approvedAt?.toISOString() ?? null,
        approvedByName: form?.approvedBy
          ? `${form.approvedBy.firstName} ${form.approvedBy.lastName}`
          : null,
        deniedReason: form?.deniedReason ?? null,
        allergies: form?.allergies ?? null,
        medications: form?.medications ?? null,
        medicalConditions: form?.medicalConditions ?? null,
        emergencyContact1Name: form?.emergencyContact1Name ?? null,
        emergencyContact1Phone: form?.emergencyContact1Phone ?? null,
      }
    }

    // Build member list from staff registrations
    const members: ReturnType<typeof buildMember>[] = staffRegs
      .map(sr => {
        const form = sr.liabilityFormId ? (formMap.get(sr.liabilityFormId) ?? null) : null
        return buildMember(sr, form as FormRow | null)
      })
      .filter(m => status === 'all' || m.formStatus === status)

    // Add edge-case: forms for this event linked to staff NOT in staffRegs
    for (const f of fallbackForms) {
      for (const sr of f.staffRegistrations) {
        if (!staffRegIdSet.has(sr.id)) {
          const m = buildMember(sr, f as FormRow)
          if (status === 'all' || m.formStatus === status) members.push(m)
        }
      }
    }

    // Stats (always over all staff, ignoring status filter)
    const totalCount = staffRegs.length + fallbackForms.reduce(
      (n, f) => n + f.staffRegistrations.filter(sr => !staffRegIdSet.has(sr.id)).length,
      0
    )
    const submittedCount = staffRegs.filter(sr => {
      const f = sr.liabilityFormId ? formMap.get(sr.liabilityFormId) : null
      return f?.completed
    }).length + fallbackForms.filter(f => f.completed && f.staffRegistrations.some(sr => !staffRegIdSet.has(sr.id))).length
    const pendingCount = staffRegs.filter(sr => {
      const f = sr.liabilityFormId ? formMap.get(sr.liabilityFormId) : null
      return f?.completed && f.formStatus === 'pending'
    }).length + fallbackForms.filter(f => f.completed && f.formStatus === 'pending' && f.staffRegistrations.some(sr => !staffRegIdSet.has(sr.id))).length
    const approvedCount = staffRegs.filter(sr => {
      const f = sr.liabilityFormId ? formMap.get(sr.liabilityFormId) : null
      return f?.formStatus === 'approved'
    }).length + fallbackForms.filter(f => f.formStatus === 'approved' && f.staffRegistrations.some(sr => !staffRegIdSet.has(sr.id))).length

    console.log(`[Poros Liability Staff] eventId=${eventId} regs=${staffRegs.length} fallback=${fallbackForms.length} total=${totalCount} submitted=${submittedCount}`)

    return NextResponse.json({
      members,
      stats: { totalCount, submittedCount, pendingCount, approvedCount },
    })
  } catch (err) {
    console.error('[Poros Liability Staff] error:', err)
    return NextResponse.json({ error: 'Failed to fetch staff forms' }, { status: 500 })
  }
}
