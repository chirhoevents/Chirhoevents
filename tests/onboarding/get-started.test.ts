/**
 * The public Get Started form API on a real database: every answer is saved
 * and reaches the master admin, the plan is suggested from what they need,
 * and incomplete forms get a clear message instead of a server error.
 *
 * Needs a test database: DATABASE_URL=postgresql://... npx tsx tests/onboarding/get-started.test.ts
 */

import { check, section, finish, jsonRequest } from '../lux/helpers'

async function main() {
  const { prisma } = await import('../../src/lib/prisma')
  const { POST } = await import('../../src/app/api/onboarding-requests/route')
  const { describeNeeds } = await import('../../src/lib/onboarding-needs')

  const stamp = Date.now()
  const base = {
    organizationName: 'St. Rose of Lima', organizationType: 'parish', website: 'strose.org',
    contactFirstName: 'Ana', contactLastName: 'Reyes', contactEmail: `Ana.${stamp}@Example.com`, contactPhone: '555-0110',
    contactJobTitle: 'DRE', legalEntityName: 'St. Rose of Lima Catholic Parish', taxId: '12-3456789',
    billingAddress: '1 Church St\nAustin, TX 78701', billingCycle: 'annual', paymentMethod: 'check',
    howDidYouHear: 'other', howDidYouHearOther: 'Diocesan newsletter', additionalNotes: 'Registration opens in August.',
  }
  const send = async (body: unknown) => {
    const res = await POST(jsonRequest('http://localhost:3000/api/onboarding-requests', body))
    return { status: res.status, data: await res.json() }
  }
  const created: string[] = []

  try {
    section('A parish that needs Lux')
    const lux = await send({
      ...base,
      needs: {
        kind: 'lux', programs: ['faith_formation', 'ocia', 'not-a-program'], families: '150-400', luxEvents: 'lux-10', spanish: 'yes',
        onlinePayments: 'online', currentTools: ['paper', 'jotform', 'other'], currentToolsOther: 'Flocknote', start: 'season',
        events: '10+', // not asked for Lux; dropped
      },
    })
    check('accepted', lux.status === 201, lux.data)
    created.push(lux.data.requestId)
    const row = await prisma.organizationOnboardingRequest.findUniqueOrThrow({ where: { id: lux.data.requestId } })
    check('suggests the Parish plan for up to 10 parish events', row.requestedTier === 'parish')
    check('Lux plans are monthly', row.billingCyclePreference === 'monthly')
    check('every contact and billing detail is saved',
      row.contactJobTitle === 'DRE' && row.legalEntityName === base.legalEntityName && row.taxId === base.taxId &&
      row.billingAddress === base.billingAddress && row.website === 'strose.org' && row.howDidYouHearOther === 'Diocesan newsletter' &&
      row.contactEmail === `ana.${stamp}@example.com`)
    const needs = row.needs as Record<string, unknown>
    check('the answers are saved, minus anything not on the lists',
      JSON.stringify(needs.programs) === JSON.stringify(['faith_formation', 'ocia']) && needs.spanish === 'yes' && needs.events === '', needs)
    const rows = Object.fromEntries(describeNeeds(row.needs).map(r => [r.label, r.value]))
    check('the master admin sees them in plain words',
      rows['Programs'] === 'Faith Formation / Religious Education, OCIA' && rows['Families a year'] === '150–400 families' &&
      rows['Uses today'] === 'Paper forms, JotForm, Flocknote' && rows['Spanish for families'] === 'Yes, many of our families', rows)

    section('Larger events plus Lux')
    const both = await send({
      ...base, organizationName: 'Diocese of Test', organizationType: 'ministry', contactEmail: `both.${stamp}@example.com`,
      needs: { kind: 'both', programs: ['confirmation'], luxEvents: 'lux-5', events: '6-10', attendees: '1000-3000', eventKinds: ['retreats'], features: ['housing', 'forms'] },
    })
    check('accepted, including the ministry type', both.status === 201, both.data)
    created.push(both.data.requestId)
    const bothRow = await prisma.organizationOnboardingRequest.findUniqueOrThrow({ where: { id: both.data.requestId } })
    check('suggests the larger-events plan', bothRow.requestedTier === 'shrine')
    check('annual billing is kept for larger plans', bothRow.billingCyclePreference === 'annual')
    check('estimates count both kinds of events', bothRow.estimatedEventsPerYear === 15 && bothRow.estimatedRegistrationsPerYear === 3000)

    section('Incomplete forms')
    const noPrograms = await send({ ...base, contactEmail: `x.${stamp}@example.com`, needs: { kind: 'lux', luxEvents: 'lux-5' } })
    check('Lux without any program is refused with a message', noPrograms.status === 400 && /program/.test(noPrograms.data.error), noPrograms.data)
    const noEvents = await send({ ...base, contactEmail: `y.${stamp}@example.com`, needs: { kind: 'events', events: '1-5' } })
    check('larger events without attendees is refused', noEvents.status === 400 && /attend/.test(noEvents.data.error), noEvents.data)
    const badEmail = await send({ ...base, contactEmail: 'not-an-email', needs: { kind: 'lux', programs: ['vbs'], luxEvents: 'lux-5' } })
    check('a bad email is refused', badEmail.status === 400 && /email/.test(badEmail.data.error))
    const noName = await send({ ...base, organizationName: '  ', needs: { kind: 'lux', programs: ['vbs'], luxEvents: 'lux-5' } })
    check('a blank organization name is refused (not a server error)', noName.status === 400)
  } finally {
    await prisma.platformActivityLog.deleteMany({ where: { activityType: 'onboarding_request', description: { contains: String(stamp) } } })
    await prisma.platformActivityLog.deleteMany({ where: { activityType: 'onboarding_request', OR: created.map(id => ({ metadata: { path: ['requestId'], equals: id } })) } })
    await prisma.organizationOnboardingRequest.deleteMany({ where: { id: { in: created } } })
    await prisma.$disconnect()
  }
  finish()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
