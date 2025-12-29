import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read CSV
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())

    // Validate headers
    const requiredHeaders = ['Building Name', 'Gender', 'Housing Type', 'Total Floors', 'Room Number', 'Floor', 'Room Type', 'Capacity']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return NextResponse.json({
        error: `Missing required columns: ${missingHeaders.join(', ')}`
      }, { status: 400 })
    }

    // Parse rows and group by building
    const buildingsMap = new Map<string, {
      name: string
      gender: string
      housingType: string
      totalFloors: number
      rooms: Array<{
        roomNumber: string
        floor: number
        roomType: string
        capacity: number
        isAdaAccessible: boolean
        adaFeatures: string
        notes: string
      }>
    }>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Handle CSV parsing with quoted fields
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

      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      const buildingKey = `${row['Building Name']}_${row['Gender']}_${row['Housing Type']}`

      if (!buildingsMap.has(buildingKey)) {
        buildingsMap.set(buildingKey, {
          name: row['Building Name'],
          gender: row['Gender'].toLowerCase(),
          housingType: row['Housing Type'].toLowerCase().replace(/ /g, '_'),
          totalFloors: parseInt(row['Total Floors']) || 1,
          rooms: []
        })
      }

      buildingsMap.get(buildingKey)!.rooms.push({
        roomNumber: row['Room Number'],
        floor: parseInt(row['Floor']) || 1,
        roomType: row['Room Type'] || 'double',
        capacity: parseInt(row['Capacity']) || 2,
        isAdaAccessible: row['Is ADA Accessible']?.toLowerCase() === 'true',
        adaFeatures: row['ADA Features'] || '',
        notes: row['Notes'] || ''
      })
    }

    // Create buildings and rooms
    let buildingsCreated = 0
    let roomsCreated = 0

    for (const buildingData of Array.from(buildingsMap.values())) {
      // Get the max display order for the event
      const maxOrder = await prisma.building.aggregate({
        where: { eventId: eventId },
        _max: { displayOrder: true }
      })

      // Create building
      const building = await prisma.building.create({
        data: {
          eventId: eventId,
          name: buildingData.name,
          gender: buildingData.gender as any,
          housingType: buildingData.housingType as any,
          totalFloors: buildingData.totalFloors,
          totalRooms: buildingData.rooms.length,
          totalBeds: buildingData.rooms.reduce((sum: number, r: { capacity: number }) => sum + r.capacity, 0),
          displayOrder: (maxOrder._max.displayOrder || 0) + 1
        }
      })

      buildingsCreated++

      // Create rooms
      for (const roomData of buildingData.rooms) {
        await prisma.room.create({
          data: {
            buildingId: building.id,
            roomNumber: roomData.roomNumber,
            floor: roomData.floor,
            capacity: roomData.capacity,
            bedCount: roomData.capacity,
            roomType: roomData.roomType as any,
            gender: buildingData.gender as any,
            housingType: buildingData.housingType as any,
            notes: roomData.notes || null,
            isAvailable: true,
            isAdaAccessible: roomData.isAdaAccessible,
            adaFeatures: roomData.adaFeatures || null,
            currentOccupancy: 0
          }
        })

        roomsCreated++
      }
    }

    return NextResponse.json({
      success: true,
      buildingsCreated,
      roomsCreated
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Import failed. Please check your CSV format and try again.'
    }, { status: 500 })
  }
}
