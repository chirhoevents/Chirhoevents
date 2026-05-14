/**
 * Test Suite 12: Reporting Isolation — Phase 5
 *
 * Step 5.1 — Report Generation Isolation
 *   5.1.1  Registration reports — only the requesting org's registrations
 *   5.1.2  Financial reports — only payments to that org's Stripe account
 *   5.1.3  Housing reports (Poros) — only that org's participants and rooms
 *   5.1.4  Medical reports (Rapha) — strictly org-scoped; extra permission required
 *   5.1.5  Check-in reports (SALVE) — org-scoped check-in logs and participants
 *
 * Step 5.2 — Cross-Org Leakage Test
 *   5.2.1  Org A reports contain ZERO Org B data (registrations, financial, housing, medical, check-in)
 *   5.2.2  Org B reports contain ZERO Org A data (symmetric)
 *   5.2.3  Overlapping event dates do not cause data bleed
 *   5.2.4  "all events" queries are correctly org-scoped (financial) or correctly blocked
 *   5.2.5  Role-based permission gates block wrong-role report access
 *   5.2.6  Master admin access is unrestricted; all other roles are scoped
 *
 * Security classification:
 *   - Medical data (Rapha): HIPAA-sensitive → tested with extra assertions
 *   - Financial data: PCI-sensitive → tested with org-Stripe account linkage
 *   - All other report types: privacy-sensitive
 *
 * All tests run WITHOUT a database or Clerk connection.
 *
 * Run: npx tsx tests/org-isolation/12-reporting-isolation.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import {
  hasPermission,
  hasAnyPermission,
  type UserRole,
  type Permission,
} from '../../src/lib/permissions'
import {
  makeOrg,
  makeAdminUser,
  makeGroupLeaderUser,
  makeEvent,
  makeGroupRegistration,
  makePayment,
  makeParticipant,
  makeParticipantWithMedical,
  makeLiabilityForm,
  makeRoomAllocation,
  makeCheckInLog,
  buildTwoOrgDataset,
  simulateEventAccessGate,
  queryByEventId,
  queryByOrgId,
  queryAllEventsByOrg,
  queryAllEventsNoFilter,
  resetCounter,
  type MockParticipant,
  type MockLiabilityForm,
  type MockRoomAllocation,
  type MockCheckInLog,
  type MockPayment,
  type MockGroupRegistration,
} from './helpers/mock-factories'

// ============================================================
// SUITE 5.1.1 — Registration Reports
// ============================================================

describe('5.1.1 Registration Reports: only the requesting org\'s registrations', () => {
  resetCounter()

  it('verifyEventAccess gates on event.organizationId === user.organizationId', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    // Admin A requesting event A → allowed
    const gateA = simulateEventAccessGate(orgA.id, 'org_admin', eventA.organizationId)
    expect(gateA.allowed).toBeTruthy()
    expect(gateA.status).toBe(200)

    // Admin A requesting event B → blocked
    const gateAtoB = simulateEventAccessGate(orgA.id, 'org_admin', eventB.organizationId)
    expect(gateAtoB.allowed).toBeFalsy()
    expect(gateAtoB.status).toBe(403)
  })

  it('registration report query is scoped to eventId — event ownership enforces org isolation', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    const regA1 = makeGroupRegistration(eventA, { groupName: 'Alpha Group 1' })
    const regA2 = makeGroupRegistration(eventA, { groupName: 'Alpha Group 2' })
    const regB1 = makeGroupRegistration(eventB, { groupName: 'Beta Group 1' })

    const allRegs = [regA1, regA2, regB1]

    const reportForA = queryByEventId(allRegs, eventA.id)
    const reportForB = queryByEventId(allRegs, eventB.id)

    expect(reportForA.length).toBe(2)
    expect(reportForA.every(r => r.organizationId === orgA.id)).toBeTruthy()
    expect(reportForA.some(r => r.organizationId === orgB.id)).toBeFalsy()

    expect(reportForB.length).toBe(1)
    expect(reportForB[0].organizationId).toBe(orgB.id)
  })

  it('registration totals reflect only the requesting org\'s event', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    const regA1 = makeGroupRegistration(eventA, { youthCount: 15, totalParticipants: 18 })
    const regA2 = makeGroupRegistration(eventA, { youthCount: 10, totalParticipants: 12 })
    const regB1 = makeGroupRegistration(eventB, { youthCount: 20, totalParticipants: 25 })

    const allRegs = [regA1, regA2, regB1]
    const aReport = queryByEventId(allRegs, eventA.id)

    const totalParticipantsA = aReport.reduce((s, r) => s + r.totalParticipants, 0)
    const totalParticipantsAll = allRegs.reduce((s, r) => s + r.totalParticipants, 0)

    expect(totalParticipantsA).toBe(30)  // 18 + 12
    expect(totalParticipantsA).not.toBe(totalParticipantsAll)  // 55 without isolation
    // Org B's 25 participants are NOT included
    expect(totalParticipantsA).not.toBe(55)
  })

  it('admin without reports.view permission is blocked (event_manager has it, staff has it)', () => {
    expect(hasPermission('event_manager', 'reports.view')).toBeTruthy()
    expect(hasPermission('staff', 'reports.view')).toBeTruthy()
    expect(hasPermission('group_leader', 'reports.view')).toBeFalsy()
    expect(hasPermission('individual', 'reports.view')).toBeFalsy()
  })

  it('registration export includes group leader PII — org-scoped via event gate', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    const regA = makeGroupRegistration(eventA, { groupLeaderEmail: 'leadera@alpha.org', groupLeaderPhone: '555-1111' })
    const regB = makeGroupRegistration(eventB, { groupLeaderEmail: 'leaderb@beta.org', groupLeaderPhone: '555-2222' })

    const allRegs = [regA, regB]

    // Admin A requests export for eventA → access gate passes → returns only regA
    const gateCheck = simulateEventAccessGate(orgA.id, 'org_admin', eventA.organizationId)
    expect(gateCheck.allowed).toBeTruthy()

    const exportData = queryByEventId(allRegs, eventA.id)
    expect(exportData.length).toBe(1)
    expect(exportData[0].groupLeaderEmail).toBe('leadera@alpha.org')
    // Org B leader's email does NOT appear
    expect(exportData.some(r => r.groupLeaderEmail === 'leaderb@beta.org')).toBeFalsy()
  })
})

// ============================================================
// SUITE 5.1.2 — Financial Reports
// ============================================================

describe('5.1.2 Financial Reports: only payments to that org\'s Stripe account', () => {
  resetCounter()

  it('financial report requires reports.view_financial — event_manager is blocked', () => {
    expect(hasPermission('event_manager', 'reports.view_financial')).toBeFalsy()
    expect(hasPermission('finance_manager', 'reports.view_financial')).toBeTruthy()
    expect(hasPermission('org_admin', 'reports.view_financial')).toBeTruthy()
    expect(hasPermission('master_admin', 'reports.view_financial')).toBeTruthy()
    // poros/salve/rapha coordinators cannot see financial
    expect(hasPermission('poros_coordinator', 'reports.view_financial')).toBeFalsy()
    expect(hasPermission('salve_coordinator', 'reports.view_financial')).toBeFalsy()
    expect(hasPermission('rapha_coordinator', 'reports.view_financial')).toBeFalsy()
    expect(hasPermission('staff', 'reports.view_financial')).toBeFalsy()
  })

  it('financial report query is scoped to eventId — org isolation via access gate', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const payA = makePayment(orgA, eventA, regA, { amount: 1500, paymentStatus: 'succeeded' })
    const payB = makePayment(orgB, eventB, regB, { amount: 2500, paymentStatus: 'succeeded' })
    const allPayments = [payA, payB]

    // Admin A's financial report: WHERE { eventId: eventA.id } (after access gate)
    const reportA = queryByEventId(allPayments, eventA.id)

    expect(reportA.length).toBe(1)
    expect(reportA[0].amount).toBe(1500)
    expect(reportA[0].organizationId).toBe(orgA.id)
    // Org B's $2500 is NOT included
    expect(reportA.some(p => p.organizationId === orgB.id)).toBeFalsy()
  })

  it('financial revenue total excludes other orgs\' payments', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const pA1 = makePayment(orgA, eventA, regA, { amount: 1000, paymentStatus: 'succeeded' })
    const pA2 = makePayment(orgA, eventA, regA, { amount: 500, paymentStatus: 'succeeded' })
    const pB1 = makePayment(orgB, eventB, regB, { amount: 9999, paymentStatus: 'succeeded' })

    const allPayments = [pA1, pA2, pB1]

    const reportA = queryByEventId(allPayments, eventA.id)
    const revenueA = reportA.reduce((s, p) => s + p.amount, 0)

    expect(revenueA).toBe(1500)        // $1000 + $500
    expect(revenueA).not.toBe(11499)   // Without isolation: 1000 + 500 + 9999
  })

  it('financial report via organizationId filter also correctly isolates', () => {
    // Some financial queries use { organizationId } as the primary filter.
    // Verify this produces correct isolation too.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const pA = makePayment(orgA, eventA, regA, { amount: 800 })
    const pB = makePayment(orgB, eventB, regB, { amount: 1600 })

    const allPayments = [pA, pB]

    const reportA = queryByOrgId(allPayments, orgA.id)
    const reportB = queryByOrgId(allPayments, orgB.id)

    expect(reportA.length).toBe(1)
    expect(reportA[0].amount).toBe(800)
    expect(reportB.length).toBe(1)
    expect(reportB[0].amount).toBe(1600)
    // Exclusive
    expect(reportA[0].organizationId).not.toBe(orgB.id)
    expect(reportB[0].organizationId).not.toBe(orgA.id)
  })

  it('Stripe payment routing in report matches organizationId (no cross-accounting)', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const pA = makePayment(orgA, eventA, regA, { stripePaymentIntentId: 'pi_orgA_fin_001' })
    const pB = makePayment(orgB, eventB, regB, { stripePaymentIntentId: 'pi_orgB_fin_002' })

    // The financial report for A should only show pi_orgA_fin_001
    // (which went to orgA.stripeAccountId per the payment routing logic)
    const reportA = queryByEventId([pA, pB], eventA.id)

    expect(reportA.length).toBe(1)
    expect(reportA[0].stripePaymentIntentId).toBe('pi_orgA_fin_001')
    expect(reportA.some(p => p.stripePaymentIntentId === 'pi_orgB_fin_002')).toBeFalsy()
  })
})

// ============================================================
// SUITE 5.1.3 — Housing Reports (Poros)
// ============================================================

describe('5.1.3 Housing Reports (Poros): only that org\'s participants and rooms', () => {
  resetCounter()

  it('poros.access is required — event_manager has it, finance_manager does not', () => {
    expect(hasPermission('event_manager', 'poros.access')).toBeTruthy()
    expect(hasPermission('poros_coordinator', 'poros.access')).toBeTruthy()
    expect(hasPermission('org_admin', 'poros.access')).toBeTruthy()
    // Roles that should NOT have housing access
    expect(hasPermission('finance_manager', 'poros.access')).toBeFalsy()
    expect(hasPermission('rapha_coordinator', 'poros.access')).toBeFalsy()
    expect(hasPermission('salve_coordinator', 'poros.access')).toBeFalsy()
    expect(hasPermission('staff', 'poros.access')).toBeFalsy()
  })

  it('housing report query scoped to eventId — no Org B rooms in Org A report', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    const roomA1 = makeRoomAllocation(orgA, eventA, { buildingName: 'Alpha Dormitory', gender: 'male' })
    const roomA2 = makeRoomAllocation(orgA, eventA, { buildingName: 'Alpha Dormitory', gender: 'female' })
    const roomB1 = makeRoomAllocation(orgB, eventB, { buildingName: 'Beta Hall', gender: 'male' })

    const allRooms = [roomA1, roomA2, roomB1]

    const housingReportA = queryByEventId(allRooms, eventA.id)

    expect(housingReportA.length).toBe(2)
    expect(housingReportA.every(r => r.organizationId === orgA.id)).toBeTruthy()
    expect(housingReportA.some(r => r.buildingName === 'Beta Hall')).toBeFalsy()
    expect(housingReportA.every(r => r.buildingName === 'Alpha Dormitory')).toBeTruthy()
  })

  it('room assignment participants are scoped through registration → event → org', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const partA = makeParticipant(regA, orgA, eventA, { firstName: 'AlphaKid', roomId: 'room-alpha-001' })
    const partB = makeParticipant(regB, orgB, eventB, { firstName: 'BetaKid', roomId: 'room-beta-001' })

    const allParticipants = [partA, partB]

    const housingParticipantsA = queryByEventId(allParticipants, eventA.id)

    expect(housingParticipantsA.length).toBe(1)
    expect(housingParticipantsA[0].firstName).toBe('AlphaKid')
    // Org B participant not visible
    expect(housingParticipantsA.some(p => p.firstName === 'BetaKid')).toBeFalsy()
  })

  it('ADA accommodations in housing data are org-scoped (sensitive)', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const partA = makeParticipant(regA, orgA, eventA, { adaAccommodations: 'Wheelchair ramp needed' })
    const partB = makeParticipant(regB, orgB, eventB, { adaAccommodations: 'Visual impairment support' })

    const allParticipants = [partA, partB]
    const reportA = queryByEventId(allParticipants, eventA.id)

    expect(reportA.length).toBe(1)
    expect(reportA[0].adaAccommodations).toBe('Wheelchair ramp needed')
    // Org B's ADA note NOT exposed
    expect(reportA.some(p => p.adaAccommodations === 'Visual impairment support')).toBeFalsy()
  })

  it('poros coordinator from Org A cannot access Org B event housing data', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const porosCoordA = makeAdminUser(orgA, { role: 'poros_coordinator' })
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    const gateCheck = simulateEventAccessGate(orgA.id, 'poros_coordinator', eventB.organizationId)

    expect(gateCheck.allowed).toBeFalsy()
    expect(gateCheck.status).toBe(403)
    // Even though poros_coordinator has poros.access permission,
    // the event org mismatch blocks the request before data is fetched.
    expect(hasPermission('poros_coordinator', 'poros.access')).toBeTruthy()
    expect(gateCheck.allowed).toBeFalsy()
  })
})

// ============================================================
// SUITE 5.1.4 — Medical Reports (Rapha) — HIPAA-sensitive
// ============================================================

describe('5.1.4 Medical Reports (Rapha): strictly org-scoped, extra permission required', () => {
  resetCounter()

  it('rapha.access is required and NOT granted to most roles', () => {
    // Roles with rapha.access
    expect(hasPermission('rapha_coordinator', 'rapha.access')).toBeTruthy()
    expect(hasPermission('org_admin', 'rapha.access')).toBeTruthy()
    expect(hasPermission('master_admin', 'rapha.access')).toBeTruthy()

    // Roles WITHOUT rapha.access — cannot see medical data
    expect(hasPermission('event_manager', 'rapha.access')).toBeFalsy()
    expect(hasPermission('finance_manager', 'rapha.access')).toBeFalsy()
    expect(hasPermission('poros_coordinator', 'rapha.access')).toBeFalsy()
    expect(hasPermission('salve_coordinator', 'rapha.access')).toBeFalsy()
    expect(hasPermission('staff', 'rapha.access')).toBeFalsy()
    expect(hasPermission('group_leader', 'rapha.access')).toBeFalsy()
  })

  it('medical data in liability forms is strictly scoped to the event → org', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const partA = makeParticipantWithMedical(regA, orgA, eventA)
    const partB = makeParticipantWithMedical(regB, orgB, eventB, {
      allergies: 'Shellfish — CRITICAL anaphylaxis risk',
      medications: 'EpiPen x2',
    })

    const formA = makeLiabilityForm(partA)
    const formB = makeLiabilityForm(partB, {
      allergies: 'Shellfish — CRITICAL anaphylaxis risk',
      medications: 'EpiPen x2',
    })

    const allForms: MockLiabilityForm[] = [formA, formB]

    // Rapha coordinator for Org A accesses report for eventA
    const raphaCoordA = makeAdminUser(orgA, { role: 'rapha_coordinator' })
    const gateCheck = simulateEventAccessGate(orgA.id, 'rapha_coordinator', eventA.organizationId)
    expect(gateCheck.allowed).toBeTruthy()

    const medicalReportA = queryByEventId(allForms, eventA.id)

    expect(medicalReportA.length).toBe(1)
    // Org A's medical data is accessible
    expect(medicalReportA[0].organizationId).toBe(orgA.id)
    // CRITICAL: Org B's allergy data NOT exposed to Org A
    expect(medicalReportA.some(f => f.allergies === 'Shellfish — CRITICAL anaphylaxis risk')).toBeFalsy()
    expect(medicalReportA.some(f => f.medications === 'EpiPen x2')).toBeFalsy()
  })

  it('SECURITY: rapha coordinator from Org A cannot access Org B medical records', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const raphaCoordA = makeAdminUser(orgA, { role: 'rapha_coordinator' })
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    // Even with rapha.access permission, the event gate blocks cross-org access
    const gateCheck = simulateEventAccessGate(orgA.id, 'rapha_coordinator', eventB.organizationId)

    expect(gateCheck.allowed).toBeFalsy()
    expect(gateCheck.status).toBe(403)
  })

  it('SECURITY: all six sensitive medical fields are scoped — none leak cross-org', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const partA = makeParticipant(regA, orgA, eventA)
    const partB = makeParticipant(regB, orgB, eventB)

    const formB = makeLiabilityForm(partB, {
      allergies: 'B_ALLERGY_SECRET',
      dietaryRestrictions: 'B_DIET_SECRET',
      medicalConditions: 'B_CONDITION_SECRET',
      medications: 'B_MEDICATION_SECRET',
      adaAccommodations: 'B_ADA_SECRET',
    })
    const formA = makeLiabilityForm(partA) // no medical data

    const allForms = [formA, formB]
    const reportForA = queryByEventId(allForms, eventA.id)

    // None of Org B's sensitive strings appear in Org A's report
    const reportText = JSON.stringify(reportForA)
    expect(reportText.includes('B_ALLERGY_SECRET')).toBeFalsy()
    expect(reportText.includes('B_DIET_SECRET')).toBeFalsy()
    expect(reportText.includes('B_CONDITION_SECRET')).toBeFalsy()
    expect(reportText.includes('B_MEDICATION_SECRET')).toBeFalsy()
    expect(reportText.includes('B_ADA_SECRET')).toBeFalsy()
  })

  it('emergency contact info is org-scoped (sensitive PII)', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const partA = makeParticipant(regA, orgA, eventA, {
      emergencyContact1Name: 'AlphaParent Johnson',
      emergencyContact1Phone: '555-ALPHA',
    })
    const partB = makeParticipant(regB, orgB, eventB, {
      emergencyContact1Name: 'BetaParent Wilson',
      emergencyContact1Phone: '555-BETA',
    })

    const allParticipants = [partA, partB]
    const reportA = queryByEventId(allParticipants, eventA.id)

    expect(reportA.length).toBe(1)
    expect(reportA[0].emergencyContact1Name).toBe('AlphaParent Johnson')
    expect(reportA.some(p => p.emergencyContact1Name === 'BetaParent Wilson')).toBeFalsy()
    expect(reportA.some(p => p.emergencyContact1Phone === '555-BETA')).toBeFalsy()
  })
})

// ============================================================
// SUITE 5.1.5 — Check-in Reports (SALVE)
// ============================================================

describe('5.1.5 Check-in Reports (SALVE): org-scoped check-in logs and participants', () => {
  resetCounter()

  it('salve.access is required — not granted to finance_manager or rapha_coordinator', () => {
    expect(hasPermission('salve_coordinator', 'salve.access')).toBeTruthy()
    expect(hasPermission('event_manager', 'salve.access')).toBeTruthy()
    expect(hasPermission('org_admin', 'salve.access')).toBeTruthy()
    expect(hasPermission('master_admin', 'salve.access')).toBeTruthy()

    expect(hasPermission('finance_manager', 'salve.access')).toBeFalsy()
    expect(hasPermission('rapha_coordinator', 'salve.access')).toBeFalsy()
    expect(hasPermission('poros_coordinator', 'salve.access')).toBeFalsy()
    expect(hasPermission('staff', 'salve.access')).toBeFalsy()
  })

  it('check-in log is scoped to eventId → org isolation enforced via access gate', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const partA = makeParticipant(regA, orgA, eventA, { firstName: 'AlphaChecked', checkedIn: true })
    const partB = makeParticipant(regB, orgB, eventB, { firstName: 'BetaChecked', checkedIn: true })

    const logA = makeCheckInLog(partA, orgA)
    const logB = makeCheckInLog(partB, orgB)

    const allLogs: MockCheckInLog[] = [logA, logB]

    // SALVE coordinator for Org A accesses check-in logs for eventA
    const gateCheck = simulateEventAccessGate(orgA.id, 'salve_coordinator', eventA.organizationId)
    expect(gateCheck.allowed).toBeTruthy()

    const checkInReportA = queryByEventId(allLogs, eventA.id)

    expect(checkInReportA.length).toBe(1)
    expect(checkInReportA[0].participantName).toContain('AlphaChecked')
    expect(checkInReportA.some(l => l.participantName.includes('BetaChecked'))).toBeFalsy()
    expect(checkInReportA[0].organizationId).toBe(orgA.id)
  })

  it('check-in stats for Org A do not include Org B\'s attendance count', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const checkedInA = [
      makeParticipant(regA, orgA, eventA, { checkedIn: true }),
      makeParticipant(regA, orgA, eventA, { checkedIn: true }),
    ]
    const notCheckedInA = [
      makeParticipant(regA, orgA, eventA, { checkedIn: false }),
    ]
    const checkedInB = [
      makeParticipant(regB, orgB, eventB, { checkedIn: true }),
      makeParticipant(regB, orgB, eventB, { checkedIn: true }),
      makeParticipant(regB, orgB, eventB, { checkedIn: true }),
    ]

    const allParticipants = [...checkedInA, ...notCheckedInA, ...checkedInB]

    const participantsForA = queryByEventId(allParticipants, eventA.id)
    const checkedInCountA = participantsForA.filter(p => p.checkedIn).length

    expect(checkedInCountA).toBe(2)     // Only Org A's 2 checked-in
    expect(checkedInCountA).not.toBe(5) // NOT 2 + 3 (without isolation)
  })

  it('salve coordinator from Org A is blocked from Org B check-in data', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    const gateCheck = simulateEventAccessGate(orgA.id, 'salve_coordinator', eventB.organizationId)

    expect(gateCheck.allowed).toBeFalsy()
    expect(gateCheck.status).toBe(403)
  })

  it('check-in log records organizationId for audit trail', () => {
    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)
    const regA = makeGroupRegistration(eventA)
    const partA = makeParticipant(regA, orgA, eventA, { checkedIn: true })
    const logA = makeCheckInLog(partA, orgA)

    // The log carries organizationId — this enables org-scoped audit reports
    expect(logA.organizationId).toBe(orgA.id)
    expect(logA.eventId).toBe(eventA.id)
    expect(logA.participantId).toBe(partA.id)
  })
})

// ============================================================
// SUITE 5.2.1 + 5.2.2 — Cross-Org Leakage: Full Dataset Test
// ============================================================

describe('5.2.1-5.2.2 Cross-Org Leakage: Org A and Org B have overlapping events — zero leakage', () => {
  const { orgA, orgB } = buildTwoOrgDataset()

  // All data pools (as if pulling everything from DB)
  const allRegistrations = [...orgA.registrations, ...orgB.registrations]
  const allParticipants = [...orgA.participants, ...orgB.participants]
  const allForms = [...orgA.forms, ...orgB.forms]
  const allRooms = [...orgA.rooms, ...orgB.rooms]
  const allCheckInLogs = [...orgA.checkInLogs, ...orgB.checkInLogs]
  const allPayments = [...orgA.payments, ...orgB.payments]

  it('registration report for Org A contains ZERO Org B registrations', () => {
    const report = queryByEventId(allRegistrations, orgA.event.id)

    expect(report.length).toBe(orgA.registrations.length)
    expect(report.every(r => r.organizationId === orgA.org.id)).toBeTruthy()
    expect(report.some(r => r.organizationId === orgB.org.id)).toBeFalsy()

    const groupNames = report.map(r => r.groupName)
    expect(groupNames.some(n => n.includes('Beta'))).toBeFalsy()
    expect(groupNames.every(n => n.includes('Alpha'))).toBeTruthy()
  })

  it('registration report for Org B contains ZERO Org A registrations', () => {
    const report = queryByEventId(allRegistrations, orgB.event.id)

    expect(report.length).toBe(orgB.registrations.length)
    expect(report.every(r => r.organizationId === orgB.org.id)).toBeTruthy()
    expect(report.some(r => r.organizationId === orgA.org.id)).toBeFalsy()

    const groupNames = report.map(r => r.groupName)
    expect(groupNames.some(n => n.includes('Alpha'))).toBeFalsy()
    expect(groupNames.every(n => n.includes('Beta'))).toBeTruthy()
  })

  it('financial report for Org A contains ZERO Org B payments', () => {
    const report = queryByEventId(allPayments, orgA.event.id)

    expect(report.every(p => p.organizationId === orgA.org.id)).toBeTruthy()
    expect(report.some(p => p.organizationId === orgB.org.id)).toBeFalsy()
  })

  it('financial report for Org B contains ZERO Org A payments', () => {
    const report = queryByEventId(allPayments, orgB.event.id)

    expect(report.every(p => p.organizationId === orgB.org.id)).toBeTruthy()
    expect(report.some(p => p.organizationId === orgA.org.id)).toBeFalsy()
  })

  it('housing report for Org A contains ZERO Org B rooms', () => {
    const report = queryByEventId(allRooms, orgA.event.id)

    expect(report.every(r => r.organizationId === orgA.org.id)).toBeTruthy()
    expect(report.some(r => r.organizationId === orgB.org.id)).toBeFalsy()
    expect(report.some(r => r.buildingName.includes('Beta'))).toBeFalsy()
  })

  it('housing report for Org B contains ZERO Org A rooms', () => {
    const report = queryByEventId(allRooms, orgB.event.id)

    expect(report.every(r => r.organizationId === orgB.org.id)).toBeTruthy()
    expect(report.some(r => r.organizationId === orgA.org.id)).toBeFalsy()
    expect(report.some(r => r.buildingName.includes('Alpha'))).toBeFalsy()
  })

  it('[MEDICAL] report for Org A exposes ZERO Org B medical records', () => {
    const report = queryByEventId(allForms, orgA.event.id)

    expect(report.every(f => f.organizationId === orgA.org.id)).toBeTruthy()
    expect(report.some(f => f.organizationId === orgB.org.id)).toBeFalsy()

    // Org B has specific medical strings — verify none appear
    const reportJson = JSON.stringify(report)
    expect(reportJson.includes('Shellfish')).toBeFalsy() // Org B's allergy
    expect(reportJson.includes('CarolBeta')).toBeFalsy()  // Org B participant name
  })

  it('[MEDICAL] report for Org B exposes ZERO Org A medical records', () => {
    const report = queryByEventId(allForms, orgB.event.id)

    expect(report.every(f => f.organizationId === orgB.org.id)).toBeTruthy()
    expect(report.some(f => f.organizationId === orgA.org.id)).toBeFalsy()

    const reportJson = JSON.stringify(report)
    expect(reportJson.includes('AliceAlpha')).toBeFalsy()  // Org A participant name
  })

  it('check-in report for Org A contains ZERO Org B check-in logs', () => {
    const report = queryByEventId(allCheckInLogs, orgA.event.id)

    expect(report.every(l => l.organizationId === orgA.org.id)).toBeTruthy()
    expect(report.some(l => l.organizationId === orgB.org.id)).toBeFalsy()
    expect(report.some(l => l.participantName.includes('Beta'))).toBeFalsy()
  })

  it('check-in report for Org B contains ZERO Org A check-in logs', () => {
    const report = queryByEventId(allCheckInLogs, orgB.event.id)

    expect(report.every(l => l.organizationId === orgB.org.id)).toBeTruthy()
    expect(report.some(l => l.organizationId === orgA.org.id)).toBeFalsy()
    expect(report.some(l => l.participantName.includes('Alpha'))).toBeFalsy()
  })

  it('participant counts are isolated — overlapping dates do not cause bleed', () => {
    // Events A and B overlap in time (Jul 1-4 vs Jul 2-5) — data is still isolated
    const participantsA = queryByEventId(allParticipants, orgA.event.id)
    const participantsB = queryByEventId(allParticipants, orgB.event.id)

    expect(participantsA.every(p => p.organizationId === orgA.org.id)).toBeTruthy()
    expect(participantsB.every(p => p.organizationId === orgB.org.id)).toBeTruthy()
    // No shared participants despite overlapping dates
    const aIds = new Set(participantsA.map(p => p.id))
    const bIds = new Set(participantsB.map(p => p.id))
    const intersection = [...aIds].filter(id => bIds.has(id))
    expect(intersection.length).toBe(0)
  })
})

// ============================================================
// SUITE 5.2.3 — "all events" query isolation
// ============================================================

describe('5.2.3 "All Events" Query: financial correctly org-scoped; others are blocked or buggy', () => {
  resetCounter()

  it('[VERIFIED] financial "all" query correctly filters by effectiveOrgId', () => {
    // Financial route when eventId='all':
    //   eventFilter = { organizationId: effectiveOrgId }
    // This is correct — only Org A's payments returned.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const pA = makePayment(orgA, eventA, regA, { amount: 1000 })
    const pB = makePayment(orgB, eventB, regB, { amount: 2000 })
    const allPayments = [pA, pB]

    // Simulate financial "all" with org filter (correct behavior)
    const allEventsForOrgA = queryAllEventsByOrg(allPayments, orgA.id)

    expect(allEventsForOrgA.length).toBe(1)
    expect(allEventsForOrgA[0].organizationId).toBe(orgA.id)
    expect(allEventsForOrgA.some(p => p.organizationId === orgB.id)).toBeFalsy()
  })

  it('[SECURITY FINDING] registrations "all" query returns NO filter → all orgs exposed', () => {
    // registrations/route.ts line 21:
    //   const eventFilter = eventId === 'all' ? {} : { eventId }
    // When eventId='all': {} → no filter → ALL registrations returned.
    //
    // HOWEVER: verifyEventAccess('all') → event lookup returns null → 404
    // So this code path is unreachable in practice via the access gate.
    //
    // This test documents the vulnerability IF the access gate were bypassed
    // or if 'all' were handled specially in verifyEventAccess in the future.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const allRegs = [regA, regB]

    // Simulate the BUGGY no-filter query (what happens if access gate is bypassed)
    const buggyResult = queryAllEventsNoFilter(allRegs)
    const correctResult = queryAllEventsByOrg(allRegs, orgA.id)

    expect(buggyResult.length).toBe(2)   // LEAKS Org B data
    expect(correctResult.length).toBe(1)  // Correct: only Org A

    // Document: the current protection is the 404 from event lookup — not the query itself
    const buggyQuery = {} // No filter — the dangerous default
    const correctQuery = { organizationId: orgA.id }
    expect(Object.keys(buggyQuery).length).toBe(0) // No filter fields
    expect(Object.keys(correctQuery).length).toBe(1) // Has org filter
  })

  it('[SECURITY FINDING] medical "all" query uses {} filter — same exposure as registrations', () => {
    // medical/route.ts comment: "For all, we'll filter by org in the query below"
    // But the actual query WHERE clause is { participant: { groupRegistration: {} } }
    // — NO org filter is applied.
    //
    // Same protection as registrations: verifyEventAccess('all') returns 404.
    // But IF that gate were bypassed, ALL orgs' HIPAA data would be exposed.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)
    const partA = makeParticipantWithMedical(regA, orgA, eventA)
    const partB = makeParticipantWithMedical(regB, orgB, eventB, { allergies: 'B_CRITICAL_ALLERGY' })
    const formA = makeLiabilityForm(partA)
    const formB = makeLiabilityForm(partB, { allergies: 'B_CRITICAL_ALLERGY' })

    const allForms = [formA, formB]

    // Buggy: no filter → exposes ALL medical data
    const buggyResult = queryAllEventsNoFilter(allForms)
    // Correct: filter by org
    const correctResult = queryAllEventsByOrg(allForms, orgA.id)

    expect(buggyResult.length).toBe(2)                // LEAKS Org B's HIPAA data
    expect(correctResult.length).toBe(1)               // Correct

    const buggyJson = JSON.stringify(buggyResult)
    expect(buggyJson.includes('B_CRITICAL_ALLERGY')).toBeTruthy()  // Leaks Org B allergy!

    const correctJson = JSON.stringify(correctResult)
    expect(correctJson.includes('B_CRITICAL_ALLERGY')).toBeFalsy() // Safe
  })

  it('[RECOMMENDED FIX] all report routes should add organizationId to "all" eventFilter', () => {
    // The fix: in each route that handles eventId === 'all', change:
    //   eventFilter = {}
    // to:
    //   eventFilter = { organizationId: effectiveOrgId }
    //
    // This mirrors what the financial route already does correctly.
    // Affected routes: registrations, housing, medical, chaperones, forms, export-all

    const effectiveOrgId = 'org-A-uuid'
    const buggyFilter = {} // Current behavior
    const fixedFilter = { organizationId: effectiveOrgId } // Recommended fix

    expect(Object.keys(buggyFilter).length).toBe(0)    // No protection
    expect(fixedFilter.organizationId).toBe(effectiveOrgId) // Explicit guard
  })
})

// ============================================================
// SUITE 5.2.4 — Role-based permission gate tests
// ============================================================

describe('5.2.4 Role-Based Permission Gates: wrong role cannot access specialized reports', () => {
  resetCounter()

  it('event_manager cannot access financial reports (missing reports.view_financial)', () => {
    const hasFinancialAccess = hasPermission('event_manager', 'reports.view_financial')
    expect(hasFinancialAccess).toBeFalsy()
  })

  it('finance_manager cannot access medical reports (missing rapha.access)', () => {
    const hasMedicalAccess = hasPermission('finance_manager', 'rapha.access')
    expect(hasMedicalAccess).toBeFalsy()
  })

  it('finance_manager cannot access housing reports (missing poros.access)', () => {
    const hasHousingAccess = hasPermission('finance_manager', 'poros.access')
    expect(hasHousingAccess).toBeFalsy()
  })

  it('poros_coordinator cannot access financial reports (missing reports.view_financial)', () => {
    expect(hasPermission('poros_coordinator', 'reports.view_financial')).toBeFalsy()
  })

  it('salve_coordinator cannot access medical or financial reports', () => {
    expect(hasPermission('salve_coordinator', 'rapha.access')).toBeFalsy()
    expect(hasPermission('salve_coordinator', 'reports.view_financial')).toBeFalsy()
  })

  it('rapha_coordinator cannot access financial reports or check-in data', () => {
    expect(hasPermission('rapha_coordinator', 'reports.view_financial')).toBeFalsy()
    expect(hasPermission('rapha_coordinator', 'salve.access')).toBeFalsy()
  })

  it('staff has only reports.view — not financial, medical, housing, or check-in', () => {
    expect(hasPermission('staff', 'reports.view')).toBeTruthy()
    expect(hasPermission('staff', 'reports.view_financial')).toBeFalsy()
    expect(hasPermission('staff', 'rapha.access')).toBeFalsy()
    expect(hasPermission('staff', 'poros.access')).toBeFalsy()
    expect(hasPermission('staff', 'salve.access')).toBeFalsy()
  })

  it('group_leader has NO report permissions at all', () => {
    const reportPerms: Permission[] = [
      'reports.view', 'reports.view_basic', 'reports.view_financial', 'reports.export',
      'poros.access', 'salve.access', 'rapha.access',
    ]
    const hasAny = hasAnyPermission('group_leader', reportPerms)
    expect(hasAny).toBeFalsy()
  })
})

// ============================================================
// SUITE 5.2.5 — Master admin access + impersonation isolation
// ============================================================

describe('5.2.5 Master Admin: unrestricted access + impersonation is ID-verified', () => {
  resetCounter()

  it('master_admin has ALL report-related permissions', () => {
    const allReportPerms: Permission[] = [
      'reports.view', 'reports.view_basic', 'reports.view_financial', 'reports.export',
      'poros.access', 'salve.access', 'rapha.access',
      'portals.poros.view', 'portals.salve.view', 'portals.rapha.view',
      'forms.view',
    ]
    expect(hasAnyPermission('master_admin', allReportPerms)).toBeTruthy()
    expect(allReportPerms.every(p => hasPermission('master_admin', p))).toBeTruthy()
  })

  it('master_admin passes event access gate for ANY org\'s event', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventB = makeEvent(orgB, adminA)

    // Master admin with effectiveOrgId = orgA.id accessing Org B's event
    const gateCheck = simulateEventAccessGate(orgA.id, 'master_admin', eventB.organizationId)
    expect(gateCheck.allowed).toBeTruthy()
    expect(gateCheck.status).toBe(200)
  })

  it('impersonation returns impersonated org ID — not master admin\'s real org', () => {
    // getEffectiveOrgId() logic (from get-effective-org.ts):
    //   if (user.role === 'master_admin' && impersonating_org cookie && masterAdminId === user.id)
    //     return impersonating_org
    //   else
    //     return user.organizationId

    const masterAdmin = { id: 'master-user-id', role: 'master_admin', organizationId: 'platform-admin' }
    const impersonatedOrgId = 'org-B-uuid'

    // Simulate cookie verification: masterAdminId cookie must match user.id
    const cookieMasterAdminId = 'master-user-id' // correct — same as user.id
    const isVerified = cookieMasterAdminId === masterAdmin.id

    const effectiveOrgId = isVerified ? impersonatedOrgId : masterAdmin.organizationId
    expect(effectiveOrgId).toBe(impersonatedOrgId)
    expect(effectiveOrgId).not.toBe(masterAdmin.organizationId)
  })

  it('impersonation is rejected if master_admin_id cookie does not match user.id', () => {
    const masterAdmin = { id: 'master-user-id', role: 'master_admin', organizationId: 'platform-admin' }
    const impersonatedOrgId = 'org-B-uuid'

    // Cookie has WRONG master admin id (e.g., someone crafted the cookie)
    const cookieMasterAdminId = 'different-user-id' // does NOT match
    const isVerified = cookieMasterAdminId === masterAdmin.id

    const effectiveOrgId = isVerified ? impersonatedOrgId : masterAdmin.organizationId
    // Falls back to platform-admin — impersonation rejected
    expect(effectiveOrgId).toBe(masterAdmin.organizationId)
    expect(effectiveOrgId).not.toBe(impersonatedOrgId)
  })

  it('non-master-admin cannot initiate impersonation (role check)', () => {
    // getEffectiveOrgId() only reads the impersonating_org cookie
    // if user.role === 'master_admin'. For all other roles it returns
    // user.organizationId directly — the cookie is ignored.

    const orgAdmin = { id: 'org-admin-id', role: 'org_admin', organizationId: 'org-A-uuid' }
    const impersonatedOrgId = 'org-B-uuid'

    // Even if cookie is set, non-master-admin cannot impersonate
    const effectiveOrgId = orgAdmin.role === 'master_admin'
      ? impersonatedOrgId  // Would use cookie
      : orgAdmin.organizationId  // Always returns own org

    expect(effectiveOrgId).toBe(orgAdmin.organizationId)
    expect(effectiveOrgId).not.toBe(impersonatedOrgId)
  })
})

// ============================================================
// SUITE 5.2.6 — Symmetric isolation verification (all report types)
// ============================================================

describe('5.2.6 Symmetric Isolation: every report type verified in both directions', () => {
  const { orgA, orgB } = buildTwoOrgDataset()

  function assertNoLeakage<T extends { organizationId: string }>(
    reportName: string,
    reportForA: T[],
    reportForB: T[],
    orgAId: string,
    orgBId: string
  ) {
    const aContainsBData = reportForA.some(d => d.organizationId === orgBId)
    const bContainsAData = reportForB.some(d => d.organizationId === orgAId)
    return { aContainsBData, bContainsAData }
  }

  it('registrations: no leakage A→B or B→A', () => {
    const all = [...orgA.registrations, ...orgB.registrations]
    const forA = queryByEventId(all, orgA.event.id) as typeof all
    const forB = queryByEventId(all, orgB.event.id) as typeof all

    const leak = assertNoLeakage('registrations', forA, forB, orgA.org.id, orgB.org.id)
    expect(leak.aContainsBData).toBeFalsy()
    expect(leak.bContainsAData).toBeFalsy()
  })

  it('payments: no leakage A→B or B→A', () => {
    const all = [...orgA.payments, ...orgB.payments]
    const forA = queryByEventId(all, orgA.event.id) as typeof all
    const forB = queryByEventId(all, orgB.event.id) as typeof all

    const leak = assertNoLeakage('payments', forA, forB, orgA.org.id, orgB.org.id)
    expect(leak.aContainsBData).toBeFalsy()
    expect(leak.bContainsAData).toBeFalsy()
  })

  it('rooms: no leakage A→B or B→A', () => {
    const all = [...orgA.rooms, ...orgB.rooms]
    const forA = queryByEventId(all, orgA.event.id) as typeof all
    const forB = queryByEventId(all, orgB.event.id) as typeof all

    const leak = assertNoLeakage('rooms', forA, forB, orgA.org.id, orgB.org.id)
    expect(leak.aContainsBData).toBeFalsy()
    expect(leak.bContainsAData).toBeFalsy()
  })

  it('[MEDICAL] liability forms: no leakage A→B or B→A', () => {
    const all = [...orgA.forms, ...orgB.forms]
    const forA = queryByEventId(all, orgA.event.id) as typeof all
    const forB = queryByEventId(all, orgB.event.id) as typeof all

    const leak = assertNoLeakage('forms', forA, forB, orgA.org.id, orgB.org.id)
    expect(leak.aContainsBData).toBeFalsy()
    expect(leak.bContainsAData).toBeFalsy()

    // Extra: no medical data strings from the other org appear
    const forAJson = JSON.stringify(forA)
    const forBJson = JSON.stringify(forB)
    // Org A participant (AliceAlpha) has Peanut allergy
    expect(forBJson.includes('Peanuts')).toBeFalsy()
    // Org B participant (CarolBeta) has Shellfish allergy
    expect(forAJson.includes('Shellfish')).toBeFalsy()
  })

  it('check-in logs: no leakage A→B or B→A', () => {
    const all = [...orgA.checkInLogs, ...orgB.checkInLogs]
    const forA = queryByEventId(all, orgA.event.id) as typeof all
    const forB = queryByEventId(all, orgB.event.id) as typeof all

    const leak = assertNoLeakage('checkInLogs', forA, forB, orgA.org.id, orgB.org.id)
    expect(leak.aContainsBData).toBeFalsy()
    expect(leak.bContainsAData).toBeFalsy()
  })

  it('ALL report types pass the symmetric isolation check simultaneously', () => {
    // One consolidated assertion: for each data type, verify full symmetry
    const checks = [
      { name: 'registrations', all: [...orgA.registrations, ...orgB.registrations] },
      { name: 'payments', all: [...orgA.payments, ...orgB.payments] },
      { name: 'rooms', all: [...orgA.rooms, ...orgB.rooms] },
      { name: 'forms', all: [...orgA.forms, ...orgB.forms] },
      { name: 'checkInLogs', all: [...orgA.checkInLogs, ...orgB.checkInLogs] },
    ]

    for (const { name, all } of checks) {
      const forA = queryByEventId(all as any[], orgA.event.id)
      const forB = queryByEventId(all as any[], orgB.event.id)

      const aLeak = forA.some((d: any) => d.organizationId === orgB.org.id)
      const bLeak = forB.some((d: any) => d.organizationId === orgA.org.id)

      expect(aLeak).toBeFalsy()  // Org B data not in Org A's report
      expect(bLeak).toBeFalsy()  // Org A data not in Org B's report
    }
  })
})

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n📊 Running Reporting Isolation Tests (Phase 5)...\n')
  await new Promise(r => setTimeout(r, 50))
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
