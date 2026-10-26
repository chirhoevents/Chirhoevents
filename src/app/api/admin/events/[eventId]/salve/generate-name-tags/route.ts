import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { generateParticipantQRCode, generateIndividualRegistrationQRCode } from '@/lib/qr-code'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'
import { isClergyOrReligiousType, resolveParticipantType } from '@/lib/clergy-roles'
import { nameTagName } from '@/lib/name-tag-name'
import { hasRealMedicalText } from '@/lib/medical-info'

async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = await getClerkUserIdFromHeader(request)
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
  showAllergyBar: false,
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

type BadgeMealColor = { name: string; hex: string }

// Meal colors are assigned on the Poros "Meal Colors" page, which writes
// MealGroupAssignment rows (custom name + hex per MealGroup). Older events
// used the plain-string MealColorAssignment table, so fall back to it for
// any group without a meal group assignment.
async function groupMealColors(eventId: string, groupIds: string[]): Promise<Map<string, BadgeMealColor>> {
  const map = new Map<string, BadgeMealColor>()
  if (groupIds.length === 0) return map

  const [mealGroupAssignments, legacyAssignments] = await Promise.all([
    prisma.mealGroupAssignment.findMany({
      where: { groupRegistrationId: { in: groupIds }, mealGroup: { eventId } },
      include: { mealGroup: { select: { name: true, colorHex: true } } },
    }),
    prisma.mealColorAssignment.findMany({
      where: { groupRegistrationId: { in: groupIds } },
    }),
  ])

  for (const mga of mealGroupAssignments as any[]) {
    if (mga.groupRegistrationId) {
      map.set(mga.groupRegistrationId, { name: mga.mealGroup.name, hex: mga.mealGroup.colorHex })
    }
  }
  for (const mca of legacyAssignments as any[]) {
    if (mca.groupRegistrationId && !map.has(mca.groupRegistrationId)) {
      map.set(mca.groupRegistrationId, { name: mca.color, hex: mealHex(mca.color) })
    }
  }
  return map
}

async function individualMealColors(eventId: string, registrationIds: string[]): Promise<Map<string, BadgeMealColor>> {
  const map = new Map<string, BadgeMealColor>()
  if (registrationIds.length === 0) return map

  const assignments = await prisma.mealGroupAssignment.findMany({
    where: { individualRegistrationId: { in: registrationIds }, mealGroup: { eventId } },
    include: { mealGroup: { select: { name: true, colorHex: true } } },
  })
  for (const mga of assignments as any[]) {
    if (mga.individualRegistrationId) {
      map.set(mga.individualRegistrationId, { name: mga.mealGroup.name, hex: mga.mealGroup.colorHex })
    }
  }
  return map
}

// The purple allergy bar is opt-in per template. Only look up forms (and only
// ever send a yes/no, never the allergy itself) when it's turned on.
function allergyBarOn(templateConfig: any): boolean {
  return templateConfig?.showAllergyBar === true
}

// Set of owner ids (participant / individual registration) whose liability
// form lists a real allergy. "None", "N/A" and blanks don't count.
function allergyOwnerIds(forms: { ownerId: string | null; allergies: string | null }[]): Set<string> {
  const ids = new Set<string>()
  for (const f of forms) {
    if (f.ownerId && hasRealMedicalText(f.allergies)) ids.add(f.ownerId)
  }
  return ids
}

// Housing resolves the same way the welcome packet does: a participant's own
// bed first, then the group-level rooms from the Poros Housing tab
// (RoomAssignment rows with a groupRegistrationId and no participantId), then
// rooms handed to the group on the Group Allocations tab
// (Room.allocatedToGroupId). Group rooms are matched to the participant's
// gender using the notes the assign route writes ("female housing
// assignment"), else the room's own gender.
function groupAssignmentGender(a: any): 'male' | 'female' | null {
  const fromNotes = /^(male|female)\b/i.exec(a.notes ?? '')?.[1]?.toLowerCase()
  if (fromNotes === 'male' || fromNotes === 'female') return fromNotes
  if (a.room.gender === 'male' || a.room.gender === 'female') return a.room.gender
  return null
}

