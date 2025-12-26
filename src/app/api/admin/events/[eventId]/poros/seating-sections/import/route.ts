import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Import seating sections from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter((line: string) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have a header row and at least one data row' }, { status: 400 })
    }

    // Parse header row
    const headers = parseCSVLine(lines[0])
    const headerMap: Record<string, number> = {}
    headers.forEach((h: string, i: number) => {
      headerMap[h.toLowerCase().trim()] = i
    })

    // Check required columns
    if (headerMap['name'] === undefined) {
      return NextResponse.json({ error: 'Missing required column: Name' }, { status: 400 })
    }

    // Get max display order
    const maxOrder = await prisma.seatingSection.aggregate({
      where: { eventId: params.eventId },
      _max: { displayOrder: true }
    })
    let nextOrder = (maxOrder._max.displayOrder || 0) + 1

    // Parse data rows
    const sectionsToCreate: Array<{
      eventId: string
      name: string
      sectionCode: string | null
      color: string
      capacity: number
      locationDescription: string | null
      publicVisible: boolean
      displayOrder: number
    }> = []

    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === 0 || values.every((v: string) => !v.trim())) continue

      const name = values[headerMap['name']]?.trim()

      if (!name) {
        errors.push(`Row ${i + 1}: Missing section name`)
        continue
      }

      // Parse capacity
      let capacity = 100
      const capacityStr = values[headerMap['capacity']]?.trim()
      if (capacityStr) {
        const parsed = parseInt(capacityStr, 10)
        if (!isNaN(parsed) && parsed > 0) {
          capacity = parsed
        }
      }

      // Parse display order
      let displayOrder = nextOrder++
      const orderStr = values[headerMap['display order']]?.trim()
      if (orderStr) {
        const parsed = parseInt(orderStr, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          displayOrder = parsed
        }
      }

      // Parse public visible
      let publicVisible = true
      const visibleStr = values[headerMap['public visible']]?.trim().toLowerCase()
      if (visibleStr === 'no' || visibleStr === 'false' || visibleStr === '0') {
        publicVisible = false
      }

      // Validate color format
      let color = '#1E3A5F'
      const colorStr = values[headerMap['color']]?.trim()
      if (colorStr && /^#[0-9A-Fa-f]{6}$/.test(colorStr)) {
        color = colorStr
      }

      sectionsToCreate.push({
        eventId: params.eventId,
        name,
        sectionCode: values[headerMap['section code']]?.trim() || null,
        color,
        capacity,
        locationDescription: values[headerMap['location description']]?.trim() || null,
        publicVisible,
        displayOrder
      })
    }

    if (sectionsToCreate.length === 0) {
      return NextResponse.json({
        error: 'No valid seating sections to import',
        errors
      }, { status: 400 })
    }

    // Create seating sections
    const created = await prisma.seatingSection.createMany({
      data: sectionsToCreate
    })

    return NextResponse.json({
      success: true,
      sectionsCreated: created.count,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Seating sections import error:', error)
    return NextResponse.json({ error: 'Failed to import seating sections' }, { status: 500 })
  }
}

// Helper function to parse CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip the next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
