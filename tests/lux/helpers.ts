/**
 * Shared setup for the Lux tests. They run against a real Postgres database
 * (DATABASE_URL) and create their own throwaway organizations, so point
 * DATABASE_URL at a test database, never production.
 */

import { randomUUID } from 'crypto'

process.env.RESEND_API_KEY ||= 're_test_key'
process.env.STRIPE_SECRET_KEY ||= 'sk_test_dummy'
process.env.NEXT_PUBLIC_APP_URL ||= 'http://localhost:3000'

let failures = 0
export function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`    ✅ ${name}`)
  else {
    failures++
    console.error(`    ❌ ${name}`, detail !== undefined ? detail : '')
  }
}
export function section(title: string) {
  console.log(`\n  ${title}`)
}
export function finish() {
  console.log(failures ? `\n  ${failures} check(s) failed\n` : '\n  All checks passed\n')
  process.exit(failures ? 1 : 0)
}

export async function createOrg(prisma: any, overrides: Record<string, unknown> = {}) {
  const id = randomUUID()
  const org = await prisma.organization.create({
    data: {
      id,
      name: `Lux Test Parish ${id.slice(0, 6)}`,
      type: 'parish',
      contactEmail: `office-${id}@example.com`,
      subscriptionTier: 'chapel',
      subscriptionStatus: 'active',
      monthlyFee: 39,
      storageLimitGb: 5,
      ...overrides,
    },
  })
  const user = await prisma.user.create({
    data: {
      email: `admin-${id}@example.com`,
      firstName: 'Pat',
      lastName: 'Admin',
      role: 'org_admin',
      organizationId: org.id,
      clerkUserId: `user_test_${id}`,
    },
  })
  return { org, user }
}

export async function deleteOrg(prisma: any, organizationId: string) {
  // Delete in FK order; everything here belongs to the throwaway org
  await prisma.luxAuditLog.deleteMany({ where: { organizationId } })
  await prisma.luxFamilySession.deleteMany({ where: { organizationId } })
  await prisma.luxMagicLink.deleteMany({ where: { organizationId } })
  await prisma.luxDocumentSubmission.deleteMany({ where: { organizationId } })
  await prisma.luxProgramRegistration.deleteMany({ where: { organizationId } })
  await prisma.luxDocumentRequirement.deleteMany({ where: { organizationId } })
  await prisma.luxOrder.deleteMany({ where: { organizationId } })
  await prisma.luxProgram.deleteMany({ where: { organizationId } })
  await prisma.luxChild.deleteMany({ where: { organizationId } })
  await prisma.luxHousehold.deleteMany({ where: { organizationId } })
  await prisma.emailLog.deleteMany({ where: { organizationId } })
  await prisma.payment.deleteMany({ where: { organizationId } })
  await prisma.paymentBalance.deleteMany({ where: { organizationId } })
  const regs = await prisma.individualRegistration.findMany({ where: { organizationId }, select: { id: true } })
  await prisma.customRegistrationAnswer.deleteMany({ where: { registrationId: { in: regs.map((r: any) => r.id) } } })
  await prisma.individualRegistration.deleteMany({ where: { organizationId } })
  const events = await prisma.event.findMany({ where: { organizationId }, select: { id: true } })
  const eventIds = events.map((e: any) => e.id)
  await prisma.customRegistrationQuestion.deleteMany({ where: { eventId: { in: eventIds } } })
  await prisma.eventTicketOption.deleteMany({ where: { organizationId } })
  await prisma.event.deleteMany({ where: { organizationId } })
  await prisma.user.deleteMany({ where: { organizationId } })
  await prisma.organization.delete({ where: { id: organizationId } })
}

export function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  // Imported lazily so DATABASE_URL etc. are set before Next modules load
  const { NextRequest } = require('next/server')
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  })
}

export const futureDay = (daysAhead: number) => {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return d.toISOString().slice(0, 10)
}
