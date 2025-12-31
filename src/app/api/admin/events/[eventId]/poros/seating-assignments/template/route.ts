import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireAdmin()
    const { eventId } = await params

    // Fetch existing sections
    const sections = await prisma.seatingSection.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    })

    // Fetch all group registrations with participants
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
          orderBy: { lastName: 'asc' },
        },
      },
      orderBy: { parishName: 'asc' },
    })

    // Fetch individual registrations
    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: { eventId },
      orderBy: { lastName: 'asc' },
    })

    // Build CSV content
    const headers = ['Section Name', 'Max Capacity', 'Participant Name', 'Registration ID', 'Group Name']

    const rows: string[][] = []

    // Add section info header if sections exist
    if (sections.length > 0) {
      rows.push(['# Available Sections:'])
      for (const section of sections) {
        rows.push([`# ${section.name} (Capacity: ${section.capacity}, Current: ${section.currentOccupancy})`])
      }
      rows.push(['#'])
    }

    rows.push(['# Instructions:'])
    rows.push(['# 1. Fill in the Section Name column for each participant'])
    rows.push(['# 2. New sections will be created automatically if they do not exist'])
    rows.push(['# 3. Delete rows for participants you do not want to assign'])
    rows.push(['# 4. Do not modify the Registration ID column'])
    rows.push(['#'])

    // Add the actual header row
    rows.push(headers)

    // Add group participants
    for (const group of groupRegistrations) {
      for (const participant of group.participants) {
        rows.push([
          '', // Section Name (to be filled)
          '50', // Default max capacity for new sections
          `${participant.firstName} ${participant.lastName}`,
          group.id,
          group.parishName || '',
        ])
      }
    }

    // Add individual registrations
    for (const individual of individualRegistrations) {
      rows.push([
        '', // Section Name (to be filled)
        '50', // Default max capacity for new sections
        `${individual.firstName} ${individual.lastName}`,
        individual.id,
        '', // No group name for individuals
      ])
    }

    // Convert to CSV
    const csvContent = rows.map(row => {
      if (typeof row[0] === 'string' && row[0].startsWith('#')) {
        return row[0] // Keep comment rows as-is
      }
      return row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = String(cell).replace(/"/g, '""')
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
          ? `"${escaped}"`
          : escaped
      }).join(',')
    }).join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="seating-assignments-template-${eventId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate seating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
