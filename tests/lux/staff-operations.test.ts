/**
 * Lux staff operations on a real database: fee assistance decisions,
 * adjusting what an order owes, office payments (including a family who
 * started paying online and came to the office instead), deleting a
 * family's documents, and the daily retention job.
 *
 * Needs a test database: DATABASE_URL=postgresql://... npx tsx tests/lux/staff-operations.test.ts
 */

import { check, section, finish, createOrg, deleteOrg } from './helpers'
import { S3Client } from '@aws-sdk/client-s3'

process.env.R2_ACCOUNT_ID = 'acct'
process.env.R2_ACCESS_KEY_ID = 'key'
process.env.R2_SECRET_ACCESS_KEY = 'secret'
process.env.R2_BUCKET_NAME = 'public-bucket'
process.env.R2_PUBLIC_URL = 'https://files.example.com'
process.env.R2_PRIVATE_BUCKET_NAME = 'private-bucket'
const s3Deletes: string[] = []
S3Client.prototype.send = (async function (command: any) {
  if (command.constructor.name === 'DeleteObjectCommand') s3Deletes.push(command.input?.Key)
  return {}
}) as any

async function main() {
  const { prisma } = await import('../../src/lib/prisma')
  const { createProgram, validateProgramInput } = await import('../../src/lib/lux/program-server')
  const { getProgramTemplate } = await import('../../src/lib/lux/program-templates')
  const { parseFamilyInput, registerFamily, RegistrationError } = await import('../../src/lib/lux/family-registration')
  const { parseFeeRules } = await import('../../src/lib/lux/family-fees')
  const { decideOrderFees, recordOrderOfficePayment, OrderActionError } = await import('../../src/lib/lux/order-staff-actions')
  const { handleLuxOrderCheckoutExpired } = await import('../../src/lib/lux/order-payments')
  const { deleteSubmissionFiles } = await import('../../src/lib/lux/documents')
  const { runLuxRetention } = await import('../../src/lib/lux/retention')

  const rules = parseFeeRules({})
  const { org, user } = await createOrg(prisma, { publicSlug: `staff-ops-${Date.now()}` })
  const other = await createOrg(prisma)

  const program = await (async () => {
    const t = getProgramTemplate('faith_formation')
    const parsed = validateProgramInput({ templateKey: 'faith_formation', ...t.defaults, term: '2026–2027', tuitionPerChild: 120 })
    if (!parsed.ok) throw new Error(parsed.error)
    const p = await createProgram(org.id, user.id, parsed.value)
    await prisma.luxProgram.update({ where: { id: p.id }, data: { status: 'open', documentRetentionDays: 365 } })
    return p
  })()

  let n = 0
  const register = async (extra: Record<string, unknown>, paymentsReady = false) => {
    n++
    const parsed = parseFamilyInput({
      household: { guardian1FirstName: 'Ann', guardian1LastName: `Family${n}`, email: `family${n}-${Date.now()}@example.com`, phone: '555-0100' },
      children: [{ key: 'c', firstName: 'Kid', lastName: `Family${n}`, grade: '3', programId: program.id, answers: { photo_permission: 'Yes' } }],
      paymentMethod: 'office',
      ...extra,
    })
    if (!parsed.ok) throw new RegistrationError(parsed.error)
    return registerFamily({ organizationId: org.id, input: parsed.value, session: null, rules, paymentsReady })
  }
  const fails = async (fn: () => Promise<unknown>, pattern: RegExp) => {
    try { await fn(); return false } catch (e) { return e instanceof OrderActionError && pattern.test(e.message) }
  }
  const order = (id: string) => prisma.luxOrder.findUniqueOrThrow({ where: { id } })

  try {
    section('Fee assistance: reduce the fee')
    const a = await register({ feeAssistance: { requested: true, note: 'Lost my job this spring' } })
    check('request is recorded and nothing is due yet', a.status === 'assistance_requested')
    check('another parish can’t touch it',
      await fails(() => decideOrderFees({ organizationId: other.org.id, orderId: a.orderId, userId: other.user.id, decision: 'waived' }), /not found/))
    check('amount above the total is refused',
      await fails(() => decideOrderFees({ organizationId: org.id, orderId: a.orderId, userId: user.id, decision: 'approved', amountDue: 500 }), /more than/))
    check('a blank amount is refused',
      await fails(() => decideOrderFees({ organizationId: org.id, orderId: a.orderId, userId: user.id, decision: 'approved', amountDue: '' }), /new amount/))
    const reduced = await decideOrderFees({ organizationId: org.id, orderId: a.orderId, userId: user.id, decision: 'approved', amountDue: 40, note: 'Glad to help' })
    const aAfter = await order(a.orderId)
    check('approved: $40 due, paid at the office', reduced.owed === 40 && Number(aAfter.amountDue) === 40 && aAfter.status === 'office_pending')
    check('decision, note and who decided are saved',
      aAfter.feeAssistanceStatus === 'approved' && aAfter.feeAssistanceStaffNote === 'Glad to help' && aAfter.feeAssistanceResolvedById === user.id)

    section('Office payments')
    check('more than what’s owed is refused',
      await fails(() => recordOrderOfficePayment({ organizationId: org.id, orderId: a.orderId, userId: user.id, amount: 60, method: 'cash' }), /more than/))
    check('a payment method is required',
      await fails(() => recordOrderOfficePayment({ organizationId: org.id, orderId: a.orderId, userId: user.id, amount: 10, method: 'bitcoin' }), /how it was paid/))
    const part = await recordOrderOfficePayment({ organizationId: org.id, orderId: a.orderId, userId: user.id, amount: 15, method: 'check', checkNumber: '1042' })
    check('partial payment leaves $25 owed', part.remaining === 25 && (await order(a.orderId)).status === 'office_pending')
    const rest = await recordOrderOfficePayment({ organizationId: org.id, orderId: a.orderId, userId: user.id, amount: 25, method: 'cash' })
    check('paying the rest marks it paid', rest.remaining === 0 && (await order(a.orderId)).status === 'paid')
    const checkPayment = await prisma.payment.findFirst({ where: { registrationId: a.orderId, checkNumber: '1042' } })
    check('check number and who recorded it are kept', checkPayment?.processedByUserId === user.id && checkPayment?.processedVia === 'manual')
    check('nothing more can be recorded once paid',
      await fails(() => recordOrderOfficePayment({ organizationId: org.id, orderId: a.orderId, userId: user.id, amount: 1, method: 'cash' }), /Nothing is owed/))

    section('Fee assistance: waive and decline')
    const w = await register({ feeAssistance: { requested: true, note: '' } })
    await decideOrderFees({ organizationId: org.id, orderId: w.orderId, userId: user.id, decision: 'waived' })
    const wAfter = await order(w.orderId)
    check('waived: nothing owed', wAfter.status === 'waived' && Number(wAfter.amountDue) === 0 && wAfter.feeAssistanceStatus === 'approved')
    const d = await register({ feeAssistance: { requested: true, note: '' } })
    await decideOrderFees({ organizationId: org.id, orderId: d.orderId, userId: user.id, decision: 'denied' })
    const dAfter = await order(d.orderId)
    check('declined: the full $120 stays due at the office', dAfter.status === 'office_pending' && Number(dAfter.amountDue) === 120 && dAfter.feeAssistanceStatus === 'denied')

    section('Adjusting an ordinary order')
    const o = await register({})
    check('“decline” only applies to fee assistance requests',
      await fails(() => decideOrderFees({ organizationId: org.id, orderId: o.orderId, userId: user.id, decision: 'denied' }), /didn’t ask/))
    await decideOrderFees({ organizationId: org.id, orderId: o.orderId, userId: user.id, decision: 'approved', amountDue: 100 })
    const oAfter = await order(o.orderId)
    check('the parish can lower what a family owes', Number(oAfter.amountDue) === 100 && oAfter.status === 'office_pending' && oAfter.feeAssistanceStatus === 'none')

    section('Started paying online, paid at the office instead')
    const c = await register({ paymentMethod: 'card' }, true)
    check('card registration waits on payment', c.status === 'pending_payment')
    await prisma.payment.create({
      data: {
        organizationId: org.id, eventId: null, registrationId: c.orderId, registrationType: 'lux_order', amount: 120,
        paymentType: 'balance', paymentMethod: 'card', paymentStatus: 'pending', stripePaymentIntentId: `pi_test_open_${Date.now()}`,
      },
    })
    await recordOrderOfficePayment({ organizationId: org.id, orderId: c.orderId, userId: user.id, amount: 50, method: 'cash' })
    const cAfter = await order(c.orderId)
    const cRegs = await prisma.luxProgramRegistration.findMany({ where: { orderId: c.orderId } })
    check('their spot is kept and the rest is owed at the office', cAfter.status === 'office_pending' && Number(cAfter.amountPaid) === 50)
    check('the child is registered', cRegs.every(r => r.status === 'registered' && !r.cancelledAt))
    check('the open card checkout is closed', (await prisma.payment.count({ where: { registrationId: c.orderId, paymentStatus: 'pending' } })) === 0)
    await handleLuxOrderCheckoutExpired({ id: 'cs_test_late', metadata: { registrationId: c.orderId } })
    check('a late “checkout expired” notice doesn’t cancel them', (await order(c.orderId)).status === 'office_pending')

    section('Deleting documents')
    const subs = await prisma.luxDocumentSubmission.findMany({ where: { programRegistration: { orderId: a.orderId } } })
    check('the family has documents to collect', subs.length > 0)
    const sub = subs[0]
    const old = new Date(Date.now() - 400 * 86400000)
    await prisma.luxDocumentSubmission.update({
      where: { id: sub.id },
      data: { storageRef: 'r2-private://lux/test/approved.pdf', fileName: 'approved.pdf', status: 'approved', uploadedAt: old, sizeBytes: 100 },
    })
    const single = await deleteSubmissionFiles([sub.id], org.id)
    const singleAfter = await prisma.luxDocumentSubmission.findUniqueOrThrow({ where: { id: sub.id } })
    check('deleting one bad file asks the family again', single === 1 && singleAfter.status === 'missing' && !singleAfter.storageRef)
    await prisma.luxDocumentSubmission.update({
      where: { id: sub.id },
      data: { storageRef: 'r2-private://lux/test/approved.pdf', fileName: 'approved.pdf', status: 'approved', uploadedAt: old, sizeBytes: 100 },
    })
    await deleteSubmissionFiles([sub.id], org.id, { keepApproved: true })
    const keptAfter = await prisma.luxDocumentSubmission.findUniqueOrThrow({ where: { id: sub.id } })
    check('a privacy delete keeps approved documents approved', keptAfter.status === 'approved' && !keptAfter.storageRef)
    check('the file itself is removed from storage', s3Deletes.includes('lux/test/approved.pdf'))

    section('Retention job')
    const wSubs = await prisma.luxDocumentSubmission.findMany({ where: { programRegistration: { orderId: w.orderId } }, take: 1 })
    const dSubs = await prisma.luxDocumentSubmission.findMany({ where: { programRegistration: { orderId: d.orderId } }, take: 1 })
    const oSubs = await prisma.luxDocumentSubmission.findMany({ where: { programRegistration: { orderId: o.orderId } }, take: 1 })
    await prisma.luxDocumentSubmission.update({ where: { id: wSubs[0].id }, data: { storageRef: 'r2-private://lux/test/old-approved.pdf', status: 'approved', uploadedAt: old } })
    await prisma.luxDocumentSubmission.update({ where: { id: dSubs[0].id }, data: { storageRef: 'r2-private://lux/test/old-received.pdf', status: 'received', uploadedAt: old } })
    await prisma.luxDocumentSubmission.update({ where: { id: oSubs[0].id }, data: { storageRef: 'r2-private://lux/test/recent.pdf', status: 'received', uploadedAt: new Date() } })
    const expired = await prisma.luxMagicLink.create({
      data: { organizationId: org.id, householdId: w.householdId, tokenHash: `test-${Date.now()}`, expiresAt: new Date(Date.now() - 3 * 86400000) },
    })
    const summary = await runLuxRetention()
    const [wr, dr, or] = await Promise.all([wSubs[0].id, dSubs[0].id, oSubs[0].id].map(id => prisma.luxDocumentSubmission.findUniqueOrThrow({ where: { id } })))
    check('files older than the program’s 365 days are deleted', !wr.storageRef && !dr.storageRef && summary.filesDeleted >= 2, summary)
    check('an approved one stays approved, with a note why', wr.status === 'approved' && /retention/.test(wr.reviewerNote ?? ''))
    check('an unreviewed one is needed again', dr.status === 'missing')
    check('a recent upload is kept', or.storageRef === 'r2-private://lux/test/recent.pdf' && or.status === 'received')
    check('expired family links are cleared', !(await prisma.luxMagicLink.findUnique({ where: { id: expired.id } })))
    const audit = await prisma.luxAuditLog.findFirst({ where: { organizationId: org.id, action: 'documents.retention_deleted' } })
    check('the deletion is logged', !!audit)
  } finally {
    await deleteOrg(prisma, org.id)
    await deleteOrg(prisma, other.org.id)
    await prisma.$disconnect()
  }
  finish()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
