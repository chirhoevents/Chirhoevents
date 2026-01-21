import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

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

// POST /api/admin/events/[eventId]/poros/bulk-import
// Import buildings, rooms, small groups, or meal groups from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Poros Bulk Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const importType = formData.get('importType') as string // 'buildings', 'rooms', 'small-groups', 'meal-groups'
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const { headers, rows } = parseCSV(text)

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    }

    // ============================================
    // BUILDINGS IMPORT
    // ============================================
    if (importType === 'buildings') {
      const requiredColumns = ['building_name', 'gender', 'housing_type']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      for (const row of rows) {
        try {
          const buildingName = row.building_name?.trim()
          if (!buildingName) {
            results.errors.push('Skipping row with empty building_name')
            continue
          }

          const genderRaw = (row.gender || 'mixed').toLowerCase()
          const gender = ['male', 'female', 'mixed'].includes(genderRaw) ? genderRaw : 'mixed'

          const housingTypeRaw = (row.housing_type || 'general').toLowerCase().replace(/ /g, '_')
          const housingType = ['youth_u18', 'chaperone_18plus', 'clergy', 'general'].includes(housingTypeRaw)
            ? housingTypeRaw
            : 'general'

          const existingBuilding = await prisma.building.findFirst({
            where: { eventId, name: { equals: buildingName, mode: 'insensitive' } }
          })

          const buildingData = {
            eventId,
            name: buildingName,
            gender: gender as any,
            housingType: housingType as any,
            totalFloors: parseInt(row.total_floors || '1') || 1,
            notes: row.notes || null,
          }

          if (existingBuilding) {
            await prisma.building.update({
              where: { id: existingBuilding.id },
              data: buildingData
            })
            results.updated++
          } else {
            await prisma.building.create({ data: buildingData })
            results.created++
          }
        } catch (err: any) {
          results.errors.push(`Error importing building ${row.building_name}: ${err.message}`)
        }
      }
    }

    // ============================================
    // ROOMS IMPORT
    // ============================================
    else if (importType === 'rooms') {
      const requiredColumns = ['building_name', 'room_number', 'capacity']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      // Get all buildings for this event
      const buildings = await prisma.building.findMany({
        where: { eventId },
        select: { id: true, name: true, gender: true, housingType: true }
      })
      type BuildingType = { id: string; name: string; gender: string | null; housingType: string | null }
      const buildingMap = new Map<string, BuildingType>(buildings.map((b: BuildingType) => [b.name.toLowerCase(), b]))

      for (const row of rows) {
        try {
          const buildingName = row.building_name?.trim()
          const roomNumber = row.room_number?.trim()

          if (!buildingName || !roomNumber) {
            results.errors.push(`Skipping row with empty building_name or room_number`)
            continue
          }

          const building = buildingMap.get(buildingName.toLowerCase())
          if (!building) {
            results.errors.push(`Building not found: ${buildingName}. Import buildings first.`)
            continue
          }

          const capacity = parseInt(row.capacity || '2') || 2
          const genderRaw = (row.gender || building.gender || 'mixed').toLowerCase()
          const gender = ['male', 'female', 'mixed'].includes(genderRaw) ? genderRaw : building.gender

          const housingTypeRaw = (row.housing_type || building.housingType || 'general').toLowerCase().replace(/ /g, '_')
          const housingType = ['youth_u18', 'chaperone_18plus', 'clergy', 'general'].includes(housingTypeRaw)
            ? housingTypeRaw
            : building.housingType

          const isAdaAccessible = ['yes', 'true', '1', 'y'].includes((row.is_ada_accessible || '').toLowerCase())

          // Room purpose: housing, small_group, or both
          const roomPurposeRaw = (row.room_purpose || 'housing').toLowerCase().replace(/ /g, '_')
          const roomPurpose = ['housing', 'small_group', 'both'].includes(roomPurposeRaw) ? roomPurposeRaw : 'housing'

          const existingRoom = await prisma.room.findFirst({
            where: { buildingId: building.id, roomNumber }
          })

          const roomData = {
            buildingId: building.id,
            roomNumber,
            floor: parseInt(row.floor || '1') || 1,
            capacity,
            bedCount: roomPurpose === 'small_group' ? 0 : capacity, // Small group rooms don't have beds
            gender: gender as any,
            housingType: housingType as any,
            roomPurpose: roomPurpose as any,
            isAdaAccessible,
            isAvailable: true,
            notes: row.notes || null,
          }

          if (existingRoom) {
            await prisma.room.update({
              where: { id: existingRoom.id },
              data: roomData
            })
            results.updated++
          } else {
            await prisma.room.create({ data: roomData })
            results.created++
          }
        } catch (err: any) {
          results.errors.push(`Error importing room ${row.room_number}: ${err.message}`)
        }
      }

      // Update building room counts
      for (const building of buildings) {
        const roomCount = await prisma.room.count({ where: { buildingId: building.id } })
        const roomStats = await prisma.room.aggregate({
          where: { buildingId: building.id },
          _sum: { capacity: true }
        })
        await prisma.building.update({
          where: { id: building.id },
          data: {
            totalRooms: roomCount,
            totalBeds: roomStats._sum.capacity || 0
          }
        })
      }
    }

    // ============================================
    // SMALL GROUPS IMPORT
    // ============================================
    else if (importType === 'small-groups') {
      const requiredColumns = ['group_name']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      // Cache for staff lookups
      const staffCache = new Map<string, string>()

      for (const row of rows) {
        try {
          const groupName = row.group_name?.trim()
          if (!groupName) {
            results.errors.push('Skipping row with empty group_name')
            continue
          }

          // Find or create SGL
          let sglId: string | null = null
          if (row.sgl_first_name?.trim()) {
            const sglKey = `${row.sgl_first_name?.trim()}-${row.sgl_last_name?.trim() || ''}`
            sglId = staffCache.get(sglKey) || null

            if (!sglId) {
              let staff = await prisma.porosStaff.findFirst({
                where: {
                  eventId,
                  firstName: { contains: row.sgl_first_name.trim(), mode: 'insensitive' },
                  lastName: row.sgl_last_name?.trim() ? { contains: row.sgl_last_name.trim(), mode: 'insensitive' } : undefined,
                }
              })

              if (!staff) {
                staff = await prisma.porosStaff.create({
                  data: {
                    eventId,
                    firstName: row.sgl_first_name.trim(),
                    lastName: row.sgl_last_name?.trim() || '',
                    staffType: 'sgl',
                  }
                })
              }
              sglId = staff.id
              staffCache.set(sglKey, staff.id)
            }
          }

          // Find or create Co-SGL (Religious)
          let coSglId: string | null = null
          if (row.co_sgl_first_name?.trim()) {
            const coSglKey = `${row.co_sgl_first_name?.trim()}-${row.co_sgl_last_name?.trim() || ''}`
            coSglId = staffCache.get(coSglKey) || null

            if (!coSglId) {
              let staff = await prisma.porosStaff.findFirst({
                where: {
                  eventId,
                  firstName: { contains: row.co_sgl_first_name.trim(), mode: 'insensitive' },
                  lastName: row.co_sgl_last_name?.trim() ? { contains: row.co_sgl_last_name.trim(), mode: 'insensitive' } : undefined,
                }
              })

              if (!staff) {
                // Detect if religious based on name prefix
                const isReligious = /^(Sr\.|Sister|Br\.|Brother)/i.test(row.co_sgl_first_name.trim())
                staff = await prisma.porosStaff.create({
                  data: {
                    eventId,
                    firstName: row.co_sgl_first_name.trim(),
                    lastName: row.co_sgl_last_name?.trim() || '',
                    staffType: isReligious ? 'religious' : 'co_sgl',
                  }
                })
              }
              coSglId = staff.id
              staffCache.set(coSglKey, staff.id)
            }
          }

          // Find meeting room if specified
          let meetingRoomId: string | null = null
          if (row.meeting_room?.trim()) {
            // Try to find room by number or name
            const room = await prisma.room.findFirst({
              where: {
                building: { eventId },
                OR: [
                  { roomNumber: { contains: row.meeting_room.trim(), mode: 'insensitive' } },
                  { notes: { contains: row.meeting_room.trim(), mode: 'insensitive' } },
                ]
              }
            })
            if (room) {
              meetingRoomId = room.id
            }
          }

          const existingGroup = await prisma.smallGroup.findFirst({
            where: { eventId, name: { equals: groupName, mode: 'insensitive' } }
          })

          const smallGroupData = {
            eventId,
            name: groupName,
            groupNumber: parseInt(row.group_number || '0') || null,
            sglId,
            coSglId,
            meetingRoomId,
            meetingTime: row.meeting_time?.trim() || null,
            meetingPlace: row.meeting_place?.trim() || row.meeting_room?.trim() || null,
            capacity: parseInt(row.capacity || '12') || 12,
            notes: row.notes?.trim() || null,
          }

          if (existingGroup) {
            await prisma.smallGroup.update({
              where: { id: existingGroup.id },
              data: smallGroupData
            })
            results.updated++
          } else {
            await prisma.smallGroup.create({ data: smallGroupData })
            results.created++
          }
        } catch (err: any) {
          results.errors.push(`Error importing small group ${row.group_name}: ${err.message}`)
        }
      }
    }

    // ============================================
    // MEAL GROUPS IMPORT
    // ============================================
    else if (importType === 'meal-groups') {
      const requiredColumns = ['color_name']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      let displayOrder = 0
      for (const row of rows) {
        try {
          const colorName = row.color_name?.trim()
          if (!colorName) {
            results.errors.push('Skipping row with empty color_name')
            continue
          }

          const defaultColorHex: Record<string, string> = {
            'red': '#e74c3c', 'blue': '#3498db', 'green': '#27ae60',
            'yellow': '#f1c40f', 'orange': '#e67e22', 'purple': '#9b59b6',
            'pink': '#e83e8c', 'brown': '#8b4513', 'grey': '#95a5a6',
            'gray': '#95a5a6', 'black': '#343a40', 'white': '#f8f9fa',
          }

          const colorHex = row.color_hex?.trim() || defaultColorHex[colorName.toLowerCase()] || '#3498db'

          const existingMealGroup = await prisma.mealGroup.findFirst({
            where: { eventId, name: { equals: colorName, mode: 'insensitive' } }
          })

          const mealGroupData = {
            eventId,
            name: colorName,
            color: colorName.toLowerCase(),
            colorHex,
            breakfastTime: row.breakfast_time?.trim() || null,
            lunchTime: row.lunch_time?.trim() || null,
            dinnerTime: row.dinner_time?.trim() || null,
            capacity: parseInt(row.capacity || '150') || 150,
            displayOrder: displayOrder++,
            isActive: true,
          }

          if (existingMealGroup) {
            await prisma.mealGroup.update({
              where: { id: existingMealGroup.id },
              data: mealGroupData
            })
            results.updated++
          } else {
            await prisma.mealGroup.create({ data: mealGroupData })
            results.created++
          }
        } catch (err: any) {
          results.errors.push(`Error importing meal group ${row.color_name}: ${err.message}`)
        }
      }
    }

    // ============================================
    // STAFF IMPORT (Seminarians, Religious, SGLs)
    // ============================================
    else if (importType === 'staff') {
      const requiredColumns = ['first_name', 'last_name', 'staff_type']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      for (const row of rows) {
        try {
          const firstName = row.first_name?.trim()
          const lastName = row.last_name?.trim()
          if (!firstName) {
            results.errors.push('Skipping row with empty first_name')
            continue
          }

          // Map staff type
          const staffTypeRaw = (row.staff_type || 'sgl').toLowerCase()
          let staffType = 'sgl'
          if (staffTypeRaw.includes('seminarian') || staffTypeRaw === 'sem') {
            staffType = 'seminarian'
          } else if (staffTypeRaw.includes('religious') || staffTypeRaw === 'sr' || staffTypeRaw === 'br' || staffTypeRaw.includes('sister') || staffTypeRaw.includes('brother')) {
            staffType = 'religious'
          } else if (staffTypeRaw.includes('priest') || staffTypeRaw === 'fr') {
            staffType = 'priest'
          } else if (staffTypeRaw.includes('deacon')) {
            staffType = 'deacon'
          } else if (staffTypeRaw.includes('co_sgl') || staffTypeRaw.includes('co-sgl')) {
            staffType = 'co_sgl'
          } else if (staffTypeRaw.includes('volunteer')) {
            staffType = 'volunteer'
          }

          // Map gender
          const genderRaw = (row.gender || '').toLowerCase()
          const gender = genderRaw === 'male' || genderRaw === 'm' ? 'male' : genderRaw === 'female' || genderRaw === 'f' ? 'female' : null

          const existingStaff = await prisma.porosStaff.findFirst({
            where: {
              eventId,
              firstName: { equals: firstName, mode: 'insensitive' },
              lastName: lastName ? { equals: lastName, mode: 'insensitive' } : undefined,
            }
          })

          const staffData = {
            eventId,
            firstName,
            lastName: lastName || '',
            staffType: staffType as any,
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            diocese: row.diocese?.trim() || null,
            gender: gender as any,
            notes: row.notes?.trim() || null,
          }

          if (existingStaff) {
            await prisma.porosStaff.update({
              where: { id: existingStaff.id },
              data: staffData
            })
            results.updated++
          } else {
            await prisma.porosStaff.create({ data: staffData })
            results.created++
          }
        } catch (err: any) {
          results.errors.push(`Error importing staff ${row.first_name} ${row.last_name}: ${err.message}`)
        }
      }
    }

    else {
      return NextResponse.json({
        error: `Invalid import type: ${importType}. Valid types: buildings, rooms, small-groups, meal-groups, staff`
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      importType,
      ...results,
      message: `Import completed. Created: ${results.created}, Updated: ${results.updated}${results.errors.length > 0 ? `, Errors: ${results.errors.length}` : ''}`
    })

  } catch (error: any) {
    console.error('Poros bulk import error:', error)
    return NextResponse.json({
      error: 'Import failed. Please check your CSV format and try again.',
      details: error.message
    }, { status: 500 })
  }
}

