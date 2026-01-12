import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// Force dynamic - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Using raw SQL since Prisma client may not have the new model yet
// This allows us to work immediately after creating the table

// GET - Get current imported data for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Data Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Use raw query to avoid Prisma client model dependency
    const results = await prisma.$queryRaw<any[]>`
      SELECT id, event_id as "eventId", json_data as "jsonData",
             file_name as "fileName", imported_at as "importedAt",
             updated_at as "updatedAt"
      FROM poros_event_data_imports
      WHERE event_id = ${eventId}::uuid
      LIMIT 1
    `

    const dataImport = results.length > 0 ? results[0] : null

    // Return with no-cache headers
    return NextResponse.json({ dataImport }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  } catch (error: any) {
    console.error('Failed to fetch data import:', error)
    // If table doesn't exist, return null gracefully
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json({ dataImport: null }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      })
    }
    return NextResponse.json({ error: 'Failed to fetch data import', details: error?.message }, { status: 500 })
  }
}

// POST - Import JSON data for an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Data Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { jsonData, fileName } = body

    if (!jsonData || typeof jsonData !== 'object') {
      return NextResponse.json(
        { error: 'Valid JSON data is required' },
        { status: 400 }
      )
    }

    // Validate required fields in JSON
    const requiredFields = ['youthGroups']
    for (const field of requiredFields) {
      if (!jsonData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const fileNameValue = fileName || 'm2k_housing_data.json'
    const jsonString = JSON.stringify(jsonData)

    // Use raw SQL upsert (INSERT ON CONFLICT)
    await prisma.$executeRaw`
      INSERT INTO poros_event_data_imports (id, event_id, json_data, file_name, imported_at, updated_at)
      VALUES (gen_random_uuid(), ${eventId}::uuid, ${jsonString}::jsonb, ${fileNameValue}, NOW(), NOW())
      ON CONFLICT (event_id)
      DO UPDATE SET json_data = ${jsonString}::jsonb, file_name = ${fileNameValue}, updated_at = NOW()
    `

    // Fetch the result
    const results = await prisma.$queryRaw<any[]>`
      SELECT id, event_id as "eventId", json_data as "jsonData",
             file_name as "fileName", imported_at as "importedAt",
             updated_at as "updatedAt"
      FROM poros_event_data_imports
      WHERE event_id = ${eventId}::uuid
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      dataImport: results[0],
      message: 'Data imported successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to import data:', error)
    // Check if table doesn't exist
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json({
        error: 'Database table not found. Please run the SQL migration to create poros_event_data_imports table.',
        details: error?.message
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to import data', details: error?.message }, { status: 500 })
  }
}

// DELETE - Remove imported data for an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Data Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.$executeRaw`
      DELETE FROM poros_event_data_imports WHERE event_id = ${eventId}::uuid
    `

    return NextResponse.json({ success: true, message: 'Data import deleted' })
  } catch (error: any) {
    console.error('Failed to delete data import:', error)
    return NextResponse.json({ error: 'Failed to delete data import', details: error?.message }, { status: 500 })
  }
}
