import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface StaffRecord {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  staffType: string
  gender: string | null
  diocese: string | null
  notes: string | null
}

// GET - Export staff to CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staff = await prisma.porosStaff.findMany({
      where: { eventId: eventId },
      orderBy: [{ staffType: 'asc' }, { lastName: 'asc' }]
    })

    // Build CSV header
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Staff Type',
      'Gender',
      'Diocese',
      'Notes'
    ]

    // Build CSV rows
    const rows = staff.map((s: StaffRecord) => [
      s.firstName,
      s.lastName,
      s.email || '',
      s.phone || '',
      s.staffType,
      s.gender || '',
      s.diocese || '',
      (s.notes || '').replace(/"/g, '""') // Escape quotes
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="staff-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Staff export error:', error)
    return NextResponse.json({ error: 'Failed to export staff' }, { status: 500 })
  }
}
