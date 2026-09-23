import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { generateTableReportPDF, pdfResponseInit } from '@/lib/reports/generate-table-report-pdf'

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
      '[Chaperone Export]'
    )
    if (error) return error

    const body = await request.json()
    const { format } = body

    // Get all liability forms for this event
    const liabilityForms = await prisma.liabilityForm.findMany({
      where: {
        eventId,
        completed: true,
      },
      select: {
        id: true,
        participantType: true,
        participantFirstName: true,
        participantLastName: true,
        participantGender: true,
        participantEmail: true,
        participantPhone: true,
        groupRegistration: {
          select: {
            groupName: true,
            parishName: true,
            housingType: true,
          },
        },
      },
      orderBy: [{ participantType: 'asc' }, { participantLastName: 'asc' }],
    })

    // Calculate stats
    type LiabilityFormRecord = typeof liabilityForms[number]

    const maleYouth = liabilityForms.filter(
      (f: LiabilityFormRecord) =>
        (f.participantType === 'youth_u18' || f.participantType === 'youth_o18') &&
        f.participantGender === 'male'
    ).length

    const femaleYouth = liabilityForms.filter(
      (f: LiabilityFormRecord) =>
        (f.participantType === 'youth_u18' || f.participantType === 'youth_o18') &&
        f.participantGender === 'female'
    ).length

    const maleChaperones = liabilityForms.filter(
      (f: LiabilityFormRecord) => f.participantType === 'chaperone' && f.participantGender === 'male'
    )

    const femaleChaperones = liabilityForms.filter(
      (f: LiabilityFormRecord) => f.participantType === 'chaperone' && f.participantGender === 'female'
    )

    const maleRatio = maleChaperones.length > 0 ? maleYouth / maleChaperones.length : null
    const femaleRatio = femaleChaperones.length > 0 ? femaleYouth / femaleChaperones.length : null

    if (format === 'csv') {
      // Generate CSV
      const lines: string[] = []
      lines.push(`CHAPERONE SUMMARY REPORT - ${event!.name}`)
      lines.push(`Generated: ${new Date().toLocaleString()}`)
      lines.push('')
      lines.push('YOUTH BREAKDOWN')
      lines.push(`Male Youth,${maleYouth}`)
      lines.push(`Female Youth,${femaleYouth}`)
      lines.push(`Total Youth,${maleYouth + femaleYouth}`)
      lines.push('')
      lines.push('CHAPERONE BREAKDOWN')
      lines.push(`Male Chaperones,${maleChaperones.length}`)
      lines.push(`Female Chaperones,${femaleChaperones.length}`)
      lines.push(`Total Chaperones,${maleChaperones.length + femaleChaperones.length}`)
      lines.push('')
      lines.push('RATIOS')
      lines.push(`Male Ratio (Youth:Chaperone),${maleRatio ? maleRatio.toFixed(1) + ':1' : 'N/A'}`)
      lines.push(`Female Ratio (Youth:Chaperone),${femaleRatio ? femaleRatio.toFixed(1) + ':1' : 'N/A'}`)
      lines.push('')
      lines.push('MALE CHAPERONES')
      lines.push('Name,Group/Parish,Email,Phone')
      maleChaperones.forEach((c: LiabilityFormRecord) => {
        lines.push(
          `"${c.participantFirstName} ${c.participantLastName}","${c.groupRegistration?.parishName || c.groupRegistration?.groupName || 'Unknown'}","${c.participantEmail || ''}","${c.participantPhone || ''}"`
        )
      })
      lines.push('')
      lines.push('FEMALE CHAPERONES')
      lines.push('Name,Group/Parish,Email,Phone')
      femaleChaperones.forEach((c: LiabilityFormRecord) => {
        lines.push(
          `"${c.participantFirstName} ${c.participantLastName}","${c.groupRegistration?.parishName || c.groupRegistration?.groupName || 'Unknown'}","${c.participantEmail || ''}","${c.participantPhone || ''}"`
        )
      })

      const csv = lines.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="chaperone_report_${event!.name.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      const REQUIRED_RATIO = 10
      const maleCompliant = maleRatio === null || maleRatio <= REQUIRED_RATIO
      const femaleCompliant = femaleRatio === null || femaleRatio <= REQUIRED_RATIO
      const overallCompliant = maleCompliant && femaleCompliant
      const fmtRatio = (r: number | null) => (r ? `${r.toFixed(1)}:1` : 'N/A')

      const chaperoneColumns = [
        { label: 'Name', weight: 3 },
        { label: 'Group/Parish', weight: 4 },
        { label: 'Email', weight: 4 },
        { label: 'Phone', weight: 2 },
      ]
      const chaperoneRows = (list: LiabilityFormRecord[]) =>
        list.map((c: LiabilityFormRecord) => [
          `${c.participantFirstName} ${c.participantLastName}`,
          c.groupRegistration?.parishName || c.groupRegistration?.groupName || 'Unknown',
          c.participantEmail || '',
          c.participantPhone || '',
        ])

      const complianceLines: Array<[string, string]> = [
        [
          'Overall',
          `${overallCompliant ? 'Meets' : 'Does NOT meet'} the ${REQUIRED_RATIO}:1 ratio requirement`,
        ],
      ]
      if (!maleCompliant) complianceLines.push(['Male', `Ratio exceeds limit (${fmtRatio(maleRatio)})`])
      if (!femaleCompliant) complianceLines.push(['Female', `Ratio exceeds limit (${fmtRatio(femaleRatio)})`])

      const pdfBuffer = await generateTableReportPDF({
        title: 'Chaperone Summary Report',
        eventName: event!.name,
        sections: [
          {
            title: 'Summary',
            summary: [
              ['Male Youth', String(maleYouth)],
              ['Female Youth', String(femaleYouth)],
              ['Total Youth', String(maleYouth + femaleYouth)],
              ['Male Chaperones', String(maleChaperones.length)],
              ['Female Chaperones', String(femaleChaperones.length)],
              ['Total Chaperones', String(maleChaperones.length + femaleChaperones.length)],
              ['Male Ratio (Youth:Chaperone)', fmtRatio(maleRatio)],
              ['Female Ratio (Youth:Chaperone)', fmtRatio(femaleRatio)],
            ],
          },
          { title: 'Compliance', summary: complianceLines },
          {
            title: `Male Chaperones (${maleChaperones.length})`,
            columns: chaperoneColumns,
            rows: chaperoneRows(maleChaperones),
            emptyText: 'No male chaperones.',
          },
          {
            title: `Female Chaperones (${femaleChaperones.length})`,
            columns: chaperoneColumns,
            rows: chaperoneRows(femaleChaperones),
            emptyText: 'No female chaperones.',
          },
        ],
      })

      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`chaperone_report_${event!.name}.pdf`))
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Chaperone report export error:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}
