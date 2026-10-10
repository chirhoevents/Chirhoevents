import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit } from '@/lib/lux/access'
import { getFamilySession } from '@/lib/lux/family-session'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null)

/**
 * PUT /api/lux/public/family
 * A signed-in family (family link, not a one-order session) updates their
 * contact details and children's health notes.
 */
export async function PUT(request: NextRequest) {
  const session = await getFamilySession(request)
  if (!session || session.orderId) {
    return NextResponse.json({ error: 'Please open the family link from your email to make changes.' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const h = body.household ?? {}

  const email = (s(h.email, 255) ?? '').toLowerCase()
  if (!s(h.guardian1FirstName, 100) || !s(h.guardian1LastName, 100)) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!s(h.phone, 30)) return NextResponse.json({ error: 'Please enter a phone number.' }, { status: 400 })

  const clash = await prisma.luxHousehold.findUnique({
    where: { lux_household_org_email: { organizationId: session.organizationId, emailNormalized: email } },
    select: { id: true },
  })
  if (clash && clash.id !== session.householdId) {
    return NextResponse.json({ error: 'That email is already used by another family on file. Please contact the parish office.' }, { status: 400 })
  }

  await prisma.luxHousehold.update({
    where: { id: session.householdId },
    data: {
      guardian1FirstName: s(h.guardian1FirstName, 100)!,
      guardian1LastName: s(h.guardian1LastName, 100)!,
      email,
      emailNormalized: email,
      phone: s(h.phone, 30)!,
      street: s(h.street, 255),
      city: s(h.city, 100),
      state: s(h.state, 50),
      zip: s(h.zip, 20),
      guardian2FirstName: s(h.guardian2FirstName, 100),
      guardian2LastName: s(h.guardian2LastName, 100),
      guardian2Email: s(h.guardian2Email, 255)?.toLowerCase() ?? null,
      guardian2Phone: s(h.guardian2Phone, 30),
      emergencyContactName: s(h.emergencyContactName, 255),
      emergencyContactPhone: s(h.emergencyContactPhone, 30),
    },
  })

  for (const c of Array.isArray(body.children) ? body.children.slice(0, 20) : []) {
    if (typeof c?.id !== 'string') continue
    await prisma.luxChild.updateMany({
      where: { id: c.id, householdId: session.householdId },
      data: { allergies: s(c.allergies, 2000), medicalNotes: s(c.medicalNotes, 2000), school: s(c.school, 255) },
    })
  }

  await luxAudit({
    organizationId: session.organizationId,
    actorHouseholdId: session.householdId,
    action: 'family.updated_details',
    ip: clientIp(request),
  })
  return NextResponse.json({ success: true })
}
