import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateRegistrationCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { RegistrationReportPDF } from '@/lib/reports/pdf-generator'
import React from 'react'

// Helper to sanitize report data and ensure all values are primitives
function sanitizeReportData(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeReportData(item))
  }

  if (typeof data === 'object') {
    // Check for React element (has $$typeof property) - skip these
    if (data.$$typeof) {
      console.error('[Registration Export] Found React element in data, converting to string')
      return '[React Element]'
    }

    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString()
    }

    // Handle BigInt
    if (typeof data === 'bigint') {
      return Number(data)
    }

    // Recursively sanitize object properties
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeReportData(value)
    }
    return sanitized
  }

  // For any other type, convert to string
  return String(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, user, event, effectiveOrgId } = await verifyReportAccess(
      request,
      eventId,
      '[Registration Export]'
    )
    if (error) return error

    const { format } = await request.json()

    // Use direct database query instead of internal fetch to avoid potential issues
    // with cookie forwarding, URL configuration, or caching
    const { prisma } = await import('@/lib/prisma')

    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get registrations
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: eventFilter,
      include: { participants: true },
    })

    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: eventFilter,
    })

    const groupCount = groupRegistrations.length
    const groupParticipants = groupRegistrations.reduce(
      (sum: number, g: any) => sum + g.participants.length,
      0
    )
    const individualCount = individualRegistrations.length
    const totalRegistrations = groupParticipants + individualCount
    const avgGroupSize = groupCount > 0 ? groupParticipants / groupCount : 0

    // Demographics
    const demographics: any = {
      youth_u18: { total: 0, male: 0, female: 0 },
      youth_o18: { total: 0, male: 0, female: 0 },
      chaperones: { total: 0, male: 0, female: 0 },
      clergy: { total: 0, male: 0, female: 0 },
    }

    // Count from group participants
    for (const group of groupRegistrations) {
      for (const p of group.participants) {
        const type = p.participantType
        if (type && demographics[type]) {
          demographics[type].total++
          if (p.gender === 'male') demographics[type].male++
          if (p.gender === 'female') demographics[type].female++
        }
      }
    }

    // Count from individual registrations
    for (const ind of individualRegistrations) {
      const age = ind.age
      if (age !== null) {
        const type = age < 18 ? 'youth_u18' : 'youth_o18'
        demographics[type].total++
        if (ind.gender === 'male') demographics[type].male++
        if (ind.gender === 'female') demographics[type].female++
      }
    }

    // Housing breakdown
    const housingBreakdown: any = {
      on_campus: 0,
      off_campus: 0,
      day_pass: 0,
    }

    for (const group of groupRegistrations) {
      if (group.housingType && housingBreakdown[group.housingType] !== undefined) {
        housingBreakdown[group.housingType] += group.participants.length
      }
    }
    for (const ind of individualRegistrations) {
      if (ind.housingType && housingBreakdown[ind.housingType] !== undefined) {
        housingBreakdown[ind.housingType]++
      }
    }

    // Top groups
    const topGroups = groupRegistrations
      .map((g: any) => ({
        name: String(g.groupName || g.parishName || 'Unknown'),
        count: Number(g.participants.length || 0),
      }))
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)

    const reportData = sanitizeReportData({
      totalRegistrations,
      groupCount,
      groupParticipants,
      individualCount,
      avgGroupSize,
      demographics,
      housingBreakdown,
      topGroups,
    })

    const eventName = String(event?.name || 'Event')

    // Validate report data has required fields
    if (typeof reportData.totalRegistrations !== 'number') {
      console.error('[Registration Export] Invalid report data: missing totalRegistrations')
      return NextResponse.json({ error: 'Invalid report data' }, { status: 500 })
    }

    console.log('[Registration Export] Report data summary:', {
      totalRegistrations: reportData.totalRegistrations,
      groupCount: reportData.groupCount,
      individualCount: reportData.individualCount,
      format,
    })

    if (format === 'csv') {
      const csv = generateRegistrationCSV(reportData)
      console.log('[Registration Export] CSV generated, length:', csv.length)
      if (!csv || csv.length < 10) {
        console.error('[Registration Export] CSV generation produced empty/small output')
        return NextResponse.json({ error: 'CSV generation failed' }, { status: 500 })
      }
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="registration_report.csv"',
        },
      })
    } else if (format === 'pdf') {
      try {
        // Generate actual PDF using @react-pdf/renderer
        console.log('[Registration Export] Starting PDF generation...')
        const pdfElement = RegistrationReportPDF({ reportData, eventName })
        console.log('[Registration Export] PDF element created, rendering to buffer...')
        const pdfBuffer = await renderToBuffer(pdfElement)
        console.log('[Registration Export] PDF buffer generated, size:', pdfBuffer.length)

        // Validate PDF buffer - a valid PDF should be at least a few KB
        if (!pdfBuffer || pdfBuffer.length < 100) {
          console.error('[Registration Export] PDF generation produced empty/small buffer:', pdfBuffer?.length)
          return NextResponse.json({ error: 'PDF generation failed - empty output' }, { status: 500 })
        }

        // Convert Buffer to Uint8Array for NextResponse
        const pdfData = new Uint8Array(pdfBuffer)
        return new NextResponse(pdfData, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="registration_report.pdf"',
          },
        })
      } catch (pdfError) {
        console.error('[Registration Export] PDF generation error:', pdfError)
        return NextResponse.json({ error: 'PDF generation failed: ' + String(pdfError) }, { status: 500 })
      }
    }

    console.error('[Registration Export] Invalid format requested:', format)
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('[Registration Export] Error:', error)
    return NextResponse.json({ error: 'Export failed: ' + String(error) }, { status: 500 })
  }
}
