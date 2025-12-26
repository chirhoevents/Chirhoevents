import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: { eventId: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin()
    const { eventId } = await Promise.resolve(params)

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get form data with file
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Expected columns: Color Name, Color Hex, Breakfast Time, Lunch Time, Dinner Time, Capacity, Active
    const nameIndex = headers.findIndex(h => h.includes('color') && h.includes('name'))
    const hexIndex = headers.findIndex(h => h.includes('hex'))
    const breakfastIndex = headers.findIndex(h => h.includes('breakfast'))
    const lunchIndex = headers.findIndex(h => h.includes('lunch'))
    const dinnerIndex = headers.findIndex(h => h.includes('dinner'))
    const capacityIndex = headers.findIndex(h => h.includes('capacity'))
    const activeIndex = headers.findIndex(h => h.includes('active'))

    if (nameIndex === -1) {
      return NextResponse.json({ error: 'Missing required column: Color Name' }, { status: 400 })
    }

    // Parse data rows
    const mealGroupsToCreate: any[] = []
    let displayOrder = 0

    // Get existing order count
    const existingCount = await prisma.mealGroup.count({
      where: { eventId },
    })
    displayOrder = existingCount

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim())

      const name = row[nameIndex]
      if (!name) continue // Skip empty rows

      const colorHex = hexIndex !== -1 ? row[hexIndex] : '#6B7280'
      const breakfastTime = breakfastIndex !== -1 ? row[breakfastIndex] || null : null
      const lunchTime = lunchIndex !== -1 ? row[lunchIndex] || null : null
      const dinnerTime = dinnerIndex !== -1 ? row[dinnerIndex] || null : null
      const capacity = capacityIndex !== -1 ? parseInt(row[capacityIndex]) || 100 : 100
      const isActive = activeIndex !== -1 ? row[activeIndex]?.toLowerCase() === 'true' : true

      mealGroupsToCreate.push({
        eventId,
        name,
        color: name, // Use name as color identifier
        colorHex: colorHex.startsWith('#') ? colorHex : `#${colorHex}`,
        breakfastTime,
        lunchTime,
        dinnerTime,
        capacity,
        currentSize: 0,
        displayOrder: displayOrder++,
        isActive,
      })
    }

    if (mealGroupsToCreate.length === 0) {
      return NextResponse.json({ error: 'No valid meal groups found in CSV' }, { status: 400 })
    }

    // Create meal groups
    const result = await prisma.mealGroup.createMany({
      data: mealGroupsToCreate,
    })

    return NextResponse.json({
      success: true,
      created: result.count,
      message: `Successfully imported ${result.count} meal groups`,
    })
  } catch (error) {
    console.error('Error importing meal groups:', error)
    return NextResponse.json(
      { error: 'Failed to import meal groups' },
      { status: 500 }
    )
  }
}
