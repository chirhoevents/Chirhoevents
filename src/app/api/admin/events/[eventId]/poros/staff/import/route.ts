import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Valid staff types
const VALID_STAFF_TYPES = ['sgl', 'co_sgl', 'seminarian', 'priest', 'deacon', 'religious', 'counselor', 'volunteer', 'other']
const VALID_GENDERS = ['male', 'female']

// POST - Import staff from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = await auth()
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
    const requiredColumns = ['first name', 'last name', 'staff type']
    for (const col of requiredColumns) {
      if (headerMap[col] === undefined) {
        return NextResponse.json({ error: `Missing required column: ${col}` }, { status: 400 })
      }
    }

    // Parse data rows
    const staffToCreate: Array<{
      eventId: string
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      staffType: string
      gender: string | null
      diocese: string | null
      notes: string | null
    }> = []

    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === 0 || values.every((v: string) => !v.trim())) continue

      const firstName = values[headerMap['first name']]?.trim()
      const lastName = values[headerMap['last name']]?.trim()
      let staffType = values[headerMap['staff type']]?.trim().toLowerCase().replace(/\s+/g, '_')

      if (!firstName || !lastName) {
        errors.push(`Row ${i + 1}: Missing first or last name`)
        continue
      }

      if (!staffType || !VALID_STAFF_TYPES.includes(staffType)) {
        errors.push(`Row ${i + 1}: Invalid staff type "${staffType}". Valid types: ${VALID_STAFF_TYPES.join(', ')}`)
        continue
      }

      let gender = values[headerMap['gender']]?.trim().toLowerCase() || null
      if (gender && !VALID_GENDERS.includes(gender)) {
        gender = null // Reset invalid gender
      }

      staffToCreate.push({
        eventId: eventId,
        firstName,
        lastName,
        email: values[headerMap['email']]?.trim() || null,
        phone: values[headerMap['phone']]?.trim() || null,
        staffType,
        gender,
        diocese: values[headerMap['diocese']]?.trim() || null,
        notes: values[headerMap['notes']]?.trim() || null
      })
    }

    if (staffToCreate.length === 0) {
      return NextResponse.json({
        error: 'No valid staff records to import',
        errors
      }, { status: 400 })
    }

    // Create staff records
    const created = await prisma.porosStaff.createMany({
      data: staffToCreate as any
    })

    return NextResponse.json({
      success: true,
      staffCreated: created.count,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Staff import error:', error)
    return NextResponse.json({ error: 'Failed to import staff' }, { status: 500 })
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
