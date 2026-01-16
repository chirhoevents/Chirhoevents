import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyReportAccess } from '@/lib/api-auth'

// POST execute a custom report without saving as template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, user, event, effectiveOrgId } = await verifyReportAccess(
      request,
      eventId,
      '[Custom Report]'
    )
    if (error) return error

    const body = await request.json()
    const { configuration } = body

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration required' }, { status: 400 })
    }

    const config = configuration
    const dataSource = config.dataSource || config.reportType || 'participants'
    console.log('Executing custom report:', dataSource, 'with config:', JSON.stringify(config))

    let reportData: any

    switch (dataSource) {
      case 'registrations':
        reportData = await executeRegistrationsReport(eventId, config)
        break
      case 'participants':
      case 'roster':
        reportData = await executeParticipantsReport(eventId, config)
        break
      case 'individuals':
        reportData = await executeIndividualsReport(eventId, config)
        break
      case 'vendors':
        reportData = await executeVendorsReport(eventId, config)
        break
      case 'staff':
        reportData = await executeStaffReport(eventId, config)
        break
      case 'financial':
        reportData = await executeFinancialReport(eventId, config)
        break
      case 'checkins':
        reportData = await executeCheckinsReport(eventId, config)
        break
      case 'medical':
        reportData = await executeMedicalReport(eventId, config)
        break
      case 'incidents':
        reportData = await executeIncidentsReport(eventId, config)
        break
      case 'housing':
        reportData = await executeHousingReport(eventId, config)
        break
      case 'tshirts':
        reportData = await executeTShirtsReport(eventId, config)
        break
      case 'coupons':
        reportData = await executeCouponsReport(eventId, config)
        break
      // Legacy support
      case 'registration':
        reportData = await executeRegistrationsReport(eventId, config)
        break
      case 'balances':
        reportData = await executeBalancesReport(eventId, config)
        break
      default:
        return NextResponse.json({ error: `Unsupported data source: ${dataSource}` }, { status: 400 })
    }

    const totalCount = Array.isArray(reportData) ? reportData.length :
                       reportData?.items?.length ||
                       reportData?.data?.length || 0

    return NextResponse.json({
      reportType: dataSource,
      data: reportData,
      totalCount,
      grouped: config.groupBy && config.groupBy !== 'none',
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error executing custom report:', error)
    return NextResponse.json({ error: 'Failed to execute report' }, { status: 500 })
  }
}

