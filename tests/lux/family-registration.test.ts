/**
 * Lux faith formation end to end on a real database: programs from
 * templates, a family registering two children into different programs,
 * sibling discount + family maximum across separate registrations, what an
 * unverified person can and can't do with an email already on file,
 * capacity, document upload permissions, document reuse, family links,
 * and order payments.
 *
 * Needs a test database: DATABASE_URL=postgresql://... npx tsx tests/lux/family-registration.test.ts
 */

import { check, section, finish, createOrg, deleteOrg } from './helpers'
import { S3Client } from '@aws-sdk/client-s3'

process.env.R2_ACCOUNT_ID = 'acct'
process.env.R2_ACCESS_KEY_ID = 'key'
process.env.R2_SECRET_ACCESS_KEY = 'secret'
process.env.R2_BUCKET_NAME = 'public-bucket'
process.env.R2_PUBLIC_URL = 'https://files.example.com'
process.env.R2_PRIVATE_BUCKET_NAME = 'private-bucket'
const s3Calls: Array<{ name: string; bucket: string }> = []
S3Client.prototype.send = (async function (command: any) {
  s3Calls.push({ name: command.constructor.name, bucket: command.input?.Bucket })
  return {}
}) as any

async function main() {
  const { prisma } = await import('../../src/lib/prisma')
  const { createProgram, validateProgramInput } = await import('../../src/lib/lux/program-server')
  const { getProgramTemplate } = await import('../../src/lib/lux/program-templates')
  const { parseFamilyInput, registerFamily, RegistrationError, cancelUnpaidOrders } = await import('../../src/lib/lux/family-registration')
  const { parseFeeRules } = await import('../../src/lib/lux/family-fees')
  const { createFamilySession, createMagicLink, consumeMagicLink } = await import('../../src/lib/lux/family-session')
  const { recalculateOrder, handleLuxOrderCheckoutExpired } = await import('../../src/lib/lux/order-payments')
  const { POST: upload } = await import('../../src/app/api/lux/public/family/documents/route')
  const { NextRequest } = await import('next/server')

  const rules = parseFeeRules({ siblingDiscount: { type: 'amount', value: 25 }, familyCap: 300 })
  const { org, user } = await createOrg(prisma, { publicSlug: `test-parish-${Date.now()}`, luxSettings: { feeRules: rules } })

  const makeProgram = async (templateKey: string, overrides: Record<string, unknown>) => {
    const t = getProgramTemplate(templateKey)
    const parsed = validateProgramInput({ templateKey, ...t.defaults, term: '2026–2027', ...overrides })
    if (!parsed.ok) throw new Error(parsed.error)
    const p = await createProgram(org.id, user.id, parsed.value)
    await prisma.luxProgram.update({ where: { id: p.id }, data: { status: 'open' } })
    return p
  }

  const register = async (raw: unknown, session: any = null) => {
    const parsed = parseFamilyInput(raw)
    if (!parsed.ok) throw new RegistrationError(parsed.error)
    return registerFamily({ organizationId: org.id, input: parsed.value, session, rules, paymentsReady: false })
  }
  const expectError = async (raw: unknown, pattern: RegExp, session: any = null) => {
    try { await register(raw, session); return false } catch (e) { return e instanceof RegistrationError && pattern.test(e.message) }
  }

  try {
    const ff = await makeProgram('faith_formation', { tuitionPerChild: 100, feeItems: [{ name: 'Books', amount: 30, siblingDiscount: false }] })
    const confirmation = await makeProgram('confirmation', { tuitionPerChild: 150 })
    const fc = await makeProgram('first_communion', { tuitionPerChild: 50, capacity: 1, grades: ['2'] })

    section('Programs from templates')
    const confReqs = await prisma.luxDocumentRequirement.findMany({ where: { programId: confirmation.id }, orderBy: { displayOrder: 'asc' } })
    check('Confirmation comes with baptismal certificate, sponsor letter, First Communion certificate',
      confReqs.map(r => r.key).join(',') === 'baptismal_certificate,sponsor_eligibility_letter,first_communion_certificate')
    const confProgram = await prisma.luxProgram.findUnique({ where: { id: confirmation.id } })
    check('Confirmation collects sponsor and service hours', !!confProgram?.collectSponsor && !!confProgram.collectServiceHours && confProgram.serviceHoursRequired === 20)

    const household = {
      guardian1FirstName: 'Rosa', guardian1LastName: 'Garcia', email: 'Rosa.Garcia@Example.com', phone: '555-0101',
      street: '1 Main St', city: 'Austin', state: 'TX', zip: '78701',
    }
    const ana = { key: 'ana', firstName: 'Ana', lastName: 'Garcia', grade: '3', dateOfBirth: '2018-04-02', baptizedAtThisParish: true,
      programId: ff.id, answers: { photo_permission: 'Yes' } }
    const luis = { key: 'luis', firstName: 'Luis', lastName: 'Garcia', grade: '9', dateOfBirth: '2012-01-15',
      programId: confirmation.id, answers: { photo_permission: 'No' }, sponsor: { name: 'Tio Juan', email: 'juan@example.com', parish: 'St. Anne' } }

    section('Two children, two programs, one household')
    check('sponsor required for Confirmation', await expectError({ household, children: [{ ...luis, sponsor: null }], paymentMethod: 'office' }, /sponsor/i))
    check('required program question enforced', await expectError({ household, children: [{ ...ana, answers: {} }], paymentMethod: 'office' }, /photos/i))
    check('grade must fit the program', await expectError({ household, children: [{ ...ana, programId: fc.id }], paymentMethod: 'office' }, /grades 2/))

    const first = await register({ household, children: [ana, luis], paymentMethod: 'office' })
    const hh = await prisma.luxHousehold.findMany({ where: { organizationId: org.id } })
    const kids = await prisma.luxChild.findMany({ where: { organizationId: org.id } })
    check('one household, two children', hh.length === 1 && kids.length === 2)
    check('email stored lowercase for lookups', hh[0].emailNormalized === 'rosa.garcia@example.com')
    // Luis (150) pays full; Ana: 100 tuition - 25 + 30 books = 105
    check('sibling discount on the cheaper child, books not discounted: 150 + 105 = 255', first.total === 255, first.quote)
    check('office payment: registered, order waiting at the office', first.status === 'office_pending')
    const regs = await prisma.luxProgramRegistration.findMany({ where: { orderId: first.orderId } })
    check('both registrations are confirmed', regs.length === 2 && regs.every(r => r.status === 'registered'))
    check('Luis’s sponsor saved', (regs.find(r => r.programId === confirmation.id)?.sponsorInfo as any)?.name === 'Tio Juan')
    const anaBaptism = first.uploads.find(u => u.childKey === 'ana' && u.requirementKey === 'baptismal_certificate')
    check('“Baptized at this parish” turns Ana’s certificate into a parish lookup', anaBaptism?.status === 'parish_lookup')
    check('Luis needs his baptismal certificate and sponsor letter', first.uploads.filter(u => u.childKey === 'luis' && u.status === 'missing' && u.required).length === 2)
    check('new family gets a household session', first.sessionScope === 'household')

    section('Already registered')
    check('the same child can’t register twice for a program',
      await expectError({ household, children: [ana], paymentMethod: 'office' }, /already registered/))

    section('Someone else using the same email (not signed in)')
    const sofia = { key: 'sofia', firstName: 'Sofia', lastName: 'Garcia', grade: '1', programId: ff.id, answers: { photo_permission: 'Yes' } }
    const second = await register({
      household: { ...household, guardian1FirstName: 'Mallory', phone: '555-9999', street: '666 Fake St' },
      children: [sofia],
      paymentMethod: 'office',
    })
    const hhAfter = await prisma.luxHousehold.findUnique({ where: { id: hh[0].id } })
    check('the family’s details are NOT overwritten', hhAfter?.guardian1FirstName === 'Rosa' && hhAfter.phone === '555-0101' && hhAfter.street === '1 Main St')
    check('the new child joins the same household', second.householdId === hh[0].id)
    check('that browser only gets access to this one order', second.sessionScope === 'order')
    // Sofia is the 3rd child this year: $25 off → 105; family max 300 with 255 already owed → only 45
    check('earlier siblings and the family maximum carry over: only $45 more', second.total === 45, second.quote)

    section('Signed in with a family link')
    const session = await createFamilySession({ organizationId: org.id, householdId: hh[0].id })
    const sessionRow = await prisma.luxFamilySession.findFirst({ where: { householdId: hh[0].id, orderId: null }, orderBy: { createdAt: 'desc' } })
    const fullSession = { id: sessionRow!.id, organizationId: org.id, householdId: hh[0].id, orderId: null }
    const leo = { key: 'leo', firstName: 'Leo', lastName: 'Garcia', grade: '2', programId: fc.id, answers: { prior_formation: 'Yes', photo_permission: 'Yes' } }
    const third = await register({ household: { ...household, phone: '555-2222' }, children: [leo], paymentMethod: 'office' }, fullSession)
    const hhSigned = await prisma.luxHousehold.findUnique({ where: { id: hh[0].id } })
    check('a signed-in family can update their details', hhSigned?.phone === '555-2222')
    check('signed-in family keeps a household session', third.sessionScope === 'household')
    void session

    section('Capacity')
    const other = { key: 'x', firstName: 'Max', lastName: 'Kim', grade: '2', programId: fc.id, answers: { prior_formation: 'No', photo_permission: 'Yes' } }
    check('a full program refuses more children',
      await expectError({ household: { ...household, email: 'kim@example.com', guardian1LastName: 'Kim' }, children: [other], paymentMethod: 'office' }, /full/))

    section('Document uploads')
    const uploadAs = async (token: string | null, submissionId: string) => {
      const form = new FormData()
      form.set('submissionId', submissionId)
      form.set('file', new File([new Uint8Array([37, 80, 68, 70])], 'certificate.pdf', { type: 'application/pdf' }))
      const req = new NextRequest('http://localhost/api/lux/public/family/documents', {
        method: 'POST',
        body: form,
        headers: token ? { cookie: `lux_family=${token}` } : {},
      })
      const res = await upload(req)
      return { status: res.status, data: await res.json() }
    }
    const luisBaptism = first.uploads.find(u => u.childKey === 'luis' && u.requirementKey === 'baptismal_certificate')!
    const sofiaUpload = second.uploads.find(u => u.childKey === 'sofia' && u.requirementKey === 'baptismal_certificate')!

    const familyToken = (await createFamilySession({ organizationId: org.id, householdId: hh[0].id })).token
    const orderToken = (await createFamilySession({ organizationId: org.id, householdId: hh[0].id, orderId: second.orderId })).token
    const outsider = await prisma.luxHousehold.create({
      data: { organizationId: org.id, guardian1FirstName: 'Eve', guardian1LastName: 'Out', email: 'eve@example.com', emailNormalized: 'eve@example.com', phone: '1' },
    })
    const outsiderToken = (await createFamilySession({ organizationId: org.id, householdId: outsider.id })).token

    let up = await uploadAs(null, luisBaptism.submissionId)
    check('no session: refused', up.status === 401)
    up = await uploadAs(outsiderToken, luisBaptism.submissionId)
    check('another family’s session: refused (looks like not found)', up.status === 404)
    up = await uploadAs(orderToken, luisBaptism.submissionId)
    check('a one-order session can’t touch the family’s other registrations', up.status === 404)
    up = await uploadAs(orderToken, sofiaUpload.submissionId)
    check('a one-order session can upload for its own order', up.status === 200 && up.data.status === 'received', up.data)
    s3Calls.length = 0
    up = await uploadAs(familyToken, luisBaptism.submissionId)
    check('the family uploads Luis’s certificate', up.status === 200)
    check('stored in the private bucket only', s3Calls.length === 1 && s3Calls[0].bucket === 'private-bucket', s3Calls)
    const stored = await prisma.luxDocumentSubmission.findUnique({ where: { id: luisBaptism.submissionId } })
    check('the database holds a private reference, never a URL', !!stored?.storageRef?.startsWith('r2-private://') && !stored.storageRef.includes('http'))
    const audit = await prisma.luxAuditLog.findFirst({ where: { action: 'document.uploaded', targetId: luisBaptism.submissionId } })
    check('the upload is logged', !!audit)

    section('Reusing an approved document next year')
    await prisma.luxDocumentSubmission.update({ where: { id: luisBaptism.submissionId }, data: { status: 'approved', reviewedAt: new Date() } })
    const nextYear = await makeProgram('confirmation', { name: 'Confirmation Year 2', term: '2027–2028', tuitionPerChild: 0 })
    const again = await register({
      household, children: [{ ...luis, programId: nextYear.id }], paymentMethod: 'office',
    }, fullSession)
    const reused = again.uploads.find(u => u.requirementKey === 'baptismal_certificate')
    check('Luis’s approved baptismal certificate carries over', reused?.status === 'approved')
    check('a free program is confirmed with nothing owed', again.status === 'paid' && again.total === 0)

    section('Card checkouts')
    const cardOrder = await prisma.luxOrder.create({
      data: {
        organizationId: org.id, householdId: hh[0].id, confirmationCode: `LUX-T${Date.now()}`.slice(0, 20), payToken: `tok${Date.now()}`,
        total: 50, amountDue: 50, paymentMethod: 'card', status: 'pending_payment',
      },
    })
    await prisma.payment.createMany({
      data: [
        { organizationId: org.id, registrationId: cardOrder.id, registrationType: 'lux_order', amount: 50, paymentType: 'balance', paymentMethod: 'card', paymentStatus: 'pending', stripePaymentIntentId: `cs_old_${Date.now()}` },
        { organizationId: org.id, registrationId: cardOrder.id, registrationType: 'lux_order', amount: 50, paymentType: 'balance', paymentMethod: 'card', paymentStatus: 'pending', stripePaymentIntentId: `cs_new_${Date.now()}` },
      ],
    })
    const oldSession = (await prisma.payment.findFirst({ where: { registrationId: cardOrder.id, stripePaymentIntentId: { startsWith: 'cs_old' } } }))!
    await handleLuxOrderCheckoutExpired({ id: oldSession.stripePaymentIntentId!, metadata: { registrationId: cardOrder.id } })
    check('an old checkout expiring doesn’t cancel an order with a newer checkout open',
      (await prisma.luxOrder.findUnique({ where: { id: cardOrder.id } }))?.status === 'pending_payment')
    await prisma.payment.updateMany({ where: { registrationId: cardOrder.id, paymentStatus: 'pending' }, data: { paymentStatus: 'succeeded' } })
    const paidOrder = await recalculateOrder(cardOrder.id)
    check('a succeeded payment marks the order paid', paidOrder?.status === 'paid' && Number(paidOrder.amountPaid) === 50)
    const abandoned = await prisma.luxOrder.create({
      data: { organizationId: org.id, householdId: hh[0].id, confirmationCode: `LUX-A${Date.now()}`.slice(0, 20), payToken: `ab${Date.now()}`, total: 10, amountDue: 10, paymentMethod: 'card', status: 'pending_payment' },
    })
    check('unpaid card orders can be cancelled once', (await cancelUnpaidOrders([abandoned.id])) === 1 && (await cancelUnpaidOrders([abandoned.id])) === 0)

    section('Family links')
    const token = await createMagicLink({ organizationId: org.id, householdId: hh[0].id, minutes: 30 })
    const linkRow = await prisma.luxMagicLink.findFirst({ where: { householdId: hh[0].id }, orderBy: { createdAt: 'desc' } })
    check('only a hash of the link is stored', !!linkRow && linkRow.tokenHash !== token && linkRow.tokenHash.length === 64)
    const used = await consumeMagicLink(token)
    check('the link works once', used.ok && used.householdId === hh[0].id)
    check('and not twice', !(await consumeMagicLink(token)).ok)
    const expiredToken = await createMagicLink({ organizationId: org.id, householdId: hh[0].id, minutes: -1 })
    const expired = await consumeMagicLink(expiredToken)
    check('expired links are refused', !expired.ok && expired.reason === 'expired')
    check('made-up links are refused', !(await consumeMagicLink('not-a-real-token')).ok)
  } finally {
    await deleteOrg(prisma, org.id)
    await prisma.$disconnect()
  }
  finish()
}

main().catch(err => { console.error(err); process.exit(1) })
