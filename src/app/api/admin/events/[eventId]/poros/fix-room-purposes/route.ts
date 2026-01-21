import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// POST /api/admin/events/[eventId]/poros/fix-room-purposes
// One-time fix to set room purposes based on the M2K spreadsheet data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Fix Room Purposes]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Housing rooms based on the spreadsheet:
    // - Off Campus Male, Off Campus Female
    // - Knott Academic Center: 320, 310, 327, 227, 224, 222, 220, 107, 109, 111, 104, 108
    // - ARCC GYM FLOOR

    const housingRoomNumbers = ['320', '310', '327', '227', '224', '222', '220', '107', '109', '111', '104', '108']

    // Get all rooms for this event
    const rooms = await prisma.room.findMany({
      where: { building: { eventId } },
      include: { building: true }
    })

    let housingCount = 0
    let smallGroupCount = 0

    for (const room of rooms) {
      const buildingName = room.building?.name?.toLowerCase() || ''
      const roomNumber = room.roomNumber?.toLowerCase() || ''

      let newPurpose: 'housing' | 'small_group' = 'small_group' // Default to small_group

      // Check if this is a housing room
      if (buildingName.includes('off campus')) {
        newPurpose = 'housing'
      } else if (buildingName.includes('arcc') && roomNumber.includes('gym')) {
        newPurpose = 'housing'
      } else if (buildingName.includes('knott academic center') && housingRoomNumbers.includes(room.roomNumber)) {
        newPurpose = 'housing'
      }

      // Update the room
      await prisma.room.update({
        where: { id: room.id },
        data: { roomPurpose: newPurpose }
      })

      if (newPurpose === 'housing') {
        housingCount++
      } else {
        smallGroupCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${rooms.length} rooms: ${housingCount} housing, ${smallGroupCount} small_group`
    })

  } catch (error: any) {
    console.error('Fix room purposes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
