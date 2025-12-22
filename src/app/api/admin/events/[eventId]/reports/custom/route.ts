import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// POST execute a custom report without saving as template
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = params
    const body = await request.json()
    const { configuration } = body

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration required' }, { status: 400 })
    }

    // Verify user has access to this event
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Execute the report based on type
    const config = configuration
    const reportType = config.reportType || 'registration'
    console.log('Executing report type:', reportType, 'with config:', JSON.stringify(config))
    let reportData: any

    switch (reportType) {
      case 'registration':
        reportData = await executeRegistrationReport(eventId, config)
        break
      case 'financial':
        reportData = await executeFinancialReport(eventId, config)
        break
      case 'tshirts':
        reportData = await executeTShirtReport(eventId, config)
        break
      case 'balances':
        reportData = await executeBalancesReport(eventId, config)
        break
      case 'medical':
        reportData = await executeMedicalReport(eventId, config)
        break
      case 'roster':
        reportData = await executeRosterReport(eventId, config)
        break
      case 'custom':
        reportData = await executeCustomReport(eventId, config)
        break
      default:
        return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 })
    }

    console.log('Report data generated:', reportType, 'rows:', Array.isArray(reportData) ? reportData.length : typeof reportData)

    return NextResponse.json({
      reportType,
      data: reportData,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error executing custom report:', error)
    return NextResponse.json({ error: 'Failed to execute report' }, { status: 500 })
  }
}

// Helper functions to execute different report types
async function executeRegistrationReport(eventId: string, config: any) {
  const where: any = { eventId }

  // Apply filters from config
  if (config.filters?.housingType) {
    where.housingType = config.filters.housingType
  }
  if (config.filters?.registrationStatus) {
    where.registrationStatus = config.filters.registrationStatus
  }

  const groupRegistrations = await prisma.groupRegistration.findMany({
    where,
    include: {
      participants: config.includeParticipants !== false,
    },
    orderBy: config.sortBy || { createdAt: 'desc' },
  })

  // Filter fields based on config
  return filterFields(groupRegistrations, config.fields)
}

async function executeFinancialReport(eventId: string, config: any) {
  // Fetch payments and balances
  const payments = await prisma.payment.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
  })

  const paymentBalances = await prisma.paymentBalance.findMany({
    where: { eventId },
  })

  return {
    payments: filterFields(payments, config.fields?.payments),
    balances: filterFields(paymentBalances, config.fields?.balances),
  }
}

interface ParticipantWithSize {
  id: string
  firstName: string | null
  lastName: string | null
  tShirtSize: string | null
  participantType: string | null
  groupRegistration: { groupName: string | null; parishName: string | null } | null
}

interface IndividualWithSize {
  id: string
  firstName: string | null
  lastName: string | null
  tShirtSize: string | null
  age: number | null
}

async function executeTShirtReport(eventId: string, config: { filters?: { onlyWithSizes?: boolean }; fields?: { participants?: string[]; individuals?: string[] } }) {
  const participants = await prisma.participant.findMany({
    where: {
      groupRegistration: { eventId },
      tShirtSize: config.filters?.onlyWithSizes ? { not: null } : undefined,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tShirtSize: true,
      participantType: true,
      groupRegistration: {
        select: {
          groupName: true,
          parishName: true,
        },
      },
    },
  }) as ParticipantWithSize[]

  const individualRegs = await prisma.individualRegistration.findMany({
    where: {
      eventId,
      tShirtSize: config.filters?.onlyWithSizes ? { not: null } : undefined,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tShirtSize: true,
      age: true,
    },
  }) as IndividualWithSize[]

  // Aggregate by size
  const sizeCounts: Record<string, number> = {}
  participants.forEach((p: ParticipantWithSize) => {
    if (p.tShirtSize) {
      sizeCounts[p.tShirtSize] = (sizeCounts[p.tShirtSize] || 0) + 1
    }
  })
  individualRegs.forEach((i: IndividualWithSize) => {
    if (i.tShirtSize) {
      sizeCounts[i.tShirtSize] = (sizeCounts[i.tShirtSize] || 0) + 1
    }
  })

  return {
    participants: filterFields(participants, config.fields?.participants),
    individualRegs: filterFields(individualRegs, config.fields?.individuals),
    sizeCounts,
    totalCount: participants.length + individualRegs.length,
  }
}

