import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { generateParticipantQRCode, generateIndividualRegistrationQRCode } from '@/lib/qr-code'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) throw new Error('Unauthorized')

  const hasSalvePermission = hasPermission(user.role, 'salve.access')
  const hasCustomSalveAccess =
    user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true

  if (!hasSalvePermission && !hasCustomSalveAccess) {
    throw new Error('Access denied - SALVE portal access required')
  }

  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: user.organizationId },
    })
    if (!event) throw new Error('Access denied to this event')
  }

  return user
}

const DEFAULT_TEMPLATE = {
  size: 'standard',
  showName: true,
  showGroup: true,
  showParticipantType: true,
  showHousing: true,
  showDiocese: false,
  showMealColor: false,
  showQrCode: true,
  showConferenceHeader: true,
  conferenceHeaderText: '',
  showLogo: false,
  logoUrl: '',
  showHeaderBanner: false,
  headerBannerUrl: '',
  backgroundColor: '#FFFFFF',
  textColor: '#1E3A5F',
  accentColor: '#9C8466',
  fontFamily: 'sans-serif',
  fontSize: 'medium',
  thermalMode: false,
  showBackPanel: true,
  backPanelColorMode: 'color',
}

const MEAL_COLOR_HEX: Record<string, string> = {
  blue: '#3498db',
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#f1c40f',
  green: '#27ae60',
  purple: '#9b59b6',
  brown: '#8b4513',
  grey: '#95a5a6',
  gray: '#95a5a6',
}

function mealHex(color: string): string {
  return MEAL_COLOR_HEX[color.toLowerCase()] ?? '#6b7280'
}

