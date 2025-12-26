import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SeatingSectionRecord {
  name: string
  sectionCode: string | null
  color: string
  capacity: number
  locationDescription: string | null
  publicVisible: boolean
  displayOrder: number
}

// GET - Export seating sections to CSV
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sections = await prisma.seatingSection.findMany({
      where: { eventId: params.eventId },
      orderBy: { displayOrder: 'asc' }
    })

    // Build CSV header
    const headers = [
      'Name',
      'Section Code',
      'Color',
      'Capacity',
      'Location Description',
      'Public Visible',
      'Display Order'
    ]

    // Build CSV rows
    const rows = sections.map((s: SeatingSectionRecord) => [
      s.name,
      s.sectionCode || '',
      s.color,
      s.capacity.toString(),
      (s.locationDescription || '').replace(/"/g, '""'),
      s.publicVisible ? 'Yes' : 'No',
      s.displayOrder.toString()
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="seating-sections-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Seating sections export error:', error)
    return NextResponse.json({ error: 'Failed to export seating sections' }, { status: 500 })
  }
}