// Every room the group was given for this participant's gender (falling back
// to mixed rooms), as "Building Room" — joined if the block spans rooms.
function groupHousingFor(groupAssignments: any[], gender: string | null) {
  const g = gender?.toLowerCase()
  const forGender = groupAssignments.filter((a) => groupAssignmentGender(a) === g)
  const rooms = forGender.length
    ? forGender
    : groupAssignments.filter((a) => groupAssignmentGender(a) === null)
  if (rooms.length === 0) return null
  const first = rooms[0].room
  return {
    building: first.building.name,
    room: first.roomNumber,
    bed: null,
    fullLocation: rooms.map((a) => `${a.room.building.name} ${a.room.roomNumber}`).join(' / '),
  }
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
      registrationType = 'group', // 'group' | 'individual' | 'staff' | 'vendor'
      templateId,
      templateOverride,        // current UI template state (takes priority over DB)
    } = body

    // -----------------------------------------------------------------------
    // Load template — UI override > DB template by id > DB template by event > default
    // -----------------------------------------------------------------------
    let template = null
    if (!templateOverride) {
      if (templateId) {
        template = await prisma.nameTagTemplate.findFirst({ where: { id: templateId, eventId } })
      }
      if (!template) {
        template = await prisma.nameTagTemplate.findUnique({ where: { eventId } })
      }
    }
    const templateConfig: any = templateOverride || template?.settingsJson || template || DEFAULT_TEMPLATE

    // -----------------------------------------------------------------------
    // Dispatch by registration type
    // -----------------------------------------------------------------------
    let nameTags: any[]

    if (registrationType === 'individual') {
      nameTags = await generateIndividualNameTags(eventId, participantIds, registrationId, templateConfig)
    } else if (registrationType === 'staff') {
      nameTags = await generateStaffNameTags(eventId, participantIds, registrationId, templateConfig)
    } else if (registrationType === 'vendor') {
      nameTags = await generateVendorNameTags(eventId, participantIds, registrationId, templateConfig)
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
    // Schedule data — only fetched when the template uses a back-panel layout
    // -----------------------------------------------------------------------
    let schedule: any[] = []
    if (templateConfig.size === 'thermal_4x12' || templateConfig.size === 'duo_4x6' || templateConfig.size === 'postcard_4up') {
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

  const [roomAssignments, groupRoomAssignments, allocatedRooms, mealColorMap, allergyForms] = await Promise.all([
    prisma.roomAssignment.findMany({
      where: { participantId: { in: idList } },
      include: { room: { include: { building: { select: { name: true } } } } },
    }),
    prisma.roomAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds as string[] },
        participantId: null,
        room: { roomPurpose: { in: ['housing', 'both'] }, building: { eventId } },
      },
      include: { room: { include: { building: { select: { name: true } } } } },
      orderBy: { assignedAt: 'asc' },
    }),
    prisma.room.findMany({
      where: {
        allocatedToGroupId: { in: groupIds as string[] },
        roomPurpose: { in: ['housing', 'both'] },
        building: { eventId },
      },
      include: { building: { select: { name: true } } },
      orderBy: [{ building: { name: 'asc' } }, { roomNumber: 'asc' }],
    }),
    groupMealColors(eventId, groupIds as string[]),
    allergyBarOn(templateConfig)
      ? prisma.liabilityForm.findMany({
          where: { participantId: { in: idList } },
          select: { participantId: true, allergies: true },
        })
      : Promise.resolve([]),
  ])
  const withAllergy = allergyOwnerIds(
    allergyForms.map((f: any) => ({ ownerId: f.participantId, allergies: f.allergies }))
  )

  const groupRoomMap = new Map<string, any[]>()
  for (const a of groupRoomAssignments as any[]) {
    const list = groupRoomMap.get(a.groupRegistrationId) ?? []
    list.push(a)
    groupRoomMap.set(a.groupRegistrationId, list)
  }
  const allocatedRoomMap = new Map<string, any[]>()
  for (const room of allocatedRooms as any[]) {
    const list = allocatedRoomMap.get(room.allocatedToGroupId) ?? []
    list.push({ room, notes: null })
    allocatedRoomMap.set(room.allocatedToGroupId, list)
  }

  const assignmentMap = new Map(
    roomAssignments.map((ra: any) => [
      ra.participantId,
      { buildingName: ra.room.building.name, roomNumber: ra.room.roomNumber, bedNumber: ra.bedNumber },
    ])
  )

  return Promise.all(
    participants.map(async (p: any) => {
      const assignment = assignmentMap.get(p.id) as any
      const bed = assignment ? bedLetter(assignment.bedNumber) : null

      let qrCode = p.qrCode
      if (!qrCode) {
        try {
          qrCode = await generateParticipantQRCode(p.id)
          prisma.participant
            .update({ where: { id: p.id }, data: { qrCode } })
            .catch(() => {})
        } catch {}
      }

      const isClergy = isClergyOrReligiousType(p.participantType)

      return {
        participantId: p.id,
        // Preferred name (e.g. a Sister's religious name) over the legal name.
        ...nameTagName(p.firstName, p.lastName, p.preferredName, isClergy),
        groupName: p.groupRegistration.groupName,
        diocese: p.groupRegistration.dioceseName,
        // Sisters/brothers/seminarians/deacons are stored as 'priest' + a title;
        // resolve so the badge reads "Sister", not "Priest".
        participantType: resolveParticipantType(p.participantType, p.clergyTitle),
        isChaperone: p.participantType === 'chaperone',
        isClergy,
        housing: assignment
          ? {
              building: assignment.buildingName,
              room: assignment.roomNumber,
              bed,
              fullLocation: `${assignment.buildingName} ${assignment.roomNumber}${bed ? ` - Bed ${bed}` : ''}`,
            }
          : groupHousingFor(groupRoomMap.get(p.groupRegistrationId) ?? [], p.gender)
            ?? groupHousingFor(allocatedRoomMap.get(p.groupRegistrationId) ?? [], p.gender),
        mealColor: mealColorMap.get(p.groupRegistrationId) ?? null,
        qrCode: qrCode || null,
        hasAllergy: withAllergy.has(p.id),
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

  const regIds = registrations.map((r: any) => r.id)
  const [mealColorMap, roomAssignments] = await Promise.all([
    individualMealColors(eventId, regIds),
    prisma.roomAssignment.findMany({
      where: { individualRegistrationId: { in: regIds } },
      include: { room: { include: { building: { select: { name: true } } } } },
    }),
  ])
  const housingMap = new Map(
    roomAssignments.map((ra: any) => {
      const bed = bedLetter(ra.bedNumber)
      return [
        ra.individualRegistrationId,
        {
          building: ra.room.building.name,
          room: ra.room.roomNumber,
          bed,
          fullLocation: `${ra.room.building.name} ${ra.room.roomNumber}${bed ? ` - Bed ${bed}` : ''}`,
        },
      ]
    })
  )

  const withAllergy = allergyBarOn(templateConfig)
    ? allergyOwnerIds(
        (await prisma.liabilityForm.findMany({
          where: { individualRegistrationId: { in: registrations.map((r: any) => r.id) } },
          select: { individualRegistrationId: true, allergies: true },
        })).map((f: any) => ({ ownerId: f.individualRegistrationId, allergies: f.allergies }))
      )
    : new Set<string>()

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
        ...nameTagName(reg.firstName, reg.lastName, reg.preferredName),
        groupName: 'Individual Registrant',
        diocese: null,
        participantType: 'individual',
        isChaperone: false,
        isClergy: false,
        housing: housingMap.get(reg.id) ?? null,
        mealColor: mealColorMap.get(reg.id) ?? null,
        qrCode: qrCode || null,
        hasAllergy: withAllergy.has(reg.id),
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
    include: allergyBarOn(templateConfig) ? { liabilityForm: { select: { allergies: true } } } : undefined,
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
        hasAllergy: hasRealMedicalText(staff.liabilityForm?.allergies),
        template: templateConfig,
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Vendor registrations — one badge per vendor contact using the same org
// template as staff, with the business name in the group-name slot.
// ---------------------------------------------------------------------------
async function generateVendorNameTags(
  eventId: string,
  participantIds: string[] | undefined,
  registrationId: string | undefined,
  templateConfig: any
): Promise<any[]> {
  const ids: string[] = registrationId ? [registrationId] : participantIds ?? []
  if (ids.length === 0) {
    throw new Error('Either registrationId or participantIds is required for vendor registrations')
  }

  const vendors = await prisma.vendorRegistration.findMany({
    where: { id: { in: ids }, eventId, status: 'approved' },
    orderBy: [{ businessName: 'asc' }],
    include: allergyBarOn(templateConfig) ? { liabilityForm: { select: { allergies: true } } } : undefined,
  })

  return Promise.all(
    vendors.map(async (vendor: any) => {
      let qrCode: string | null = null
      try {
        qrCode = await generateParticipantQRCode(vendor.id)
      } catch {}

      return {
        participantId: vendor.id,
        firstName: vendor.contactFirstName,
        lastName: vendor.contactLastName,
        fullName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
        groupName: vendor.businessName,
        diocese: null,
        participantType: 'vendor',
        isChaperone: false,
        isClergy: false,
        housing: null,
        mealColor: null,
        qrCode,
        hasAllergy: hasRealMedicalText(vendor.liabilityForm?.allergies),
        template: templateConfig,
      }
    })
  )
}
