import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/meal-groups/import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Meal Groups Import] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
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

    // Expected columns: Color Name, Color Hex, Sat Breakfast, Sat Lunch, Sat Dinner, Sun Breakfast, Capacity, Active
    const nameIndex = headers.findIndex(h => h.includes('color') && h.includes('name'))
    const hexIndex = headers.findIndex(h => h.includes('hex'))
    // Support both "sat breakfast" and legacy "breakfast" column names
    const breakfastIndex = headers.findIndex(h => h.includes('sat') && h.includes('breakfast')) !== -1
      ? headers.findIndex(h => h.includes('sat') && h.includes('breakfast'))
      : headers.findIndex(h => h.includes('breakfast') && !h.includes('sun'))
    const lunchIndex = headers.findIndex(h => h.includes('lunch'))
    const dinnerIndex = headers.findIndex(h => h.includes('dinner'))
    const sundayBreakfastIndex = headers.findIndex(h => h.includes('sun') && h.includes('breakfast'))
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
      const sundayBreakfastTime = sundayBreakfastIndex !== -1 ? row[sundayBreakfastIndex] || null : null
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
        sundayBreakfastTime,
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