async function executeBalancesReport(eventId: string, config: any) {
  // Get group registrations
  const groupRegs = await prisma.groupRegistration.findMany({
    where: { eventId },
    include: {
      participants: true,
    },
  })

  const groupIds = groupRegs.map((g: { id: string }) => g.id)
  const groupPaymentBalances = await prisma.paymentBalance.findMany({
    where: {
      registrationId: { in: groupIds },
      registrationType: 'group',
    },
  })

  const groupBalanceMap = new Map(groupPaymentBalances.map((pb: { registrationId: string }) => [pb.registrationId, pb]))

  const groupBalances = groupRegs.map((group: any) => {
    const balance: any = groupBalanceMap.get(group.id)
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
      _type: 'group',
    }
  })

  // Get individual registrations
  const individualRegs = await prisma.individualRegistration.findMany({
    where: { eventId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })

  const individualIds = individualRegs.map((i: { id: string }) => i.id)
  const individualPaymentBalances = await prisma.paymentBalance.findMany({
    where: {
      registrationId: { in: individualIds },
      registrationType: 'individual',
    },
  })

  const individualBalanceMap = new Map(individualPaymentBalances.map((pb: { registrationId: string }) => [pb.registrationId, pb]))

  const individualBalances = individualRegs.map((individual: any) => {
    const balance: any = individualBalanceMap.get(individual.id)
    return {
      groupId: individual.id,
      groupName: `${individual.firstName} ${individual.lastName}`,
      parishName: 'Individual Registration',
      groupLeaderName: `${individual.firstName} ${individual.lastName}`,
      groupLeaderEmail: individual.email,
      groupLeaderPhone: individual.phone,
      participantCount: 1,
      totalDue: balance ? Number(balance.totalAmountDue) : 0,
      amountPaid: balance ? Number(balance.amountPaid) : 0,
      amountRemaining: balance ? Number(balance.amountRemaining) : 0,
      paymentStatus: balance?.paymentStatus || 'unpaid',
      lastPaymentDate: balance?.lastPaymentDate,
      _type: 'individual',
    }
  })

  // Combine both arrays
  const allBalances = [...groupBalances, ...individualBalances]

  // Filter by payment status if specified
  const filtered = config.filters?.paymentStatus
    ? allBalances.filter(g => g.paymentStatus === config.filters.paymentStatus)
    : allBalances

  return filterFields(filtered, config.fields)
}

async function executeMedicalReport(eventId: string, config: any) {
  const forms = await prisma.liabilityForm.findMany({
    where: {
      participant: {
        groupRegistration: { eventId },
      },
    },
    include: {
      participant: {
        select: {
          firstName: true,
          lastName: true,
          groupRegistration: {
            select: {
              groupName: true,
              parishName: true,
              groupLeaderEmail: true,
              groupLeaderPhone: true,
            },
          },
        },
      },
    },
  })

  // Filter based on what medical info is requested
  const filtered = forms.filter((f: any) => {
    if (config.filters?.onlyAllergies && (!f.allergies || f.allergies === '')) return false
    if (config.filters?.onlyMedications && (!f.medications || f.medications === '')) return false
    if (config.filters?.onlyConditions && (!f.medicalConditions || f.medicalConditions === '')) return false
    return true
  })

  return filterFields(filtered, config.fields)
}

