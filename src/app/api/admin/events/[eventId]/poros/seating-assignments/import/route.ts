import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface ImportError {
  row: number
  message: string
  participantName?: string
}

interface ImportResult {
  success: boolean
  sectionsCreated: number
  assignmentsCreated: number
  assignmentsUpdated: number
  errors: ImportError[]
  warnings: string[]
}

// Helper to parse CSV line with quote handling
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Seating Assignments Import POST]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Seating Assignments Import] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'))

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File must contain header row and at least one data row' },
        { status: 400 }
      )
    }

    // Parse headers (case-insensitive)
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

    const sectionNameIndex = headers.findIndex(h => h.includes('section') && h.includes('name'))
    const maxCapacityIndex = headers.findIndex(h => h.includes('capacity') || h.includes('max'))
    const participantNameIndex = headers.findIndex(h => h.includes('participant') && h.includes('name'))
    const registrationIdIndex = headers.findIndex(h => h.includes('registration') && h.includes('id'))
    const groupNameIndex = headers.findIndex(h => h.includes('group') && h.includes('name'))

    // Validate required columns
    if (sectionNameIndex === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Section Name' },
        { status: 400 }
      )
    }
    if (participantNameIndex === -1 && registrationIdIndex === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Participant Name or Registration ID' },
        { status: 400 }
      )
    }

    // Fetch existing sections for this event
    const existingSections = await prisma.seatingSection.findMany({
      where: { eventId },
    })
    type SeatingSection = typeof existingSections[number]
    const sectionMap = new Map<string, SeatingSection>(
      existingSections.map((s: SeatingSection) => [s.name.toLowerCase(), s])
    )

    // Fetch all registrations for matching
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: { eventId },
    })

    // Build lookup maps for matching
    interface ParticipantMatch {
      id: string
      type: 'group' | 'individual'
      registrationId: string
      name: string
      groupName: string | null
    }

    const participantLookup: ParticipantMatch[] = []

    // Add group participants
    for (const group of groupRegistrations) {
      for (const participant of group.participants) {
        participantLookup.push({
          id: participant.id,
          type: 'group',
          registrationId: group.id,
          name: `${participant.firstName} ${participant.lastName}`,
          groupName: group.parishName,
        })
      }
    }

    // Add individual registrations
    for (const individual of individualRegistrations) {
      participantLookup.push({
        id: individual.id,
        type: 'individual',
        registrationId: individual.id,
        name: `${individual.firstName} ${individual.lastName}`,
        groupName: null,
      })
    }

    const result: ImportResult = {
      success: true,
      sectionsCreated: 0,
      assignmentsCreated: 0,
      assignmentsUpdated: 0,
      errors: [],
      warnings: [],
    }

    // Track sections and their capacities for capacity checking
    const sectionCapacities = new Map<string, { capacity: number; assigned: number }>()
    for (const section of existingSections) {
      sectionCapacities.set(section.name.toLowerCase(), {
        capacity: section.capacity,
        assigned: section.currentOccupancy,
      })
    }

    // Track assignments to detect duplicates
    const assignedParticipants = new Set<string>()

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i])
      if (row.every(cell => !cell.trim())) continue // Skip empty rows

      const sectionName = row[sectionNameIndex]?.trim()
      const maxCapacity = maxCapacityIndex !== -1 ? parseInt(row[maxCapacityIndex]) || 100 : 100
      const participantName = participantNameIndex !== -1 ? row[participantNameIndex]?.trim() : ''
      const registrationId = registrationIdIndex !== -1 ? row[registrationIdIndex]?.trim() : ''
      const groupName = groupNameIndex !== -1 ? row[groupNameIndex]?.trim() : ''

      // Validate section name
      if (!sectionName) {
        result.errors.push({
          row: i + 1,
          message: 'Missing section name',
          participantName: participantName || undefined,
        })
        continue
      }

      // Validate participant identifier
      if (!participantName && !registrationId) {
        result.errors.push({
          row: i + 1,
          message: 'Missing participant name or registration ID',
        })
        continue
      }

      // Create section if doesn't exist
      let section = sectionMap.get(sectionName.toLowerCase())
      if (!section) {
        section = await prisma.seatingSection.create({
          data: {
            eventId,
            name: sectionName,
            capacity: maxCapacity,
            displayOrder: existingSections.length + result.sectionsCreated,
          },
        })
        sectionMap.set(sectionName.toLowerCase(), section)
        sectionCapacities.set(sectionName.toLowerCase(), {
          capacity: maxCapacity,
          assigned: 0,
        })
        result.sectionsCreated++
      }

      // Find participant
      let match: ParticipantMatch | undefined

      // Try to match by registration ID first
      if (registrationId) {
        match = participantLookup.find(p =>
          p.registrationId === registrationId ||
          p.id === registrationId
        )
      }

      // If not found, try matching by name
      if (!match && participantName) {
        const normalizedInput = normalizeName(participantName)
        const matches = participantLookup.filter(p =>
          normalizeName(p.name) === normalizedInput
        )

        if (matches.length === 0) {
          result.errors.push({
            row: i + 1,
            message: `Participant not found: "${participantName}"`,
            participantName,
          })
          continue
        }

        if (matches.length > 1) {
          // Try to narrow down by group name
          if (groupName) {
            const groupMatch = matches.find(m =>
              m.groupName && normalizeName(m.groupName).includes(normalizeName(groupName))
            )
            if (groupMatch) {
              match = groupMatch
            } else {
              result.errors.push({
                row: i + 1,
                message: `Multiple participants named "${participantName}" found. Please specify Registration ID or Group Name to disambiguate.`,
                participantName,
              })
              continue
            }
          } else {
            result.errors.push({
              row: i + 1,
              message: `Multiple participants named "${participantName}" found. Please specify Registration ID or Group Name to disambiguate.`,
              participantName,
            })
            continue
          }
        } else {
          match = matches[0]
        }
      }

      if (!match) {
        result.errors.push({
          row: i + 1,
          message: `Participant not found with ID: "${registrationId}"`,
        })
        continue
      }

      // Check for duplicate assignments in import
      const participantKey = `${match.type}-${match.registrationId}`
      if (assignedParticipants.has(participantKey)) {
        result.warnings.push(
          `Row ${i + 1}: Duplicate assignment for "${match.name}" - using first occurrence`
        )
        continue
      }
      assignedParticipants.add(participantKey)

      // Check section capacity
      const sectionStats = sectionCapacities.get(sectionName.toLowerCase())!
      if (sectionStats.assigned >= sectionStats.capacity) {
        result.errors.push({
          row: i + 1,
          message: `Section "${sectionName}" is at capacity (${sectionStats.capacity})`,
          participantName: match.name,
        })
        continue
      }

      // Create or update assignment
      if (match.type === 'group') {
        const existing = await prisma.seatingAssignment.findFirst({
          where: { groupRegistrationId: match.registrationId },
        })

        if (existing) {
          await prisma.seatingAssignment.update({
            where: { id: existing.id },
            data: { sectionId: section.id },
          })
          result.assignmentsUpdated++
        } else {
          await prisma.seatingAssignment.create({
            data: {
              sectionId: section.id,
              groupRegistrationId: match.registrationId,
              assignedBy: user.id,
            },
          })
          result.assignmentsCreated++
          sectionStats.assigned++
        }
      } else {
        const existing = await prisma.seatingAssignment.findFirst({
          where: { individualRegistrationId: match.registrationId },
        })

        if (existing) {
          await prisma.seatingAssignment.update({
            where: { id: existing.id },
            data: { sectionId: section.id },
          })
          result.assignmentsUpdated++
        } else {
          await prisma.seatingAssignment.create({
            data: {
              sectionId: section.id,
              individualRegistrationId: match.registrationId,
              assignedBy: user.id,
            },
          })
          result.assignmentsCreated++
          sectionStats.assigned++
        }
      }
    }

    // Update section occupancy counts
    for (const section of sectionMap.values()) {
      const count = await prisma.seatingAssignment.count({
        where: { sectionId: section.id },
      })
      await prisma.seatingSection.update({
        where: { id: section.id },
        data: { currentOccupancy: count },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to import seating assignments:', error)
    return NextResponse.json(
      { error: 'Failed to import seating assignments' },
      { status: 500 }
    )
  }
}
