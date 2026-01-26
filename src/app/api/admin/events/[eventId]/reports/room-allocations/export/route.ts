import { NextRequest, NextResponse } from 'next/server'
import { verifyPorosAccess } from '@/lib/api-auth'
import { generateRoomAllocationsCSV } from '@/lib/reports/generate-csv'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify Poros access
    const { error } = await verifyPorosAccess(
      request,
      eventId,
      '[Room Allocations Export]'
    )
    if (error) return error

    const { format, purpose } = await request.json()

    // Build URL with optional purpose filter
    let url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/room-allocations`
    if (purpose) {
      url += `?purpose=${purpose}`
    }

    const reportResponse = await fetch(url, {
      headers: { Cookie: request.headers.get('cookie') || '' },
    })
    if (!reportResponse.ok) throw new Error('Failed to fetch report data')

    const data = await reportResponse.json()

    if (format === 'csv') {
      const csv = generateRoomAllocationsCSV(data)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="room_allocations_report.csv"`,
        },
      })
    } else if (format === 'pdf') {
      // Generate a simple text-based PDF content
      const pdfContent = generateRoomAllocationsPDFText(data)
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="room_allocations_report.txt"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Room allocations export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

function generateRoomAllocationsPDFText(data: any): string {
  const lines: string[] = []

  lines.push('ROOM ALLOCATIONS REPORT')
  lines.push('=' .repeat(50))
  lines.push('')

  // Summary
  lines.push('SUMMARY')
  lines.push('-'.repeat(30))
  lines.push(`Total Rooms: ${data.summary.totalRooms}`)
  lines.push(`Total Capacity: ${data.summary.totalCapacity}`)
  lines.push(`Total Occupied: ${data.summary.totalOccupied}`)
  lines.push(`Available: ${data.summary.totalCapacity - data.summary.totalOccupied}`)
  lines.push(`Rooms with Groups: ${data.summary.roomsWithGroups}`)
  lines.push(`Housing Rooms: ${data.summary.housingRooms}`)
  lines.push(`Small Group Rooms: ${data.summary.smallGroupRooms}`)
  lines.push('')

  // By Building
  lines.push('BY BUILDING')
  lines.push('-'.repeat(30))
  for (const building of data.summary.byBuilding) {
    lines.push(`${building.buildingName}: ${building.totalOccupied}/${building.totalCapacity} (${building.totalRooms} rooms)`)
  }
  lines.push('')

  // Room Details
  lines.push('ROOM DETAILS')
  lines.push('-'.repeat(30))

  let currentBuilding = ''
  for (const room of data.rooms) {
    if (room.buildingName !== currentBuilding) {
      currentBuilding = room.buildingName
      lines.push('')
      lines.push(`=== ${currentBuilding} ===`)
    }

    lines.push(`Room ${room.roomNumber} (Floor ${room.floor})`)
    lines.push(`  Purpose: ${room.roomPurpose}`)
    lines.push(`  Capacity: ${room.currentOccupancy}/${room.capacity}`)

    if (room.allocatedGroup) {
      lines.push(`  Allocated to: ${room.allocatedGroup.groupName}`)
      if (room.allocatedGroup.parishName) {
        lines.push(`  Parish: ${room.allocatedGroup.parishName}`)
      }
      lines.push(`  Participants: ${room.allocatedGroup.participantCount}`)
    }

    if (room.smallGroups && room.smallGroups.length > 0) {
      for (const sg of room.smallGroups) {
        lines.push(`  Small Group: ${sg.name} (${sg.currentSize}/${sg.capacity})`)
        if (sg.sglName) {
          lines.push(`    SGL: ${sg.sglName}`)
        }
      }
    }

    if (room.assignedGroups && room.assignedGroups.length > 0) {
      lines.push(`  GROUPS ASSIGNED TO THIS ROOM (${room.assignedGroups.length}):`)
      for (const group of room.assignedGroups) {
        lines.push(`    * ${group.groupName}`)
        if (group.parishName) {
          lines.push(`      Parish: ${group.parishName}`)
        }
        if (group.dioceseName) {
          lines.push(`      Diocese: ${group.dioceseName}`)
        }
        lines.push(`      Participants: ${group.actualParticipantCount}`)
        if (group.participants && group.participants.length > 0) {
          const participantNames = group.participants.slice(0, 10).map((p: any) => p.name).join(', ')
          lines.push(`      Members: ${participantNames}${group.participants.length > 10 ? ` +${group.participants.length - 10} more` : ''}`)
        }
      }
    }

    if (room.assignedPeople && room.assignedPeople.length > 0) {
      lines.push(`  Assigned:`)
      for (const person of room.assignedPeople) {
        const bedInfo = person.bedNumber ? ` [Bed ${person.bedNumber}]` : ''
        const groupInfo = person.groupName ? ` - ${person.groupName}` : ''
        lines.push(`    - ${person.name}${bedInfo}${groupInfo}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n')
}
