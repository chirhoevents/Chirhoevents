import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

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
      // Generate simple text-based PDF content (using HTML for now)
      const REQUIRED_RATIO = 10
      const maleCompliant = maleRatio === null || maleRatio <= REQUIRED_RATIO
      const femaleCompliant = femaleRatio === null || femaleRatio <= REQUIRED_RATIO
      const overallCompliant = maleCompliant && femaleCompliant

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chaperone Summary Report - ${event!.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #1E3A5F; }
    h1 { color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 10px; }
    h2 { color: #1E3A5F; margin-top: 30px; }
    .summary-box { background: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat { display: inline-block; margin-right: 40px; margin-bottom: 10px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1E3A5F; }
    .stat-label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #1E3A5F; color: white; }
    .compliance-pass { color: #059669; font-weight: bold; }
    .compliance-fail { color: #DC2626; font-weight: bold; }
    .ratio-box { background: #fff; padding: 15px; border: 1px solid #9C8466; border-radius: 8px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>CHAPERONE SUMMARY REPORT</h1>
  <p><strong>${event!.name}</strong></p>
  <p>Generated: ${new Date().toLocaleString()}</p>

  <div class="summary-box">
    <h2 style="margin-top: 0;">YOUTH</h2>
    <div class="stat">
      <div class="stat-value">${maleYouth}</div>
      <div class="stat-label">Male Youth</div>
    </div>
    <div class="stat">
      <div class="stat-value">${femaleYouth}</div>
      <div class="stat-label">Female Youth</div>
    </div>
    <div class="stat">
      <div class="stat-value">${maleYouth + femaleYouth}</div>
      <div class="stat-label">Total Youth</div>
    </div>
  </div>

  <h2>MALE CHAPERONES (${maleChaperones.length})</h2>
  <table>
    <tr><th>Name</th><th>Group/Parish</th><th>Email</th><th>Phone</th></tr>
    ${maleChaperones.map((c: LiabilityFormRecord) => `
      <tr>
        <td>${c.participantFirstName} ${c.participantLastName}</td>
        <td>${c.groupRegistration?.parishName || c.groupRegistration?.groupName || 'Unknown'}</td>
        <td>${c.participantEmail || '-'}</td>
        <td>${c.participantPhone || '-'}</td>
      </tr>
    `).join('')}
  </table>

  <h2>FEMALE CHAPERONES (${femaleChaperones.length})</h2>
  <table>
    <tr><th>Name</th><th>Group/Parish</th><th>Email</th><th>Phone</th></tr>
    ${femaleChaperones.map((c: LiabilityFormRecord) => `
      <tr>
        <td>${c.participantFirstName} ${c.participantLastName}</td>
        <td>${c.groupRegistration?.parishName || c.groupRegistration?.groupName || 'Unknown'}</td>
        <td>${c.participantEmail || '-'}</td>
        <td>${c.participantPhone || '-'}</td>
      </tr>
    `).join('')}
  </table>

  <h2>RATIOS</h2>
  <div class="ratio-box">
    <p><strong>Male:</strong> ${maleYouth} youth / ${maleChaperones.length} chaperones = ${maleRatio ? maleRatio.toFixed(1) + ':1' : 'N/A'}</p>
    <p><strong>Female:</strong> ${femaleYouth} youth / ${femaleChaperones.length} chaperones = ${femaleRatio ? femaleRatio.toFixed(1) + ':1' : 'N/A'}</p>
  </div>

  <h2>COMPLIANCE</h2>
  <p class="${overallCompliant ? 'compliance-pass' : 'compliance-fail'}">
    ${overallCompliant ? '✓' : '✗'} ${overallCompliant ? 'Meets' : 'Does NOT meet'} ${REQUIRED_RATIO}:1 ratio requirement
  </p>
  ${!maleCompliant ? `<p class="compliance-fail">⚠ Male ratio exceeds limit (${maleRatio?.toFixed(1)}:1)</p>` : ''}
  ${!femaleCompliant ? `<p class="compliance-fail">⚠ Female ratio exceeds limit (${femaleRatio?.toFixed(1)}:1)</p>` : ''}
</body>
</html>
      `

      // Return HTML for now - can be converted to PDF on client
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="chaperone_report_${event!.name.replace(/\s+/g, '_')}.html"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Chaperone report export error:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}
