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

    const staffRegistrations = await prisma.staffRegistration.findMany({
      where: {
        eventId,
        ...(searchTerm
          ? {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { role: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        liabilityForm: {
          include: {
            approvedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    type StaffRow = typeof staffRegistrations[number]

    const members = staffRegistrations.map((sr: StaffRow) => {
      const form = sr.liabilityForm
      const formStatus = form?.completed
        ? (form.formStatus || 'pending')
        : 'not_submitted'

      if (status !== 'all' && formStatus !== status) return null

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
        formId: form?.id || null,
        formCompleted: form?.completed || false,
        completedAt: form?.completedAt?.toISOString() || null,
        approvedAt: form?.approvedAt?.toISOString() || null,
        approvedByName: form?.approvedBy
          ? `${form.approvedBy.firstName} ${form.approvedBy.lastName}`
          : null,
        deniedReason: form?.deniedReason || null,
        allergies: form?.allergies || null,
        medications: form?.medications || null,
        medicalConditions: form?.medicalConditions || null,
        emergencyContact1Name: form?.emergencyContact1Name || null,
        emergencyContact1Phone: form?.emergencyContact1Phone || null,
      }
    }).filter(Boolean)

    const totalCount = staffRegistrations.length
    const submittedCount = staffRegistrations.filter((sr: StaffRow) => sr.liabilityForm?.completed).length
    const pendingCount = staffRegistrations.filter(
      (sr: StaffRow) => sr.liabilityForm?.completed && sr.liabilityForm?.formStatus === 'pending'
    ).length
    const approvedCount = staffRegistrations.filter(
      (sr: StaffRow) => sr.liabilityForm?.formStatus === 'approved'
    ).length

    return NextResponse.json({
      members,
      stats: { totalCount, submittedCount, pendingCount, approvedCount },
    })
  } catch (error) {
    console.error('[Poros Liability Staff] error:', error)
    return NextResponse.json({ error: 'Failed to fetch staff forms' }, { status: 500 })
  }
}
