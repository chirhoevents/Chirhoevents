import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSalveAccess, salveAccessErrorStatus } from '@/lib/salve-access'

// GET - Everyone besides parish groups who can get a badge from the Name Tag
// Designer (individuals, staff, approved vendors), plus the event's meal
// colors for custom badges.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const [individuals, staff, vendors, mealGroups] = await Promise.all([
      prisma.individualRegistration.findMany({
        where: { eventId, cancelledAt: null },
        select: { id: true, firstName: true, lastName: true, preferredName: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.staffRegistration.findMany({
        where: { eventId },
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.vendorRegistration.findMany({
        where: { eventId, status: 'approved' },
        select: { id: true, businessName: true, contactFirstName: true, contactLastName: true },
        orderBy: { businessName: 'asc' },
      }),
      prisma.mealGroup.findMany({
        where: { eventId, isActive: true },
        select: { name: true, colorHex: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ])

    return NextResponse.json({
      individuals: individuals.map((r: any) => ({
        id: r.id,
        name: `${r.preferredName || r.firstName} ${r.lastName}`,
        detail: null,
      })),
      staff: staff.map((s: any) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        detail: s.role || null,
      })),
      vendors: vendors.map((v: any) => ({
        id: v.id,
        name: v.businessName,
        detail: `${v.contactFirstName} ${v.contactLastName}`,
      })),
      mealGroups: mealGroups.map((m: any) => ({ name: m.name, hex: m.colorHex })),
    })
  } catch (error: any) {
    const status = salveAccessErrorStatus(error)
    if (status) return NextResponse.json({ message: error.message }, { status })
    console.error('Failed to load badge roster:', error)
    return NextResponse.json({ message: 'Failed to load badge roster' }, { status: 500 })
  }
}