function bedLetter(bedNumber: number | null): string | null {
  return bedNumber ? String.fromCharCode(64 + bedNumber) : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const body = await request.json()
    const {
      participantIds,
      groupId,
      registrationId,          // single individual/staff registration ID
      registrationType = 'group', // 'group' | 'individual' | 'staff'
      templateId,
    } = body

    // -----------------------------------------------------------------------
    // Load template
    // -----------------------------------------------------------------------
    let template = null
    if (templateId) {
      template = await prisma.nameTagTemplate.findFirst({ where: { id: templateId, eventId } })
    }
    if (!template) {
      template = await prisma.nameTagTemplate.findUnique({ where: { eventId } })
    }
    const templateConfig: any = template?.settingsJson || template || DEFAULT_TEMPLATE

    // -----------------------------------------------------------------------
    // Dispatch by registration type
    // -----------------------------------------------------------------------
    let nameTags: any[]

    if (registrationType === 'individual') {
      nameTags = await generateIndividualNameTags(eventId, participantIds, registrationId, templateConfig)
    } else if (registrationType === 'staff') {
      nameTags = await generateStaffNameTags(eventId, participantIds, registrationId, templateConfig)
    } else {
      // Default: group registrations
      nameTags = await generateGroupNameTags(eventId, participantIds, groupId, templateConfig)
    }

    if (nameTags.length === 0) {
      return NextResponse.json({ message: 'No participants found' }, { status: 404 })
    }

    // -----------------------------------------------------------------------
    // Event info for header
    // -----------------------------------------------------------------------
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        organization: { select: { name: true, logoUrl: true } },
      },
    })

    // -----------------------------------------------------------------------
    // Schedule data — only fetched when the template uses thermal_4x12
    // -----------------------------------------------------------------------
    let schedule: any[] = []
    if (templateConfig.size === 'thermal_4x12') {
      try {
        schedule = await prisma.porosScheduleEntry.findMany({
          where: { eventId },
          orderBy: [{ day: 'asc' }, { order: 'asc' }, { startTime: 'asc' }],
        })
      } catch {
        // Table may not exist for this org; silently return empty schedule
      }
    }

    return NextResponse.json({
      event: {
        name: event?.name,
        organizationName: event?.organization?.name,
        logoUrl: event?.organization?.logoUrl,
        dates: event
          ? `${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`
          : null,
      },
      template: templateConfig,
      nameTags,
      schedule,
      count: nameTags.length,
    })
  } catch (error: any) {
    console.error('Failed to generate name tags:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ message: 'Please sign in to generate name tags' }, { status: 401 })
    }
    if (error.message?.startsWith('Access denied')) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    return NextResponse.json({ message: 'Failed to generate name tags' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Group registration participants (existing behaviour)
// ---------------------------------------------------------------------------
async function generateGroupNameTags(
  eventId: string,
  participantIds: string[] | undefined,
  groupId: string | undefined,
  templateConfig: any
): Promise<any[]> {
  if (!participantIds?.length && !groupId) {
    throw new Error('Either participantIds or groupId is required for group registrations')
  }

  const where = participantIds?.length
    ? { id: { in: participantIds }, groupRegistration: { eventId } }
    : { groupRegistrationId: groupId, groupRegistration: { eventId } }

  const participants = await prisma.participant.findMany({
    where,
    include: { groupRegistration: { select: { groupName: true, dioceseName: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  if (participants.length === 0) return []

  const idList = participants.map((p: any) => p.id)
  const groupIds = [...new Set(participants.map((p: any) => p.groupRegistrationId))]

  const [roomAssignments, mealColorAssignments] = await Promise.all([
    prisma.roomAssignment.findMany({
      where: { participantId: { in: idList } },
      include: { room: { include: { building: { select: { name: true } } } } },
    }),
    prisma.mealColorAssignment.findMany({
      where: { groupRegistrationId: { in: groupIds } },
    }),
  ])

  const assignmentMap = new Map(
    roomAssignments.map((ra: any) => [
      ra.participantId,
      { buildingName: ra.room.building.name, roomNumber: ra.room.roomNumber, bedNumber: ra.bedNumber },
    ])
  )
  const mealColorMap = new Map(
    mealColorAssignments.map((mca: any) => [mca.groupRegistrationId, mca.color])
  )

  return Promise.all(
    participants.map(async (p: any) => {
      const assignment = assignmentMap.get(p.id) as any
      const bed = assignment ? bedLetter(assignment.bedNumber) : null
      const mealColor = mealColorMap.get(p.groupRegistrationId) as string | undefined

      let qrCode = p.qrCode
      if (!qrCode) {
        try {
          qrCode = await generateParticipantQRCode(p.id)
          prisma.participant
            .update({ where: { id: p.id }, data: { qrCode } })
            .catch(() => {})
        } catch {}
      }

      return {
        participantId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        groupName: p.groupRegistration.groupName,
        diocese: p.groupRegistration.dioceseName,
        participantType: p.participantType,
        isChaperone: p.participantType === 'chaperone',
        isClergy: p.participantType === 'priest',
        housing: assignment
          ? {
              building: assignment.buildingName,
              room: assignment.roomNumber,
              bed,
              fullLocation: `${assignment.buildingName} ${assignment.roomNumber}${bed ? ` - Bed ${bed}` : ''}`,
            }
          : null,
        mealColor: mealColor ? { name: mealColor, hex: mealHex(mealColor) } : null,
        qrCode: qrCode || null,
        template: templateConfig,
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Individual registrations
// ---------------------------------------------------------------------------
async function generateIndividualNameTags(
  eventId: string,
  participantIds: string[] | undefined,
  registrationId: string | undefined,
  templateConfig: any
): Promise<any[]> {
  const ids: string[] = registrationId
    ? [registrationId]
    : participantIds ?? []

  if (ids.length === 0) {
    throw new Error('Either registrationId or participantIds is required for individual registrations')
  }

  const registrations = await prisma.individualRegistration.findMany({
    where: { id: { in: ids }, eventId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return Promise.all(
    registrations.map(async (reg: any) => {
      let qrCode = reg.qrCode
      if (!qrCode) {
        try {
          const displayName = `${reg.firstName} ${reg.lastName}`
          qrCode = await generateIndividualRegistrationQRCode(reg.id, eventId, displayName)
          prisma.individualRegistration
            .update({ where: { id: reg.id }, data: { qrCode } })
            .catch(() => {})
        } catch {}
      }

      return {
        participantId: reg.id,
        firstName: reg.firstName,
        lastName: reg.lastName,
        fullName: `${reg.firstName} ${reg.lastName}`,
        groupName: 'Individual Registrant',
        diocese: null,
        participantType: 'individual',
        isChaperone: false,
        isClergy: false,
        housing: null,
        mealColor: null,
        qrCode: qrCode || null,
        template: templateConfig,
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Staff registrations
// ---------------------------------------------------------------------------
async function generateStaffNameTags(
  eventId: string,
  participantIds: string[] | undefined,
  registrationId: string | undefined,
  templateConfig: any
): Promise<any[]> {
  const ids: string[] = registrationId
    ? [registrationId]
    : participantIds ?? []

  if (ids.length === 0) {
    throw new Error('Either registrationId or participantIds is required for staff registrations')
  }

  const staffMembers = await prisma.staffRegistration.findMany({
    where: { id: { in: ids }, eventId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return Promise.all(
    staffMembers.map(async (staff: any) => {
      let qrCode = staff.qrCode
      if (!qrCode) {
        try {
          qrCode = await generateParticipantQRCode(staff.id)
          prisma.staffRegistration
            .update({ where: { id: staff.id }, data: { qrCode } })
            .catch(() => {})
        } catch {}
      }

      return {
        participantId: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        fullName: `${staff.firstName} ${staff.lastName}`,
        groupName: staff.role || 'Staff',
        diocese: null,
        participantType: 'staff',
        isChaperone: false,
        isClergy: false,
        housing: null,
        mealColor: null,
        qrCode: qrCode || null,
        template: templateConfig,
      }
    })
  )
}
