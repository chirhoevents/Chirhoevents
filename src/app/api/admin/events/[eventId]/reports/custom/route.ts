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
      case 'custom':
        reportData = await executeCustomReport(eventId, config)
        break
      default:
        return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 })
    }

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

async function executeTShirtReport(eventId: string, config: any) {
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
    totalCount: participants.length + individualRegs.length,
  }
}

async function executeBalancesReport(eventId: string, config: any) {
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
  const filtered = forms.filter(f => {
    if (config.filters?.onlyAllergies && (!f.allergies || f.allergies === '')) return false
    if (config.filters?.onlyMedications && (!f.medications || f.medications === '')) return false
    if (config.filters?.onlyConditions && (!f.medicalConditions || f.medicalConditions === '')) return false
    return true
  })

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
