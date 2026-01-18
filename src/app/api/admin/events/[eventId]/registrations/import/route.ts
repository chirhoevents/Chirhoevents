import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// Generate a unique access code for group registrations
function generateAccessCode(eventSlug: string): string {
  const code = nanoid(8).toUpperCase()
  return `${eventSlug.substring(0, 6).toUpperCase()}-${code}`
}

// Parse CSV text handling quoted fields
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
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

  const headers = parseRow(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])
    if (values.length === 0 || (values.length === 1 && !values[0])) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.toLowerCase().replace(/ /g, '_')] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers: headers.map(h => h.toLowerCase().replace(/ /g, '_')), rows }
}

// POST /api/admin/events/[eventId]/registrations/import
// Import groups and/or participants from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Registrations Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'registrations.manage')) {
      return NextResponse.json(
        { message: 'Forbidden - Registration management access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const importType = formData.get('importType') as string // 'groups', 'participants', or 'both'
    const groupsFile = formData.get('groupsFile') as File | null
    const participantsFile = formData.get('participantsFile') as File | null

    const results = {
      groupsCreated: 0,
      groupsUpdated: 0,
      participantsCreated: 0,
      participantsUpdated: 0,
      errors: [] as string[],
    }

    // Import groups
    if ((importType === 'groups' || importType === 'both') && groupsFile) {
      const text = await groupsFile.text()
      const { headers, rows } = parseCSV(text)

      // Required columns for groups
      const requiredColumns = ['group_id', 'parish_name', 'leader_name', 'leader_email', 'leader_phone']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `Groups CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      for (const row of rows) {
        try {
          const groupExternalId = row.group_id?.trim()
          if (!groupExternalId) {
            results.errors.push(`Skipping row with empty group_id`)
            continue
          }

          // Check if group already exists (by groupName matching the external ID pattern)
          const existingGroup = await prisma.groupRegistration.findFirst({
            where: {
              eventId,
              groupName: { contains: `[${groupExternalId}]` }
            }
          })

          const maleYouth = parseInt(row.male_youth || '0') || 0
          const femaleYouth = parseInt(row.female_youth || '0') || 0
          const maleChaperones = parseInt(row.male_chaperones || '0') || 0
          const femaleChaperones = parseInt(row.female_chaperones || '0') || 0
          const priests = parseInt(row.priests || '0') || 0

          const totalYouth = maleYouth + femaleYouth
          const totalChaperones = maleChaperones + femaleChaperones
          const totalParticipants = totalYouth + totalChaperones + priests

          const housingTypeRaw = (row.housing_type || 'on_campus').toLowerCase().replace(/ /g, '_')
          const housingType = ['on_campus', 'off_campus', 'day_pass'].includes(housingTypeRaw)
            ? housingTypeRaw
            : 'on_campus'

          const groupData = {
            eventId,
            organizationId: event!.organizationId,
            groupName: `${row.parish_name} [${groupExternalId}]`,
            parishName: row.parish_name || null,
            dioceseName: row.diocese_name || null,
            groupLeaderName: row.leader_name,
            groupLeaderEmail: row.leader_email,
            groupLeaderPhone: row.leader_phone,
            youthCount: totalYouth,
            chaperoneCount: totalChaperones,
            priestCount: priests,
            totalParticipants,
            housingType: housingType as any,
            specialRequests: row.special_requests || null,
            adaAccommodationsSummary: row.ada_summary || null,
            registrationStatus: 'completed' as const,
          }

          if (existingGroup) {
            await prisma.groupRegistration.update({
              where: { id: existingGroup.id },
              data: groupData
            })
            results.groupsUpdated++
          } else {
            await prisma.groupRegistration.create({
              data: {
                ...groupData,
                accessCode: generateAccessCode(event!.slug || 'EVT'),
              }
            })
            results.groupsCreated++
          }
        } catch (err: any) {
          results.errors.push(`Error importing group ${row.group_id}: ${err.message}`)
        }
      }
    }

    // Import participants
    if ((importType === 'participants' || importType === 'both') && participantsFile) {
      const text = await participantsFile.text()
      const { headers, rows } = parseCSV(text)

      // Required columns for participants
      const requiredColumns = ['group_id', 'first_name', 'last_name', 'age', 'gender', 'participant_type']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `Participants CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      // Get all groups for this event for lookup
      const groups = await prisma.groupRegistration.findMany({
        where: { eventId },
        select: { id: true, groupName: true }
      })

      // Create a lookup map by external group ID
      const groupMap = new Map<string, string>()
      for (const group of groups) {
        // Extract [groupId] from groupName like "Parish Name [123]"
        const match = group.groupName.match(/\[([^\]]+)\]$/)
        if (match) {
          groupMap.set(match[1], group.id)
        }
      }

      for (const row of rows) {
        try {
          const groupExternalId = row.group_id?.trim()
          const groupId = groupMap.get(groupExternalId)

          if (!groupId) {
            results.errors.push(`Group not found for participant ${row.first_name} ${row.last_name} (group_id: ${groupExternalId})`)
            continue
          }

          const age = parseInt(row.age || '0') || 0
          const genderRaw = (row.gender || '').toLowerCase()
          const gender = genderRaw === 'male' || genderRaw === 'm' ? 'male' : 'female'

          const participantTypeRaw = (row.participant_type || 'youth').toLowerCase()
          let participantType: 'youth' | 'chaperone' | 'priest' | 'clergy' | 'religious_staff' = 'youth'
          if (participantTypeRaw.includes('chaperone')) participantType = 'chaperone'
          else if (participantTypeRaw.includes('priest')) participantType = 'priest'
          else if (participantTypeRaw.includes('clergy')) participantType = 'clergy'
          else if (participantTypeRaw.includes('religious')) participantType = 'religious_staff'

          // Check for existing participant (by name and group)
          const existingParticipant = await prisma.participant.findFirst({
            where: {
              groupRegistrationId: groupId,
              firstName: row.first_name,
              lastName: row.last_name,
            }
          })

          const participantData = {
            groupRegistrationId: groupId,
            organizationId: event!.organizationId,
            firstName: row.first_name,
            lastName: row.last_name,
            preferredName: row.preferred_name || null,
            email: row.email || null,
            age,
            gender: gender as any,
            participantType: participantType as any,
            tShirtSize: row.t_shirt_size || null,
            parentEmail: row.parent_email || null,
            liabilityFormCompleted: false,
          }

          if (existingParticipant) {
            await prisma.participant.update({
              where: { id: existingParticipant.id },
              data: participantData
            })
            results.participantsUpdated++
          } else {
            await prisma.participant.create({
              data: participantData
            })
            results.participantsCreated++
          }
        } catch (err: any) {
          results.errors.push(`Error importing participant ${row.first_name} ${row.last_name}: ${err.message}`)
        }
      }

      // Update group counts based on actual participants
      const groupsToUpdate = await prisma.groupRegistration.findMany({
        where: { eventId },
        include: {
          participants: {
            select: { participantType: true }
          }
        }
      })

      for (const group of groupsToUpdate) {
        const youthCount = group.participants.filter(p => p.participantType === 'youth').length
        const chaperoneCount = group.participants.filter(p => p.participantType === 'chaperone').length
        const priestCount = group.participants.filter(p => ['priest', 'clergy', 'religious_staff'].includes(p.participantType)).length

        await prisma.groupRegistration.update({
          where: { id: group.id },
          data: {
            youthCount,
            chaperoneCount,
            priestCount,
            totalParticipants: youthCount + chaperoneCount + priestCount
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Import completed. Groups: ${results.groupsCreated} created, ${results.groupsUpdated} updated. Participants: ${results.participantsCreated} created, ${results.participantsUpdated} updated.`
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Import failed. Please check your CSV format and try again.',
      details: error.message
    }, { status: 500 })
  }
}

// GET - Download import template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const templateType = searchParams.get('template') || 'groups'

  if (templateType === 'groups') {
    const csv = `group_id,parish_name,diocese_name,leader_name,leader_email,leader_phone,male_youth,female_youth,male_chaperones,female_chaperones,priests,housing_type,special_requests,ada_summary
1,St. Mary's Parish,Diocese of Arlington,John Smith,john.smith@example.com,555-123-4567,5,6,2,2,1,on_campus,Need early check-in,Wheelchair access needed
2,Holy Family Church,Archdiocese of Baltimore,Jane Doe,jane.doe@example.com,555-987-6543,8,7,3,2,0,off_campus,,`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="groups-import-template.csv"'
      }
    })
  } else if (templateType === 'participants') {
    const csv = `group_id,first_name,last_name,preferred_name,age,gender,participant_type,email,parent_email,t_shirt_size
1,Michael,Williams,,16,male,youth,,,M
1,Sarah,Brown,,15,female,youth,,,S
1,James,Wilson,,45,male,chaperone,james.w@example.com,,XL
1,Fr. Thomas,Moore,,55,male,priest,fr.thomas@example.com,,L`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="participants-import-template.csv"'
      }
    })
  }

  return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
}
