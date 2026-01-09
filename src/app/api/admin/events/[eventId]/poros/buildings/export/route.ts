import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Poros Buildings Export]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Poros Buildings Export] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const buildings = await prisma.building.findMany({
      where: { eventId: eventId },
      include: { rooms: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
    })

    // Build CSV
    let csv = 'Building Name,Gender,Housing Type,Total Floors,Room Number,Floor,Room Type,Capacity,Is ADA Accessible,ADA Features,Notes\n'

    for (const building of buildings) {
      for (const room of building.rooms) {
        const escapeCsv = (val: string | null | undefined) => {
          if (!val) return ''
          // Escape quotes and wrap in quotes if contains comma or quote
          if (val.includes(',') || val.includes('"')) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }

        csv += [
          escapeCsv(building.name),
          building.gender || '',
          building.housingType || '',
          building.totalFloors,
          escapeCsv(room.roomNumber),
          room.floor,
          room.roomType || 'double',
          room.capacity,
          room.isAdaAccessible ? 'true' : 'false',
          escapeCsv(room.adaFeatures),
          escapeCsv(room.notes)
        ].join(',') + '\n'
      }
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="housing-export-${eventId}.csv"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
