import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// POST execute a report template with dynamic parameters
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { templateId } = params
    const body = await request.json()
    const { eventId, dateRange, additionalFilters } = body

    // Get the template
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify user has access
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId, organizationId: template.organizationId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!template.isPublic && template.createdByUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Execute the report based on type
    const config = template.configuration as any
    let reportData: any

    switch (template.reportType) {
      case 'registration':
        reportData = await executeRegistrationReport(eventId, config, additionalFilters)
        break
      case 'financial':
        reportData = await executeFinancialReport(eventId, config, additionalFilters)
        break
      case 'tshirts':
        reportData = await executeTShirtReport(eventId, config, additionalFilters)
        break
      case 'balances':
        reportData = await executeBalancesReport(eventId, config, additionalFilters)
        break
      case 'medical':
        reportData = await executeMedicalReport(eventId, config, additionalFilters)
        break
      case 'roster':
        reportData = await executeRosterReport(eventId, config, additionalFilters)
        break
      case 'custom':
        reportData = await executeCustomReport(eventId, config, additionalFilters)
        break
      default:
        return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 })
    }

    return NextResponse.json({
      reportType: template.reportType, // Add at root level for conditional rendering
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        reportType: template.reportType,
      },
      data: reportData,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error executing report template:', error)
    return NextResponse.json({ error: 'Failed to execute report' }, { status: 500 })
  }
}

// Helper functions to execute different report types
async function executeRegistrationReport(eventId: string, config: any, filters: any) {
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

async function executeFinancialReport(eventId: string, config: any, filters: any) {
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

async function executeTShirtReport(eventId: string, config: any, filters: any) {
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
  })

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
  })

  // Aggregate by size
  const sizeCounts: Record<string, number> = {}
  participants.forEach(p => {
    if (p.tShirtSize) {
      sizeCounts[p.tShirtSize] = (sizeCounts[p.tShirtSize] || 0) + 1
    }
  })
  individualRegs.forEach(i => {
    if (i.tShirtSize) {
      sizeCounts[i.tShirtSize] = (sizeCounts[i.tShirtSize] || 0) + 1
    }
  })

  return {
    participants: filterFields(participants, config.fields?.participants),
    individualRegs: filterFields(individualRegs, config.fields?.individuals),
    sizeCounts,
  }
}

async function executeBalancesReport(eventId: string, config: any, filters: any) {
  const groupRegs = await prisma.groupRegistration.findMany({
    where: { eventId },
    include: {
      participants: true,
    },
  })

  const groupIds = groupRegs.map(g => g.id)
  const paymentBalances = await prisma.paymentBalance.findMany({
    where: {
      registrationId: { in: groupIds },
      registrationType: 'group',
    },
  })

  const balanceMap = new Map(paymentBalances.map(pb => [pb.registrationId, pb]))

  const groupBalances = groupRegs.map(group => {
    const balance = balanceMap.get(group.id)
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

  // Filter by payment status if specified
  const filtered = config.filters?.paymentStatus
    ? groupBalances.filter(g => g.paymentStatus === config.filters.paymentStatus)
    : groupBalances

  return filterFields(filtered, config.fields)
}

async function executeMedicalReport(eventId: string, config: any, filters: any) {
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
  const filtered = forms.filter(f => {
    if (config.filters?.onlyAllergies && (!f.allergies || f.allergies === '')) return false
    if (config.filters?.onlyMedications && (!f.medications || f.medications === '')) return false
    if (config.filters?.onlyConditions && (!f.medicalConditions || f.medicalConditions === '')) return false
    return true
  })

  return filterFields(filtered, config.fields)
}

async function executeRosterReport(eventId: string, config: any, filters: any) {
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

  // Fetch participants with comprehensive data
  const participants = await prisma.participant.findMany({
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
      liabilityForm: {
        select: {
          allergies: true,
          medications: true,
          medicalConditions: true,
          dietaryRestrictions: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelationship: true,
        },
      },
      housingAssignment: {
        select: {
          roomNumber: true,
          buildingName: true,
        },
      },
    },
    orderBy: config.filters?.sortBy === 'firstName' ? { firstName: 'asc' } :
              config.filters?.sortBy === 'age' ? { age: 'asc' } :
              { lastName: 'asc' },
  })

  // Apply additional filters
  let filtered = participants

  if (config.filters?.groupIds && config.filters.groupIds.length > 0) {
    filtered = filtered.filter(p => config.filters.groupIds.includes(p.groupRegistration?.id))
  }

  if (config.filters?.parishes && config.filters.parishes.length > 0) {
    filtered = filtered.filter(p => config.filters.parishes.includes(p.groupRegistration?.parishName))
  }

  if (config.filters?.housingTypes && config.filters.housingTypes.length > 0) {
    filtered = filtered.filter(p => config.filters.housingTypes.includes(p.groupRegistration?.housingType))
  }

  if (config.filters?.onlyWithMedicalNeeds) {
    filtered = filtered.filter(p =>
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

    filtered.forEach(p => {
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

    filtered.forEach(p => {
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

async function executeCustomReport(eventId: string, config: any, filters: any) {
  // For fully custom reports, execute based on the configuration
  // This is a flexible query builder based on config.query

  const modelName = config.query?.model || 'groupRegistration'
  const includeRelations = config.query?.include || {}
  const whereClause = { ...config.query?.where, eventId }

  // Execute dynamic query (simplified version)
  // In production, you'd want more robust validation and security
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
  const secondLast = path[path.length - 2]

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
