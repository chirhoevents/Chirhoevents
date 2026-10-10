/**
 * Program types on a real database: OCIA (adults register themselves),
 * Family Faith Formation (one fee per family, however many attend, and
 * not charged again when another child joins later), Baptism Preparation
 * (no grade), and class times with grade limits and capacity.
 *
 * Needs a test database: DATABASE_URL=postgresql://... npx tsx tests/lux/program-types.test.ts
 */

import { check, section, finish, createOrg, deleteOrg } from './helpers'

async function main() {
  const { prisma } = await import('../../src/lib/prisma')
  const { createProgram, validateProgramInput, updateProgram } = await import('../../src/lib/lux/program-server')
  const { getProgramTemplate } = await import('../../src/lib/lux/program-templates')
  const { parseFamilyInput, registerFamily, RegistrationError } = await import('../../src/lib/lux/family-registration')
  const { parseFeeRules } = await import('../../src/lib/lux/family-fees')
  const { cancelProgramRegistration } = await import('../../src/lib/lux/order-staff-actions')

  const rules = parseFeeRules({ siblingDiscount: { type: 'amount', value: 20 } })
  const { org, user } = await createOrg(prisma, { publicSlug: `program-types-${Date.now()}` })

  const make = async (templateKey: string, overrides: Record<string, unknown> = {}) => {
    const t = getProgramTemplate(templateKey)
    const parsed = validateProgramInput({ templateKey, ...t.defaults, term: '2026–2027', ...overrides })
    if (!parsed.ok) throw new Error(parsed.error)
    const p = await createProgram(org.id, user.id, parsed.value)
    await prisma.luxProgram.update({ where: { id: p.id }, data: { status: 'open' } })
    return { program: p, input: parsed.value }
  }
  let n = 0
  const household = () => ({ guardian1FirstName: 'Maria', guardian1LastName: `Lopez${++n}`, email: `family${n}-${Date.now()}@example.com`, phone: '555-0100' })
  const register = async (raw: Record<string, unknown>) => {
    const parsed = parseFamilyInput({ paymentMethod: 'office', ...raw })
    if (!parsed.ok) throw new RegistrationError(parsed.error)
    return registerFamily({ organizationId: org.id, input: parsed.value, session: null, rules, paymentsReady: false })
  }
  const fails = async (raw: Record<string, unknown>, pattern: RegExp) => {
    try { await register(raw); return false } catch (e) { return e instanceof RegistrationError && pattern.test(e.message) }
  }

  try {
    section('Templates')
    const ocia = await make('ocia', { tuitionPerChild: 50 })
    check('OCIA is for adults with no grades', ocia.input.audience === 'adults' && ocia.input.grades === null)
    const family = await make('family_faith_formation', { tuitionPerChild: 150 })
    check('Family Faith Formation charges once per family', family.input.feeType === 'per_family' && family.input.audience === 'families')
    const baptism = await make('baptism_prep', {
      tuitionPerChild: 25,
      sessions: [{ name: 'Saturday, Jan 10 · 10am', schedule: 'Parish hall', capacity: 1 }, { name: 'Saturday, Feb 7 · 10am', schedule: '' }],
    })
    check('Baptism Preparation asks for the birth certificate and godparents’ letters',
      baptism.input.requirements.map(r => r.key).join(',') === 'birth_certificate,godfather_letter,godmother_letter')
    check('class times are saved with ids', baptism.input.sessions.length === 2 && baptism.input.sessions.every(sess => !!sess.id))
    const ff = await make('faith_formation', {
      tuitionPerChild: 100,
      sessions: [
        { name: 'Sunday 9am', schedule: '', grades: ['1', '2', '3'], capacity: 10 },
        { name: 'Wednesday 6:30pm', schedule: '', grades: ['4', '5'] },
      ],
    })
    const [sunday, wednesday] = ff.input.sessions

    section('OCIA: an adult registers themselves')
    const h1 = household()
    const adult = await register({
      household: h1,
      children: [{ key: 'me', firstName: 'Maria', lastName: h1.guardian1LastName, grade: '5', programId: ocia.program.id, answers: { baptism_background: 'No' } }],
    })
    const adultRow = await prisma.luxChild.findFirst({ where: { householdId: adult.householdId } })
    check('saved as an adult, without a grade', adultRow?.isAdult === true && adultRow.grade === null)
    check('the adult’s fee is charged', adult.total === 50, adult.quote)
    check('a required OCIA question is enforced',
      await fails({ household: household(), children: [{ key: 'a', firstName: 'Jon', programId: ocia.program.id, answers: {} }] }, /baptized/))

    section('Family Faith Formation: one fee per family')
    const h2 = household()
    const fam = await register({
      household: h2,
      children: [
        { key: 'a', firstName: 'Ana', grade: '2', programId: family.program.id, answers: { photo_permission: 'Yes' } },
        { key: 'b', firstName: 'Ben', grade: '5', programId: family.program.id, answers: { photo_permission: 'Yes' } },
        { key: 'c', firstName: 'Cruz', grade: 'K', programId: family.program.id, answers: { photo_permission: 'Yes' } },
      ],
    })
    check('three children, one $150 family fee', fam.total === 150, fam.quote)
    check('the fee sits with the first child; the others are covered',
      fam.quote.lines[0].total === 150 && fam.quote.lines.slice(1).every(l => l.total === 0 && l.coveredByFamilyFee))
    const famRegs = await prisma.luxProgramRegistration.findMany({ where: { orderId: fam.orderId }, orderBy: { createdAt: 'asc' } })
    check('each child is on the roster', famRegs.length === 3)

    const later = await register({
      household: h2,
      children: [{ key: 'd', firstName: 'Dani', grade: '7', programId: family.program.id, answers: { photo_permission: 'Yes' } }],
    })
    check('a child added later isn’t charged the family fee again', later.total === 0 && later.quote.lines[0].familyFeeAlreadyPaid === true, later.quote)

    section('Baptism Preparation: class dates, no grade')
    const bap = await register({
      household: household(),
      children: [{ key: 'baby', firstName: 'Lucia', dateOfBirth: '2026-06-01', programId: baptism.program.id, sessionId: baptism.input.sessions[0].id, answers: {} }],
    })
    check('a baby registers without a grade', bap.total === 25)
    check('the class date is saved', (await prisma.luxProgramRegistration.findFirst({ where: { orderId: bap.orderId } }))?.sessionId === baptism.input.sessions[0].id)
    check('a full class date is refused',
      await fails({ household: household(), children: [{ key: 'x', firstName: 'Mateo', programId: baptism.program.id, sessionId: baptism.input.sessions[0].id, answers: {} }] }, /full/))
    check('a class date must be chosen',
      await fails({ household: household(), children: [{ key: 'x', firstName: 'Mateo', programId: baptism.program.id, answers: {} }] }, /class time/))

    section('Class times with grades')
    check('a 4th grader can’t take the grades 1–3 class',
      await fails({ household: household(), children: [{ key: 'x', firstName: 'Eva', grade: '4', programId: ff.program.id, sessionId: sunday.id, answers: { photo_permission: 'Yes' } }] }, /grades 1, 2, 3/))
    const ok = await register({
      household: household(),
      children: [
        { key: 'x', firstName: 'Eva', grade: '4', programId: ff.program.id, sessionId: wednesday.id, answers: { photo_permission: 'Yes' } },
        { key: 'y', firstName: 'Gabe', grade: '2', programId: ff.program.id, sessionId: sunday.id, answers: { photo_permission: 'Yes' } },
      ],
    })
    check('siblings in different class times still get the sibling discount', ok.total === 180, ok.quote)

    section('Editing class times')
    const removeUsed = await updateProgram(org.id, ff.program.id, { ...ff.input, sessions: [wednesday] })
    check('a class time with people in it can’t be removed', !removeUsed.ok && /can't be removed/.test((removeUsed as { error: string }).error))
    const shrink = await updateProgram(org.id, ff.program.id, { ...ff.input, sessions: [{ ...sunday, capacity: 1 }, wednesday] })
    check('a class time can’t shrink below who’s in it… unless it still fits', shrink.ok)
    const noRoom = validateProgramInput({ ...ff.input, sessions: [{ name: 'Sunday 9am', capacity: 0 }] })
    check('a class time capacity must be at least 1', !noRoom.ok)

    section('Cancelling the family member who carried the fee')
    const [first, second, third] = famRegs
    await cancelProgramRegistration({ organizationId: org.id, registrationId: first.id, reason: 'Moved away' })
    const [a, b] = await Promise.all([first.id, second.id].map(id => prisma.luxProgramRegistration.findUniqueOrThrow({ where: { id } })))
    const famOrder = await prisma.luxOrder.findUniqueOrThrow({ where: { id: fam.orderId } })
    check('the $150 family fee moves to the next family member', Number(a.feeAmount) === 0 && Number(b.feeAmount) === 150 && !!a.cancelledAt)
    check('the family still owes the family fee', Number(famOrder.amountDue) === 150)
    await cancelProgramRegistration({ organizationId: org.id, registrationId: second.id })
    await cancelProgramRegistration({ organizationId: org.id, registrationId: third.id })
    const emptied = await prisma.luxOrder.findUniqueOrThrow({ where: { id: fam.orderId } })
    check('when everyone is cancelled, the unpaid registration is cancelled too', emptied.status === 'cancelled' && Number(emptied.amountDue) === 0)
  } finally {
    await deleteOrg(prisma, org.id)
    await prisma.$disconnect()
  }
  finish()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