async function executeRosterReport(eventId: string, config: any) {
  // Build participant query filters
  const participantWhere: any = {
    groupRegistration: { eventId },
  }

  // Apply filters
  if (config.filters?.participantTypes && config.filters.participantTypes.length > 0) {
    participantWhere.participantType = { in: config.filters.participantTypes }
  }

  if (config.filters?.minAge) {
    participantWhere.age = { ...participantWhere.age, gte: config.filters.minAge }
  }
  if (config.filters?.maxAge) {
    participantWhere.age = { ...participantWhere.age, lte: config.filters.maxAge }
  }

  if (config.filters?.tShirtSizes && config.filters.tShirtSizes.length > 0) {
    participantWhere.tShirtSize = { in: config.filters.tShirtSizes }
  }

  // Fetch group participants with comprehensive data
  const participantsRaw = await prisma.participant.findMany({
    where: participantWhere,
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
          registrationStatus: true,
        },
      },
      liabilityForms: {
        select: {
          allergies: true,
          medications: true,
          medicalConditions: true,
          dietaryRestrictions: true,
          emergencyContact1Name: true,
          emergencyContact1Phone: true,
          emergencyContact1Relation: true,
        },
        take: 1, // Get only the first liability form
      },
    },
    orderBy: config.filters?.sortBy === 'firstName' ? { firstName: 'asc' } :
              config.filters?.sortBy === 'age' ? { age: 'asc' } :
              { lastName: 'asc' },
  })

  // Build individual registration query filters
  const individualWhere: any = { eventId }

  if (config.filters?.minAge) {
    individualWhere.age = { ...individualWhere.age, gte: config.filters.minAge }
  }
  if (config.filters?.maxAge) {
    individualWhere.age = { ...individualWhere.age, lte: config.filters.maxAge }
  }

  if (config.filters?.tShirtSizes && config.filters.tShirtSizes.length > 0) {
    individualWhere.tShirtSize = { in: config.filters.tShirtSizes }
  }

  // Fetch individual registrations
  const individualRegs = await prisma.individualRegistration.findMany({
    where: individualWhere,
    include: {
      liabilityForms: {
        select: {
          allergies: true,
          medications: true,
          medicalConditions: true,
          dietaryRestrictions: true,
        },
        take: 1,
      },
    },
    orderBy: config.filters?.sortBy === 'firstName' ? { firstName: 'asc' } :
              config.filters?.sortBy === 'age' ? { age: 'asc' } :
              { lastName: 'asc' },
  })

  // Transform group participants - liabilityForms array to single liabilityForm object
  const groupParticipants = participantsRaw.map((p: any) => ({
    ...p,
    liabilityForm: p.liabilityForms?.[0] || null,
  }))

  // Transform individual registrations to match participant structure
  const individualParticipants = individualRegs.map((ind: any) => ({
    id: ind.id,
    firstName: ind.firstName,
    lastName: ind.lastName,
    preferredName: ind.preferredName,
    age: ind.age,
    gender: ind.gender,
    tShirtSize: ind.tShirtSize,
    participantType: null, // Individual registrations don't have participantType
    groupRegistration: null, // No group for individual registrations
    liabilityForm: {
      // Emergency contacts are on IndividualRegistration model directly
      emergencyContact1Name: ind.emergencyContact1Name,
      emergencyContact1Phone: ind.emergencyContact1Phone,
      emergencyContact1Relation: ind.emergencyContact1Relation,
      // Medical info comes from their liability form if exists
      allergies: ind.liabilityForms?.[0]?.allergies || null,
      medications: ind.liabilityForms?.[0]?.medications || null,
      medicalConditions: ind.liabilityForms?.[0]?.medicalConditions || null,
      dietaryRestrictions: ind.liabilityForms?.[0]?.dietaryRestrictions || null,
    },
    _isIndividual: true, // Flag to identify individual registrations
  }))

  // Combine both arrays
  const participants = [...groupParticipants, ...individualParticipants]

  // Apply additional filters
  let filtered = participants

  if (config.filters?.groupIds && config.filters.groupIds.length > 0) {
    filtered = filtered.filter((p: any) => config.filters.groupIds.includes(p.groupRegistration?.id))
  }

  if (config.filters?.parishes && config.filters.parishes.length > 0) {
    filtered = filtered.filter((p: any) => config.filters.parishes.includes(p.groupRegistration?.parishName))
  }

  if (config.filters?.housingTypes && config.filters.housingTypes.length > 0) {
    filtered = filtered.filter((p: any) => config.filters.housingTypes.includes(p.groupRegistration?.housingType))
  }

  if (config.filters?.onlyWithMedicalNeeds) {
    filtered = filtered.filter((p: any) =>
      p.liabilityForm && (
        (p.liabilityForm.allergies && p.liabilityForm.allergies !== '') ||
        (p.liabilityForm.medications && p.liabilityForm.medications !== '') ||
        (p.liabilityForm.medicalConditions && p.liabilityForm.medicalConditions !== '')
      )
    )
  }

  // Group data if requested
  if (config.filters?.groupBy === 'group') {
    const groupedData = new Map<string, any>()

    filtered.forEach((p: any) => {
      const groupId = p.groupRegistration?.id || 'no-group'
      const groupName = p.groupRegistration?.groupName || 'Individual Registrations'

      if (!groupedData.has(groupId)) {
        groupedData.set(groupId, {
          groupId,
          groupName,
          accessCode: p.groupRegistration?.accessCode,
          parishName: p.groupRegistration?.parishName,
          groupLeaderName: p.groupRegistration?.groupLeaderName,
          groupLeaderEmail: p.groupRegistration?.groupLeaderEmail,
          groupLeaderPhone: p.groupRegistration?.groupLeaderPhone,
          participants: [],
        })
      }

      groupedData.get(groupId).participants.push(p)
    })

    return Array.from(groupedData.values())
  } else if (config.filters?.groupBy === 'participantType') {
    const typeGroups = new Map<string, any>()

    filtered.forEach((p: any) => {
      const type = p.participantType || 'unknown'

      if (!typeGroups.has(type)) {
        typeGroups.set(type, {
          participantType: type,
          participants: [],
        })
      }

      typeGroups.get(type).participants.push(p)
    })

    return Array.from(typeGroups.values())
  } else if (config.filters?.groupBy === 'parish') {
    const parishGroups = new Map<string, any>()

    filtered.forEach(p => {
      const parish = p.groupRegistration?.parishName || 'Unknown Parish'

      if (!parishGroups.has(parish)) {
        parishGroups.set(parish, {
          parishName: parish,
          participants: [],
        })
      }

      parishGroups.get(parish).participants.push(p)
    })

    return Array.from(parishGroups.values())
  }

  return filterFields(filtered, config.fields)
}

async function executeCustomReport(eventId: string, config: any) {
  // For fully custom reports, execute based on the configuration
  const modelName = config.query?.model || 'groupRegistration'
  const includeRelations = config.query?.include || {}
  const whereClause = { ...config.query?.where, eventId }

  // Execute dynamic query (simplified version)
  const results = await (prisma as any)[modelName].findMany({
    where: whereClause,
    include: includeRelations,
    orderBy: config.query?.orderBy || { createdAt: 'desc' },
  })

  return filterFields(results, config.fields)
}

// Helper to filter fields from results
function filterFields(data: any[], fields: string[] | undefined) {
  if (!fields || fields.length === 0) return data

  return data.map(item => {
    const filtered: any = {}
    fields.forEach(field => {
      if (field.includes('.')) {
        // Handle nested fields like "groupRegistration.groupName"
        const parts = field.split('.')
        let value = item
        for (const part of parts) {
          value = value?.[part]
        }
        setNestedValue(filtered, parts, value)
      } else {
        filtered[field] = item[field]
      }
    })
    return filtered
  })
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
