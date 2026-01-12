import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

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

    const dataImport = await prisma.porosEventDataImport.findUnique({
      where: { eventId }
    })

    return NextResponse.json({ dataImport })
  } catch (error) {
    console.error('Failed to fetch data import:', error)
    return NextResponse.json({ error: 'Failed to fetch data import' }, { status: 500 })
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

    // Upsert the data import (create or update)
    const dataImport = await prisma.porosEventDataImport.upsert({
      where: { eventId },
      create: {
        eventId,
        jsonData,
        fileName: fileName || 'm2k_housing_data.json'
      },
      update: {
        jsonData,
        fileName: fileName || 'm2k_housing_data.json'
      }
    })

    return NextResponse.json({
      success: true,
      dataImport,
      message: 'Data imported successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to import data:', error)
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 })
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

    await prisma.porosEventDataImport.delete({
      where: { eventId }
    })

    return NextResponse.json({ success: true, message: 'Data import deleted' })
  } catch (error) {
    console.error('Failed to delete data import:', error)
    return NextResponse.json({ error: 'Failed to delete data import' }, { status: 500 })
  }
}
