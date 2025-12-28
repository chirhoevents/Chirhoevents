import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'daily-summary'

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Verify event exists and belongs to user's org
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(user.role !== 'master_admin' ? { organizationId: user.organizationId } : {}),
      },
      include: {
        organization: {
          select: { name: true, logoUrl: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Log access
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'generate_report',
        resourceType: 'report',
        details: `Generated ${reportType} report`,
      },
    })

    switch (reportType) {
      case 'daily-summary':
        return generateDailySummary(event)
      case 'allergy-list':
        return generateAllergyList(event)
      case 'medication-list':
        return generateMedicationList(event)
      case 'critical-list':
        return generateCriticalList(event)
      case 'incident-summary':
        return generateIncidentSummary(event, searchParams)
      case 'insurance-list':
        return generateInsuranceList(event)
      default:
        return NextResponse.json(
          { message: 'Invalid report type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to generate report:', error)
    return NextResponse.json(
      { message: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function generateDailySummary(event: any) {
  // Get all participants with medical info
  const forms = await prisma.liabilityForm.findMany({
    where: {
      eventId: event.id,
      completed: true,
      OR: [
        { allergies: { not: null }, NOT: { allergies: '' } },
        { medicalConditions: { not: null }, NOT: { medicalConditions: '' } },
        { medications: { not: null }, NOT: { medications: '' } },
        { adaAccommodations: { not: null }, NOT: { adaAccommodations: '' } },
      ],
    },
    include: {
      groupRegistration: {
        select: { groupName: true },
      },
    },
    orderBy: [{ participantLastName: 'asc' }],
  })

  // Get active incidents
  const activeIncidents = await prisma.medicalIncident.findMany({
    where: {
      eventId: event.id,
      status: { not: 'resolved' },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get participant names for incidents
  const participantIds = activeIncidents
    .map((i) => i.participantId)
    .filter((id): id is string => id !== null)
  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds } },
  })
  const participantMap = new Map(participants.map((p) => [p.id, `${p.firstName} ${p.lastName}`]))

  const report = {
    title: 'Daily Medical Summary',
    event: {
      name: event.name,
      dates: `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`,
      organization: event.organization.name,
    },
    generatedAt: new Date().toISOString(),
    summary: {
      totalWithMedicalNeeds: forms.length,
      severeAllergies: forms.filter(
        (f) =>
          f.allergies?.toLowerCase().includes('epi') ||
          f.allergies?.toLowerCase().includes('severe')
      ).length,
      activeIncidents: activeIncidents.length,
    },
    participants: forms.map((f) => ({
      name: `${f.participantFirstName} ${f.participantLastName}`,
      age: f.participantAge,
      group: f.groupRegistration?.groupName || 'Individual',
      allergies: f.allergies,
      conditions: f.medicalConditions,
      medications: f.medications,
      ada: f.adaAccommodations,
      isSevere:
        f.allergies?.toLowerCase().includes('epi') ||
        f.allergies?.toLowerCase().includes('severe'),
    })),
    activeIncidents: activeIncidents.map((i) => ({
      participantName: i.participantId ? participantMap.get(i.participantId) || 'Unknown' : 'Unknown',
      type: i.incidentType,
      severity: i.severity,
      status: i.status,
      time: i.incidentTime,
      nextCheck: i.nextCheckTime,
    })),
  }

  return NextResponse.json(report)
}

async function generateAllergyList(event: any) {
  const forms = await prisma.liabilityForm.findMany({
    where: {
      eventId: event.id,
      completed: true,
      allergies: { not: null },
      NOT: { allergies: '' },
    },
    include: {
      groupRegistration: {
        select: { groupName: true },
      },
    },
    orderBy: [{ participantLastName: 'asc' }],
  })

  // Categorize allergies
  const allergyCategories: Record<string, any[]> = {
    'Peanut Allergies': [],
    'Tree Nut Allergies': [],
    'Shellfish Allergies': [],
    'Dairy Allergies': [],
    'Gluten/Celiac': [],
    'Egg Allergies': [],
    'Other Allergies': [],
  }

  forms.forEach((f) => {
    const allergies = f.allergies?.toLowerCase() || ''
    const participant = {
      name: `${f.participantFirstName} ${f.participantLastName}`,
      age: f.participantAge,
      group: f.groupRegistration?.groupName || 'Individual',
      allergies: f.allergies,
      isSevere: allergies.includes('epi') || allergies.includes('severe'),
    }

    if (allergies.includes('peanut')) {
      allergyCategories['Peanut Allergies'].push(participant)
    }
    if (allergies.includes('tree nut') || allergies.includes('treenut') || allergies.includes('walnut') || allergies.includes('almond') || allergies.includes('cashew')) {
      allergyCategories['Tree Nut Allergies'].push(participant)
    }
    if (allergies.includes('shellfish') || allergies.includes('shrimp') || allergies.includes('crab') || allergies.includes('lobster')) {
      allergyCategories['Shellfish Allergies'].push(participant)
    }
    if (allergies.includes('dairy') || allergies.includes('milk') || allergies.includes('lactose')) {
      allergyCategories['Dairy Allergies'].push(participant)
    }
    if (allergies.includes('gluten') || allergies.includes('celiac') || allergies.includes('wheat')) {
      allergyCategories['Gluten/Celiac'].push(participant)
    }
    if (allergies.includes('egg')) {
      allergyCategories['Egg Allergies'].push(participant)
    }
    // Add to other if not categorized
    const categorized =
      allergies.includes('peanut') ||
      allergies.includes('tree nut') ||
      allergies.includes('treenut') ||
      allergies.includes('walnut') ||
      allergies.includes('almond') ||
      allergies.includes('cashew') ||
      allergies.includes('shellfish') ||
      allergies.includes('shrimp') ||
      allergies.includes('crab') ||
      allergies.includes('lobster') ||
      allergies.includes('dairy') ||
      allergies.includes('milk') ||
      allergies.includes('lactose') ||
      allergies.includes('gluten') ||
      allergies.includes('celiac') ||
      allergies.includes('wheat') ||
      allergies.includes('egg')
    if (!categorized) {
      allergyCategories['Other Allergies'].push(participant)
    }
  })

  return NextResponse.json({
    title: 'Allergy Master List',
    event: {
      name: event.name,
      organization: event.organization.name,
    },
    generatedAt: new Date().toISOString(),
    totalWithAllergies: forms.length,
    categories: allergyCategories,
  })
}

async function generateMedicationList(event: any) {
  const forms = await prisma.liabilityForm.findMany({
    where: {
      eventId: event.id,
      completed: true,
      medications: { not: null },
      NOT: { medications: '' },
    },
    include: {
      groupRegistration: {
        select: { groupName: true },
      },
    },
    orderBy: [{ participantLastName: 'asc' }],
  })

  return NextResponse.json({
    title: 'Medication Administration List',
    event: {
      name: event.name,
      organization: event.organization.name,
    },
    generatedAt: new Date().toISOString(),
    totalWithMedications: forms.length,
    participants: forms.map((f) => ({
      name: `${f.participantFirstName} ${f.participantLastName}`,
      age: f.participantAge,
      group: f.groupRegistration?.groupName || 'Individual',
      medications: f.medications,
      conditions: f.medicalConditions,
    })),
  })
}

async function generateCriticalList(event: any) {
  const forms = await prisma.liabilityForm.findMany({
    where: {
      eventId: event.id,
      completed: true,
      OR: [
        { allergies: { contains: 'epi', mode: 'insensitive' } },
        { allergies: { contains: 'severe', mode: 'insensitive' } },
        { allergies: { contains: 'anaphyl', mode: 'insensitive' } },
        { medicalConditions: { contains: 'diabetes', mode: 'insensitive' } },
        { medicalConditions: { contains: 'seizure', mode: 'insensitive' } },
        { medicalConditions: { contains: 'epilepsy', mode: 'insensitive' } },
        { medicalConditions: { contains: 'asthma', mode: 'insensitive' } },
        { adaAccommodations: { not: null }, NOT: { adaAccommodations: '' } },
      ],
    },
    include: {
      groupRegistration: {
        select: { groupName: true },
      },
    },
    orderBy: [{ participantLastName: 'asc' }],
  })

  return NextResponse.json({
    title: 'Critical Participants List',
    event: {
      name: event.name,
      organization: event.organization.name,
    },
    generatedAt: new Date().toISOString(),
    notice: 'CONFIDENTIAL MEDICAL INFORMATION - For authorized medical staff only',
    totalCritical: forms.length,
    participants: forms.map((f) => ({
      name: `${f.participantFirstName} ${f.participantLastName}`,
      age: f.participantAge,
      gender: f.participantGender,
      group: f.groupRegistration?.groupName || 'Individual',
      allergies: f.allergies,
      conditions: f.medicalConditions,
      medications: f.medications,
      ada: f.adaAccommodations,
      emergencyContact1: {
        name: f.emergencyContact1Name,
        phone: f.emergencyContact1Phone,
        relation: f.emergencyContact1Relation,
      },
      emergencyContact2: {
        name: f.emergencyContact2Name,
        phone: f.emergencyContact2Phone,
        relation: f.emergencyContact2Relation,
      },
    })),
  })
}

async function generateIncidentSummary(event: any, searchParams: URLSearchParams) {
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const whereClause: any = { eventId: event.id }
  if (dateFrom || dateTo) {
    whereClause.incidentDate = {}
    if (dateFrom) whereClause.incidentDate.gte = new Date(dateFrom)
    if (dateTo) whereClause.incidentDate.lte = new Date(dateTo)
  }

  const incidents = await prisma.medicalIncident.findMany({
    where: whereClause,
    orderBy: [{ incidentDate: 'desc' }, { incidentTime: 'desc' }],
  })

  // Get participant names
  const participantIds = incidents.map((i) => i.participantId).filter((id): id is string => id !== null)
  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds } },
    include: {
      groupRegistration: { select: { groupName: true } },
    },
  })
  const participantMap = new Map(
    participants.map((p) => [p.id, { name: `${p.firstName} ${p.lastName}`, group: p.groupRegistration.groupName }])
  )

  // Stats
  const stats = {
    total: incidents.length,
    byType: {} as Record<string, number>,
    bySeverity: { minor: 0, moderate: 0, severe: 0 },
    byStatus: { active: 0, monitoring: 0, resolved: 0 },
    hospitalizations: incidents.filter((i) => i.sentToHospital).length,
    ambulanceCalls: incidents.filter((i) => i.ambulanceCalled).length,
  }

  incidents.forEach((i) => {
    stats.byType[i.incidentType] = (stats.byType[i.incidentType] || 0) + 1
    stats.bySeverity[i.severity]++
    stats.byStatus[i.status]++
  })

  return NextResponse.json({
    title: 'Medical Incident Summary Report',
    event: {
      name: event.name,
      organization: event.organization.name,
    },
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: dateFrom || 'Event start',
      to: dateTo || 'Present',
    },
    stats,
    incidents: incidents.map((i) => {
      const pInfo = i.participantId ? participantMap.get(i.participantId) : null
      return {
        date: i.incidentDate,
        time: i.incidentTime,
        participantName: pInfo?.name || 'Unknown',
        groupName: pInfo?.group || 'Unknown',
        type: i.incidentType,
        severity: i.severity,
        status: i.status,
        description: i.description,
        treatment: i.treatmentProvided,
        staffName: i.staffMemberName,
        parentContacted: i.parentContacted,
        ambulanceCalled: i.ambulanceCalled,
        hospitalized: i.sentToHospital,
        disposition: i.participantDisposition,
        resolvedAt: i.resolvedAt,
      }
    }),
  })
}

async function generateInsuranceList(event: any) {
  const forms = await prisma.liabilityForm.findMany({
    where: {
      eventId: event.id,
      completed: true,
    },
    include: {
      groupRegistration: {
        select: { groupName: true },
      },
    },
    orderBy: [{ participantLastName: 'asc' }],
  })

  return NextResponse.json({
    title: 'Insurance Information List',
    event: {
      name: event.name,
      organization: event.organization.name,
    },
    generatedAt: new Date().toISOString(),
    notice: 'CONFIDENTIAL - For emergency use only',
    participants: forms.map((f) => ({
      name: `${f.participantFirstName} ${f.participantLastName}`,
      age: f.participantAge,
      dob: f.participantAge
        ? `~${new Date().getFullYear() - f.participantAge}`
        : 'Unknown',
      group: f.groupRegistration?.groupName || 'Individual',
      insurance: {
        provider: f.insuranceProvider || 'Not provided',
        policyNumber: f.insurancePolicyNumber || 'Not provided',
        groupNumber: f.insuranceGroupNumber || 'N/A',
      },
      emergencyContact: {
        name: f.emergencyContact1Name,
        phone: f.emergencyContact1Phone,
        relation: f.emergencyContact1Relation,
      },
    })),
  })
}