// ============================================
// REGISTRATIONS REPORT (Group Registrations)
// ============================================
async function executeRegistrationsReport(eventId: string, config: any) {
  const where: any = { eventId }

  // Apply filters
  if (config.filters?.registrationStatus?.length > 0) {
    where.registrationStatus = { in: config.filters.registrationStatus }
  }
  if (config.filters?.housingType?.length > 0) {
    where.housingType = { in: config.filters.housingType }
  }
  if (config.filters?.search) {
    const search = config.filters.search
    where.OR = [
      { groupName: { contains: search, mode: 'insensitive' } },
      { parishName: { contains: search, mode: 'insensitive' } },
      { groupLeaderEmail: { contains: search, mode: 'insensitive' } },
      { groupLeaderName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const registrations = await prisma.groupRegistration.findMany({
    where,
    include: {
      participants: { select: { id: true, participantType: true } },
    },
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { createdAt: 'desc' },
  })

  // Get payment balances
  const regIds = registrations.map((r: { id: string }) => r.id)
  const balances = await prisma.paymentBalance.findMany({
    where: { registrationId: { in: regIds }, registrationType: 'group' },
  })
  const balanceMap = new Map(balances.map((b: { registrationId: string }) => [b.registrationId, b]))

  // Transform with balance info and counts
  let results = registrations.map((reg: typeof registrations[number]) => {
    const balance = balanceMap.get(reg.id) as {
      paymentStatus: string
      totalAmountDue: number | { toNumber(): number }
      amountPaid: number | { toNumber(): number }
      amountRemaining: number | { toNumber(): number }
    } | undefined
    const youthCount = reg.participants.filter((p: { participantType: string }) =>
      p.participantType === 'youth_u18' || p.participantType === 'youth_o18'
    ).length
    const chaperoneCount = reg.participants.filter((p: { participantType: string }) => p.participantType === 'chaperone').length
    const priestCount = reg.participants.filter((p: { participantType: string }) => p.participantType === 'priest').length

    return {
      ...reg,
      youthCount,
      chaperoneCount,
      priestCount,
      totalParticipants: reg.participants.length,
      paymentStatus: balance?.paymentStatus || 'unpaid',
      totalAmountDue: balance ? Number(balance.totalAmountDue) : 0,
      amountPaid: balance ? Number(balance.amountPaid) : 0,
      amountRemaining: balance ? Number(balance.amountRemaining) : 0,
      participants: undefined, // Remove participants array for cleaner output
    }
  })

  // Apply payment status filter after joining with balances
  if (config.filters?.paymentStatus?.length > 0) {
    results = results.filter((r: { paymentStatus: string }) => config.filters.paymentStatus.includes(r.paymentStatus))
  }

  // Apply grouping
  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// PARTICIPANTS REPORT (Participant Roster)
// ============================================
async function executeParticipantsReport(eventId: string, config: any) {
  const where: any = {
    groupRegistration: { eventId },
  }

  // Apply filters
  if (config.filters?.participantType?.length > 0) {
    where.participantType = { in: config.filters.participantType }
  }
  if (config.filters?.gender?.length > 0) {
    where.gender = { in: config.filters.gender }
  }
  if (config.filters?.checkedIn && config.filters.checkedIn !== 'all') {
    where.checkedIn = config.filters.checkedIn === 'true'
  }
  if (config.filters?.minAge) {
    where.age = { ...where.age, gte: parseInt(config.filters.minAge) }
  }
  if (config.filters?.maxAge) {
    where.age = { ...where.age, lte: parseInt(config.filters.maxAge) }
  }
  if (config.filters?.search) {
    const search = config.filters.search
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const participants = await prisma.participant.findMany({
    where,
    include: {
      groupRegistration: {
        select: {
          id: true,
          accessCode: true,
          groupName: true,
          parishName: true,
          dioceseName: true,
          groupLeaderName: true,
          groupLeaderEmail: true,
          groupLeaderPhone: true,
          housingType: true,
        },
      },
      liabilityForms: {
        select: {
          allergies: true,
          medications: true,
          medicalConditions: true,
          dietaryRestrictions: true,
          adaAccommodations: true,
          emergencyContact1Name: true,
          emergencyContact1Phone: true,
          emergencyContact1Relation: true,
        },
        take: 1,
      },
    },
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { lastName: 'asc' },
  })

  // Transform data
  let results = participants.map((p: typeof participants[number]) => ({
    ...p,
    liabilityForm: p.liabilityForms?.[0] || null,
    liabilityForms: undefined,
  }))

  // Filter by medical needs
  if (config.filters?.hasMedicalNeeds) {
    results = results.filter((p: { liabilityForm: { allergies?: string | null; medications?: string | null; medicalConditions?: string | null } | null }) =>
      p.liabilityForm?.allergies ||
      p.liabilityForm?.medications ||
      p.liabilityForm?.medicalConditions
    )
  }

  // Filter by liability form status (checks if form exists)
  if (config.filters?.liabilityFormStatus && config.filters.liabilityFormStatus !== 'all') {
    if (config.filters.liabilityFormStatus === 'completed') {
      results = results.filter((p: { liabilityForm: unknown }) => p.liabilityForm !== null)
    } else {
      results = results.filter((p: { liabilityForm: unknown }) => !p.liabilityForm)
    }
  }

  // Apply grouping
  if (config.groupBy) {
    return groupParticipants(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// INDIVIDUALS REPORT (Individual Registrations)
// ============================================
async function executeIndividualsReport(eventId: string, config: any) {
  const where: any = { eventId }

  if (config.filters?.registrationStatus?.length > 0) {
    where.registrationStatus = { in: config.filters.registrationStatus }
  }
  if (config.filters?.checkedIn && config.filters.checkedIn !== 'all') {
    where.checkedIn = config.filters.checkedIn === 'true'
  }
  if (config.filters?.search) {
    const search = config.filters.search
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const individuals = await prisma.individualRegistration.findMany({
    where,
    include: {
      liabilityForms: {
        select: {
          allergies: true,
          medications: true,
          dietaryRestrictions: true,
        },
        take: 1,
      },
    },
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { lastName: 'asc' },
  })

  // Get payment balances
  const indIds = individuals.map((i: { id: string }) => i.id)
  const balances = await prisma.paymentBalance.findMany({
    where: { registrationId: { in: indIds }, registrationType: 'individual' },
  })
  const balanceMap = new Map(balances.map((b: { registrationId: string }) => [b.registrationId, b]))

  let results = individuals.map((ind: typeof individuals[number]) => {
    const balance = balanceMap.get(ind.id) as {
      paymentStatus: string
      totalAmountDue: number | { toNumber(): number }
      amountPaid: number | { toNumber(): number }
    } | undefined
    return {
      ...ind,
      liabilityForm: ind.liabilityForms?.[0] || null,
      paymentStatus: balance?.paymentStatus || 'unpaid',
      totalAmountDue: balance ? Number(balance.totalAmountDue) : 0,
      amountPaid: balance ? Number(balance.amountPaid) : 0,
      liabilityForms: undefined,
    }
  })

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// VENDORS REPORT
// ============================================
async function executeVendorsReport(eventId: string, config: any) {
  const where: any = { eventId }

  if (config.filters?.status?.length > 0) {
    where.status = { in: config.filters.status }
  }
  if (config.filters?.paymentStatus?.length > 0) {
    where.paymentStatus = { in: config.filters.paymentStatus }
  }
  if (config.filters?.search) {
    const search = config.filters.search
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { contactFirstName: { contains: search, mode: 'insensitive' } },
      { contactLastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const vendors = await prisma.vendorRegistration.findMany({
    where,
    include: {
      boothStaff: { select: { id: true } },
    },
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { businessName: 'asc' },
  })

  let results = vendors.map((v: typeof vendors[number]) => ({
    ...v,
    staffCount: v.boothStaff.length,
    tierPrice: Number(v.tierPrice),
    invoiceTotal: v.invoiceTotal ? Number(v.invoiceTotal) : null,
    amountPaid: Number(v.amountPaid),
    boothStaff: undefined,
  }))

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// STAFF REPORT
// ============================================
async function executeStaffReport(eventId: string, config: any) {
  const where: any = { eventId }

  if (config.filters?.isVendorStaff && config.filters.isVendorStaff !== 'all') {
    where.isVendorStaff = config.filters.isVendorStaff === 'true'
  }
  if (config.filters?.checkedIn && config.filters.checkedIn !== 'all') {
    where.checkedIn = config.filters.checkedIn === 'true'
  }
  if (config.filters?.paymentStatus?.length > 0) {
    where.paymentStatus = { in: config.filters.paymentStatus }
  }
  if (config.filters?.role) {
    where.role = { contains: config.filters.role, mode: 'insensitive' }
  }
  if (config.filters?.search) {
    const search = config.filters.search
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const staff = await prisma.staffRegistration.findMany({
    where,
    include: {
      vendorRegistration: {
        select: { businessName: true },
      },
    },
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { lastName: 'asc' },
  })

  let results = staff.map((s: typeof staff[number]) => ({
    ...s,
    pricePaid: Number(s.pricePaid),
  }))

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// FINANCIAL REPORT (Payments & Balances)
// ============================================
async function executeFinancialReport(eventId: string, config: any) {
  const paymentWhere: any = { eventId }

  if (config.filters?.paymentMethod?.length > 0) {
    paymentWhere.paymentMethod = { in: config.filters.paymentMethod }
  }
  if (config.filters?.status?.length > 0) {
    paymentWhere.status = { in: config.filters.status }
  }
  if (config.filters?.dateRange?.start) {
    paymentWhere.createdAt = { ...paymentWhere.createdAt, gte: new Date(config.filters.dateRange.start) }
  }
  if (config.filters?.dateRange?.end) {
    paymentWhere.createdAt = { ...paymentWhere.createdAt, lte: new Date(config.filters.dateRange.end) }
  }

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { createdAt: 'desc' },
  })

  // Get registration names for context
  type PaymentType = { registrationType: string; registrationId: string }
  const groupRegIds = payments.filter((p: PaymentType) => p.registrationType === 'group').map((p: PaymentType) => p.registrationId)
  const indRegIds = payments.filter((p: PaymentType) => p.registrationType === 'individual').map((p: PaymentType) => p.registrationId)

  const [groupRegs, indRegs] = await Promise.all([
    prisma.groupRegistration.findMany({
      where: { id: { in: groupRegIds } },
      select: { id: true, groupName: true, groupLeaderEmail: true },
    }),
    prisma.individualRegistration.findMany({
      where: { id: { in: indRegIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ])

  const groupMap = new Map(groupRegs.map((g: { id: string }) => [g.id, g]))
  const indMap = new Map(indRegs.map((i: { id: string }) => [i.id, i]))

  let results = payments.map((p: typeof payments[number]) => {
    let registrationName = 'Unknown'
    let contactEmail = ''

    if (p.registrationType === 'group') {
      const group = groupMap.get(p.registrationId) as { groupName?: string; groupLeaderEmail?: string } | undefined
      registrationName = group?.groupName || 'Unknown Group'
      contactEmail = group?.groupLeaderEmail || ''
    } else if (p.registrationType === 'individual') {
      const ind = indMap.get(p.registrationId) as { firstName?: string; lastName?: string; email?: string } | undefined
      registrationName = ind ? `${ind.firstName} ${ind.lastName}` : 'Unknown Individual'
      contactEmail = ind?.email || ''
    }

    return {
      ...p,
      registrationName,
      contactEmail,
      amount: Number(p.amount),
    }
  })

  // Filter by registration type
  if (config.filters?.registrationType?.length > 0) {
    results = results.filter((r: { registrationType: string }) => config.filters.registrationType.includes(r.registrationType))
  }

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// CHECKINS REPORT
// ============================================
async function executeCheckinsReport(eventId: string, config: any) {
  const where: any = { eventId }

  if (config.filters?.action?.length > 0) {
    where.action = { in: config.filters.action }
  }
  if (config.filters?.station) {
    where.station = { contains: config.filters.station, mode: 'insensitive' }
  }
  if (config.filters?.dateRange?.start) {
    where.createdAt = { ...where.createdAt, gte: new Date(config.filters.dateRange.start) }
  }
  if (config.filters?.dateRange?.end) {
    where.createdAt = { ...where.createdAt, lte: new Date(config.filters.dateRange.end) }
  }

  const logs = await prisma.checkInLog.findMany({
    where,
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { createdAt: 'desc' },
  })

  // Get participant and group info
  type LogType = { participantId?: string | null; groupRegistrationId?: string | null; individualRegistrationId?: string | null; userId?: string | null }
  const participantIds = logs.filter((l: LogType) => l.participantId).map((l: LogType) => l.participantId!)
  const groupIds = logs.filter((l: LogType) => l.groupRegistrationId).map((l: LogType) => l.groupRegistrationId!)
  const individualIds = logs.filter((l: LogType) => l.individualRegistrationId).map((l: LogType) => l.individualRegistrationId!)
  const userIds = logs.filter((l: LogType) => l.userId).map((l: LogType) => l.userId!)

  const [participants, groups, individuals, users] = await Promise.all([
    prisma.participant.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, firstName: true, lastName: true, groupRegistration: { select: { groupName: true } } },
    }),
    prisma.groupRegistration.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, groupName: true },
    }),
    prisma.individualRegistration.findMany({
      where: { id: { in: individualIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
  ])

  type ParticipantWithGroup = { id: string; firstName: string; lastName: string; groupRegistration: { groupName: string } | null }
  type GroupReg = { id: string; groupName: string }
  type IndividualReg = { id: string; firstName: string; lastName: string }
  type UserInfo = { id: string; firstName: string | null; lastName: string | null }

  const participantMap = new Map(participants.map((p: ParticipantWithGroup) => [p.id, p]))
  const groupMap = new Map(groups.map((g: GroupReg) => [g.id, g]))
  const individualMap = new Map(individuals.map((i: IndividualReg) => [i.id, i]))
  const userMap = new Map(users.map((u: UserInfo) => [u.id, u]))

  let results = logs.map((log: typeof logs[number]) => {
    let personName = 'Unknown'
    let personType = 'Unknown'
    let groupName = ''

    if (log.participantId) {
      const p = participantMap.get(log.participantId) as ParticipantWithGroup | undefined
      personName = p ? `${p.firstName} ${p.lastName}` : 'Unknown Participant'
      personType = 'Participant'
      groupName = p?.groupRegistration?.groupName || ''
    } else if (log.groupRegistrationId) {
      const g = groupMap.get(log.groupRegistrationId) as GroupReg | undefined
      personName = g?.groupName || 'Unknown Group'
      personType = 'Group'
      groupName = g?.groupName || ''
    } else if (log.individualRegistrationId) {
      const i = individualMap.get(log.individualRegistrationId) as IndividualReg | undefined
      personName = i ? `${i.firstName} ${i.lastName}` : 'Unknown Individual'
      personType = 'Individual'
    }

    const performer = log.userId ? userMap.get(log.userId) as UserInfo | undefined : null
    const performedBy = performer ? `${performer.firstName} ${performer.lastName}` : ''

    return {
      ...log,
      personName,
      personType,
      groupName,
      performedBy,
    }
  })

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// MEDICAL REPORT (Liability Forms)
// ============================================
async function executeMedicalReport(eventId: string, config: any) {
  const where: any = {
    participant: { groupRegistration: { eventId } },
  }

  const forms = await prisma.liabilityForm.findMany({
    where,
    include: {
      participant: {
        select: {
          firstName: true,
          lastName: true,
          age: true,
          participantType: true,
          groupRegistration: {
            select: {
              groupName: true,
              groupLeaderName: true,
              groupLeaderPhone: true,
            },
          },
        },
      },
    },
  })

  let results = forms

  type FormType = { allergies?: string | null; medications?: string | null; medicalConditions?: string | null; dietaryRestrictions?: string | null; participant?: { participantType?: string } | null }

  // Apply medical filters
  if (config.filters?.hasAllergies) {
    results = results.filter((f: FormType) => f.allergies && f.allergies.trim() !== '')
  }
  if (config.filters?.hasMedications) {
    results = results.filter((f: FormType) => f.medications && f.medications.trim() !== '')
  }
  if (config.filters?.hasMedicalConditions) {
    results = results.filter((f: FormType) => f.medicalConditions && f.medicalConditions.trim() !== '')
  }
  if (config.filters?.hasDietaryRestrictions) {
    results = results.filter((f: FormType) => f.dietaryRestrictions && f.dietaryRestrictions.trim() !== '')
  }
  if (config.filters?.participantType?.length > 0) {
    results = results.filter((f: FormType) => config.filters.participantType.includes(f.participant?.participantType))
  }

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// INCIDENTS REPORT (Medical Incidents - Rapha)
// ============================================
async function executeIncidentsReport(eventId: string, config: any) {
  const where: any = { eventId }

  if (config.filters?.incidentType?.length > 0) {
    where.incidentType = { in: config.filters.incidentType }
  }
  if (config.filters?.severity?.length > 0) {
    where.severity = { in: config.filters.severity }
  }
  if (config.filters?.status?.length > 0) {
    where.status = { in: config.filters.status }
  }
  if (config.filters?.dateRange?.start) {
    where.incidentDate = { ...where.incidentDate, gte: new Date(config.filters.dateRange.start) }
  }
  if (config.filters?.dateRange?.end) {
    where.incidentDate = { ...where.incidentDate, lte: new Date(config.filters.dateRange.end) }
  }

  const incidents = await prisma.medicalIncident.findMany({
    where,
    orderBy: getSortOrder(config.sortBy, config.sortDirection) || { incidentDate: 'desc' },
  })

  if (config.groupBy) {
    return groupResults(incidents, config.groupBy)
  }

  return filterFields(incidents, config.fields)
}

// ============================================
// HOUSING REPORT
// ============================================
async function executeHousingReport(eventId: string, config: any) {
  const rooms = await prisma.room.findMany({
    where: {
      building: { eventId },
    },
    include: {
      building: { select: { name: true } },
      roomAssignments: true,
    },
    orderBy: [{ building: { name: 'asc' } }, { roomNumber: 'asc' }],
  })

  // Collect all participant IDs from room assignments
  type RoomAssignmentType = { participantId?: string | null }
  const participantIds = rooms.flatMap((room: typeof rooms[number]) =>
    room.roomAssignments
      .filter((a: RoomAssignmentType) => a.participantId)
      .map((a: RoomAssignmentType) => a.participantId!)
  )

  // Fetch participant details separately
  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      participantType: true,
      gender: true,
      groupRegistration: { select: { groupName: true } },
    },
  })
  const participantMap = new Map(participants.map((p: { id: string }) => [p.id, p]))

  // Flatten to assignments
  let results: any[] = []
  rooms.forEach((room: typeof rooms[number]) => {
    room.roomAssignments.forEach((assignment: typeof room.roomAssignments[number]) => {
      const participant = assignment.participantId
        ? participantMap.get(assignment.participantId)
        : null

      results.push({
        building: { name: room.building.name },
        room: {
          roomNumber: room.roomNumber,
          floor: room.floor,
          capacity: room.capacity,
          currentOccupancy: room.roomAssignments.length,
          roomType: room.roomType,
          gender: room.gender,
          isAdaAccessible: room.isAdaAccessible,
        },
        participant: participant || null,
        assignedAt: assignment.assignedAt,
      })
    })
  })

  // Apply filters
  if (config.filters?.building) {
    results = results.filter(r =>
      r.building.name.toLowerCase().includes(config.filters.building.toLowerCase())
    )
  }
  if (config.filters?.gender && config.filters.gender !== 'all') {
    results = results.filter(r => r.room.gender === config.filters.gender)
  }

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// T-SHIRTS REPORT
// ============================================
async function executeTShirtsReport(eventId: string, config: any) {
  // Get participants
  const participants = await prisma.participant.findMany({
    where: {
      groupRegistration: { eventId },
      tShirtSize: { not: null },
    },
    select: {
      firstName: true,
      lastName: true,
      tShirtSize: true,
      participantType: true,
      groupRegistration: {
        select: { groupName: true, parishName: true },
      },
    },
  })

  // Get individual registrations
  const individuals = await prisma.individualRegistration.findMany({
    where: {
      eventId,
      tShirtSize: { not: null },
    },
    select: {
      firstName: true,
      lastName: true,
      tShirtSize: true,
    },
  })

  // Get staff (tshirtSize is required on StaffRegistration, so no null filter needed)
  const staff = await prisma.staffRegistration.findMany({
    where: { eventId },
    select: {
      firstName: true,
      lastName: true,
      tshirtSize: true,
    },
  })

  let results: any[] = [
    ...participants.map((p: typeof participants[number]) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      tShirtSize: p.tShirtSize,
      participantType: p.participantType,
      groupName: p.groupRegistration?.groupName,
      parishName: p.groupRegistration?.parishName,
      registrationType: 'participant',
    })),
    ...individuals.map((i: typeof individuals[number]) => ({
      firstName: i.firstName,
      lastName: i.lastName,
      tShirtSize: i.tShirtSize,
      participantType: 'individual',
      groupName: null,
      parishName: null,
      registrationType: 'individual',
    })),
    ...staff.map((s: typeof staff[number]) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      tShirtSize: s.tshirtSize,
      participantType: 'staff',
      groupName: null,
      parishName: null,
      registrationType: 'staff',
    })),
  ]

  // Apply filters
  if (config.filters?.sizes?.length > 0) {
    results = results.filter(r => config.filters.sizes.includes(r.tShirtSize))
  }
  if (config.filters?.personType?.length > 0) {
    results = results.filter(r => config.filters.personType.includes(r.registrationType))
  }

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// COUPONS REPORT
// ============================================
async function executeCouponsReport(eventId: string, config: any) {
  // Get coupons for this event
  const coupons = await prisma.coupon.findMany({
    where: { eventId },
    include: {
      redemptions: true,
    },
  })

  const couponMap = new Map(coupons.map((c: typeof coupons[number]) => [c.id, c]))

  // Get all redemptions
  const redemptions = coupons.flatMap((c: typeof coupons[number]) => c.redemptions)

  // Get registration info
  type RedemptionType = { registrationType: string; registrationId: string }
  const groupRegIds = redemptions.filter((r: RedemptionType) => r.registrationType === 'group').map((r: RedemptionType) => r.registrationId)
  const indRegIds = redemptions.filter((r: RedemptionType) => r.registrationType === 'individual').map((r: RedemptionType) => r.registrationId)

  const [groupRegs, indRegs] = await Promise.all([
    prisma.groupRegistration.findMany({
      where: { id: { in: groupRegIds } },
      select: { id: true, groupName: true },
    }),
    prisma.individualRegistration.findMany({
      where: { id: { in: indRegIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
  ])

  type CouponGroupReg = { id: string; groupName: string }
  type CouponIndReg = { id: string; firstName: string; lastName: string }
  const groupMap = new Map(groupRegs.map((g: CouponGroupReg) => [g.id, g]))
  const indMap = new Map(indRegs.map((i: CouponIndReg) => [i.id, i]))

  let results = redemptions.map((r: typeof redemptions[number]) => {
    const coupon = couponMap.get(r.couponId) as typeof coupons[number] | undefined
    let registrationName = 'Unknown'

    if (r.registrationType === 'group') {
      const group = groupMap.get(r.registrationId) as CouponGroupReg | undefined
      registrationName = group?.groupName || 'Unknown Group'
    } else if (r.registrationType === 'individual') {
      const ind = indMap.get(r.registrationId) as CouponIndReg | undefined
      registrationName = ind ? `${ind.firstName} ${ind.lastName}` : 'Unknown Individual'
    }

    return {
      coupon: {
        code: coupon?.code,
        name: coupon?.name,
        discountType: coupon?.discountType,
        discountValue: coupon ? Number(coupon.discountValue) : 0,
      },
      registrationType: r.registrationType,
      registrationName,
      discountApplied: Number(r.discountApplied),
      redeemedAt: r.redeemedAt,
    }
  })

  type CouponResultType = { registrationType: string; redeemedAt: Date }
  // Apply filters
  if (config.filters?.registrationType?.length > 0) {
    results = results.filter((r: CouponResultType) => config.filters.registrationType.includes(r.registrationType))
  }
  if (config.filters?.dateRange?.start) {
    results = results.filter((r: CouponResultType) => new Date(r.redeemedAt) >= new Date(config.filters.dateRange.start))
  }
  if (config.filters?.dateRange?.end) {
    results = results.filter((r: CouponResultType) => new Date(r.redeemedAt) <= new Date(config.filters.dateRange.end))
  }

  if (config.groupBy) {
    return groupResults(results, config.groupBy)
  }

  return filterFields(results, config.fields)
}

// ============================================
// LEGACY: BALANCES REPORT
// ============================================
async function executeBalancesReport(eventId: string, config: any) {
  const groupRegs = await prisma.groupRegistration.findMany({
    where: { eventId },
    include: { participants: true },
  })

  const groupIds = groupRegs.map((g: { id: string }) => g.id)
  const balances = await prisma.paymentBalance.findMany({
    where: { registrationId: { in: groupIds }, registrationType: 'group' },
  })
  const balanceMap = new Map(balances.map((b: { registrationId: string }) => [b.registrationId, b]))

  type BalanceType = {
    totalAmountDue: number | { toNumber(): number }
    amountPaid: number | { toNumber(): number }
    amountRemaining: number | { toNumber(): number }
    paymentStatus: string
    lastPaymentDate: Date | null
  }

  let results = groupRegs.map((group: typeof groupRegs[number]) => {
    const balance = balanceMap.get(group.id) as BalanceType | undefined
    return {
      groupId: group.id,
      groupName: group.groupName,
      parishName: group.parishName,
      groupLeaderName: group.groupLeaderName,
      groupLeaderEmail: group.groupLeaderEmail,
      groupLeaderPhone: group.groupLeaderPhone,
      participantCount: group.participants.length,
      totalDue: balance ? Number(balance.totalAmountDue) : 0,
      amountPaid: balance ? Number(balance.amountPaid) : 0,
      amountRemaining: balance ? Number(balance.amountRemaining) : 0,
      paymentStatus: balance?.paymentStatus || 'unpaid',
      lastPaymentDate: balance?.lastPaymentDate,
    }
  })

  if (config.filters?.paymentStatus) {
    results = results.filter((g: { paymentStatus: string }) => g.paymentStatus === config.filters.paymentStatus)
  }

  return filterFields(results, config.fields)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSortOrder(sortBy: string | undefined, sortDirection: 'asc' | 'desc' = 'asc') {
  if (!sortBy) return undefined

  // Handle nested paths
  if (sortBy.includes('.')) {
    const parts = sortBy.split('.')
    let orderBy: any = { [parts[parts.length - 1]]: sortDirection }
    for (let i = parts.length - 2; i >= 0; i--) {
      orderBy = { [parts[i]]: orderBy }
    }
    return orderBy
  }

  return { [sortBy]: sortDirection }
}

function groupResults(data: any[], groupBy: string) {
  if (!groupBy || groupBy === 'none') return data

  const grouped = new Map<string, any>()

  data.forEach(item => {
    let groupKey = getNestedValue(item, groupBy) || 'Other'
    if (typeof groupKey !== 'string') groupKey = String(groupKey)

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        groupKey,
        items: [],
      })
    }
    grouped.get(groupKey).items.push(item)
  })

  return Array.from(grouped.values())
}

function groupParticipants(participants: any[], groupBy: string) {
  if (!groupBy || groupBy === 'none') return participants

  const grouped = new Map<string, any>()

  participants.forEach(p => {
    let groupKey = ''
    let groupInfo: any = {}

    switch (groupBy) {
      case 'group':
        groupKey = p.groupRegistration?.groupName || 'No Group'
        groupInfo = {
          groupName: p.groupRegistration?.groupName,
          parishName: p.groupRegistration?.parishName,
          groupLeaderName: p.groupRegistration?.groupLeaderName,
          groupLeaderEmail: p.groupRegistration?.groupLeaderEmail,
          accessCode: p.groupRegistration?.accessCode,
        }
        break
      case 'participantType':
        groupKey = p.participantType || 'Unknown'
        groupInfo = { participantType: p.participantType }
        break
      case 'gender':
        groupKey = p.gender || 'Unknown'
        groupInfo = { gender: p.gender }
        break
      case 'housingType':
        groupKey = p.groupRegistration?.housingType || 'Unknown'
        groupInfo = { housingType: p.groupRegistration?.housingType }
        break
      default:
        groupKey = 'All'
    }

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        groupKey,
        ...groupInfo,
        participants: [],
      })
    }
    grouped.get(groupKey).participants.push(p)
  })

  return Array.from(grouped.values())
}

function filterFields(data: any[], fields: string[] | undefined) {
  if (!fields || fields.length === 0) return data

  return data.map(item => {
    const filtered: any = {}
    fields.forEach(field => {
      const value = getNestedValue(item, field)
      setNestedValue(filtered, field.split('.'), value)
    })
    return filtered
  })
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

function setNestedValue(obj: any, path: string[], value: any) {
  const lastKey = path[path.length - 1]

  if (path.length === 1) {
    obj[lastKey] = value
    return
  }

  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = {}
    }
    current = current[path[i]]
  }
  current[lastKey] = value
}