// GET - Download import templates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const templateType = searchParams.get('template') || 'buildings'

  const templates: Record<string, { filename: string; content: string }> = {
    'buildings': {
      filename: 'buildings-import-template.csv',
      content: `building_name,gender,housing_type,total_floors,notes
Cana Hall,male,youth_u18,3,Main male youth dorm
Bethany Hall,female,youth_u18,3,Main female youth dorm
Jordan House,male,chaperone_18plus,2,Male chaperone housing
Martha House,female,chaperone_18plus,2,Female chaperone housing
Clergy Residence,male,clergy,1,Priests and deacons`
    },
    'rooms': {
      filename: 'rooms-import-template.csv',
      content: `building_name,room_number,floor,capacity,gender,housing_type,room_purpose,is_ada_accessible,notes
Cana Hall,101,1,4,male,youth_u18,housing,yes,ADA accessible room
Cana Hall,102,1,4,male,youth_u18,housing,no,
Bethany Hall,101,1,4,female,youth_u18,housing,yes,ADA accessible
Jordan House,101,1,2,male,chaperone_18plus,housing,no,
Clergy Residence,101,1,1,male,clergy,housing,no,Single room
St. Paul Center,Classroom A,1,30,mixed,general,small_group,no,Small group meeting room
Chapel Annex,Meeting Room 1,1,20,mixed,general,small_group,no,Small group meeting room`
    },
    'small-groups': {
      filename: 'small-groups-import-template.csv',
      content: `group_number,group_name,sgl_first_name,sgl_last_name,co_sgl_first_name,co_sgl_last_name,meeting_room,meeting_time,meeting_place,capacity,notes
1,Small Group 1,John,Smith,Sr. Maria,Lopez,Room 101,After dinner,Cana Hall Room 101,12,
2,Small Group 2,Michael,Brown,,,Classroom A,After dinner,St. Paul Center,12,
3,Small Group 3,David,Wilson,Sr. Teresa,Avila,Classroom B,After dinner,St. Paul Center,12,`
    },
    'meal-groups': {
      filename: 'meal-groups-import-template.csv',
      content: `color_name,color_hex,breakfast_time,lunch_time,dinner_time,capacity
Red,#e74c3c,7:00 AM,12:00 PM,6:00 PM,150
Blue,#3498db,7:15 AM,12:15 PM,6:15 PM,150
Green,#27ae60,7:30 AM,12:30 PM,6:30 PM,150
Yellow,#f1c40f,7:45 AM,12:45 PM,6:45 PM,150`
    },
    'staff': {
      filename: 'staff-import-template.csv',
      content: `first_name,last_name,staff_type,email,phone,diocese,gender,notes
John,Smith,seminarian,john.smith@seminary.edu,555-111-2222,Diocese of Arlington,male,Speaks Spanish
Michael,Brown,seminarian,michael.b@seminary.edu,555-222-3333,Archdiocese of Baltimore,male,
Sr. Maria,Lopez,religious,sr.maria@convent.org,555-444-5555,Diocese of Arlington,female,Dominican Sister
Sr. Teresa,Avila,religious,sr.teresa@convent.org,555-555-6666,Archdiocese of Baltimore,female,Carmelite
Br. Francis,Xavier,religious,br.francis@monastery.org,555-666-7777,Diocese of Richmond,male,Franciscan Brother`
    }
  }

  const template = templates[templateType]
  if (!template) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
  }

  return new NextResponse(template.content, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${template.filename}"`
    }
  })
}
