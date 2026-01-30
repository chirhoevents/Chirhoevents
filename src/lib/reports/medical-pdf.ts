/**
 * Medical Report PDF generation using PDFKit directly.
 * This bypasses @react-pdf/renderer's React reconciler which has
 * compatibility issues with the project's React version.
 */

// Helper: show detected keywords or fall back to raw text, never "See notes"
function formatItems(items: string[] | undefined, fullText: string | undefined): string {
  const filtered = (items || []).filter((i: string) => i && i !== 'See notes')
  if (filtered.length > 0) return filtered.join(', ')
  if (fullText) return fullText
  return ''
}

interface StudentRow {
  name: string
  group: string
  allergies: string
  dietary: string
  severity: string
}

interface BreakdownItem {
  type: string
  count: number
}

function prepareMedicalData(reportData: any) {
  const studentObj: Record<string, StudentRow> = {}

  const getOrCreate = (detail: any): StudentRow => {
    const key = String(detail.name || 'Unknown')
    if (!studentObj[key]) {
      studentObj[key] = {
        name: key,
        group: String(detail.group || 'Individual'),
        allergies: '',
        dietary: '',
        severity: '',
      }
    }
    return studentObj[key]
  }

  if (reportData.foodAllergies?.details) {
    for (const d of reportData.foodAllergies.details) {
      const s = getOrCreate(d)
      s.allergies = formatItems(d.allergies, d.fullText)
      s.severity = d.severity || ''
    }
  }
  if (reportData.dietaryRestrictions?.details) {
    for (const d of reportData.dietaryRestrictions.details) {
      const s = getOrCreate(d)
      s.dietary = formatItems(d.restrictions, d.fullText)
    }
  }

  const students = Object.values(studentObj).sort((a, b) => {
    if (a.severity === 'SEVERE' && b.severity !== 'SEVERE') return -1
    if (a.severity !== 'SEVERE' && b.severity === 'SEVERE') return 1
    return a.name.localeCompare(b.name)
  })

  // Count types
  const allergyCounts: Record<string, number> = {}
  const dietaryCounts: Record<string, number> = {}
  for (const s of students) {
    if (s.allergies) {
      for (const item of s.allergies.split(', ')) {
        if (item) allergyCounts[item] = (allergyCounts[item] || 0) + 1
      }
    }
    if (s.dietary) {
      for (const item of s.dietary.split(', ')) {
        if (item) dietaryCounts[item] = (dietaryCounts[item] || 0) + 1
      }
    }
  }

  const allergyBreakdown: BreakdownItem[] = Object.entries(allergyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }))

  const dietaryBreakdown: BreakdownItem[] = Object.entries(dietaryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }))

  return {
    students,
    allergyBreakdown,
    dietaryBreakdown,
    allergiesCount: reportData.summary?.foodAllergiesCount ?? reportData.foodAllergies?.total ?? 0,
    dietaryCount: reportData.summary?.dietaryRestrictionsCount ?? reportData.dietaryRestrictions?.total ?? 0,
    medicalCount: reportData.summary?.medicalConditionsCount ?? reportData.medicalConditions?.total ?? 0,
    medsCount: reportData.summary?.medicationsCount ?? reportData.medications?.total ?? 0,
  }
}

export async function generateMedicalPDF(reportData: any, eventName: string): Promise<Buffer> {
  // Dynamic import to avoid bundling issues
  const PDFDocument = (await import('pdfkit')).default

  const data = prepareMedicalData(reportData)

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width - 80 // 40px margins each side
      const navy = '#1E3A5F'
      const tan = '#9C8466'
      const red = '#DC2626'
      const orange = '#EA580C'
      const gray = '#6B7280'

      // === HEADER ===
      doc.fontSize(22).fillColor(navy).font('Helvetica-Bold')
        .text('Dietary & Medical Report', 40, 40)
      doc.fontSize(11).fillColor(gray).font('Helvetica')
        .text(eventName, 40, 65)
        .text(`Generated: ${new Date().toLocaleDateString()}`, 40, 80)

      // Header underline
      doc.moveTo(40, 98).lineTo(40 + pageWidth, 98)
        .strokeColor(navy).lineWidth(2).stroke()

      // === WARNING BOX ===
      const warningY = 108
      doc.rect(40, warningY, pageWidth, 24).fillColor('#FEF2F2').fill()
      doc.rect(40, warningY, 3, 24).fillColor(red).fill()
      doc.fontSize(9).fillColor('#991B1B').font('Helvetica-Bold')
        .text('CRITICAL INFORMATION FOR EVENT SAFETY', 50, warningY + 7)

      // === SUMMARY BOX ===
      const sumY = warningY + 34
      doc.rect(40, sumY, pageWidth, 50).fillColor('#F5F1E8').fill()
      doc.rect(40, sumY, 3, 50).fillColor(tan).fill()

      const colW = pageWidth / 4
      const summaryItems = [
        { label: 'Allergies', value: String(data.allergiesCount), color: red },
        { label: 'Dietary', value: String(data.dietaryCount), color: orange },
        { label: 'Medical', value: String(data.medicalCount), color: '#2563EB' },
        { label: 'Medications', value: String(data.medsCount), color: '#9333EA' },
      ]
      summaryItems.forEach((item, i) => {
        const x = 50 + i * colW
        doc.fontSize(8).fillColor(gray).font('Helvetica')
          .text(item.label, x, sumY + 8, { width: colW - 10, align: 'center' })
        doc.fontSize(18).fillColor(item.color).font('Helvetica-Bold')
          .text(item.value, x, sumY + 22, { width: colW - 10, align: 'center' })
      })

      // === STUDENT TABLE ===
      let y = sumY + 60
      doc.fontSize(13).fillColor(navy).font('Helvetica-Bold')
        .text(`Student Details (${data.students.length} students)`, 40, y)
      y += 18

      // Section underline
      doc.moveTo(40, y).lineTo(40 + pageWidth, y)
        .strokeColor(tan).lineWidth(1).stroke()
      y += 6

      // Table header
      const colName = 130
      const colGroup = 100
      const colAllergy = 160
      const colDietary = pageWidth - colName - colGroup - colAllergy

      doc.rect(40, y, pageWidth, 18).fillColor(navy).fill()
      doc.fontSize(8).fillColor('white').font('Helvetica-Bold')
      doc.text('Name', 44, y + 5, { width: colName })
      doc.text('Group', 44 + colName, y + 5, { width: colGroup })
      doc.text('Allergies', 44 + colName + colGroup, y + 5, { width: colAllergy })
      doc.text('Dietary', 44 + colName + colGroup + colAllergy, y + 5, { width: colDietary })
      y += 18

      // Table rows
      for (let i = 0; i < data.students.length; i++) {
        const student = data.students[i]

        // Calculate row height based on content
        const nameText = student.name + (student.severity === 'SEVERE' ? ' [SEVERE]' : '')
        const allergyText = student.allergies || '--'
        const dietaryText = student.dietary || '--'

        // Estimate height (approximate - PDFKit doesn't have easy height calculation)
        const maxTextLen = Math.max(allergyText.length, dietaryText.length, nameText.length)
        const rowHeight = Math.max(16, Math.ceil(maxTextLen / 25) * 12)

        // Check if we need a new page
        if (y + rowHeight > doc.page.height - 80) {
          doc.addPage()
          y = 40
        }

        // Row background
        if (student.severity === 'SEVERE') {
          doc.rect(40, y, pageWidth, rowHeight).fillColor('#FEF2F2').fill()
        } else if (i % 2 === 1) {
          doc.rect(40, y, pageWidth, rowHeight).fillColor('#F9FAFB').fill()
        }

        const textY = y + 4
        doc.fontSize(9).font('Helvetica-Bold').fillColor(navy)
          .text(nameText, 44, textY, { width: colName - 4, lineBreak: true })
        doc.fontSize(8).font('Helvetica').fillColor(gray)
          .text(student.group, 44 + colName, textY, { width: colGroup - 4, lineBreak: true })
        doc.fontSize(9).font('Helvetica').fillColor('#111827')
          .text(allergyText, 44 + colName + colGroup, textY, { width: colAllergy - 4, lineBreak: true })
          .text(dietaryText, 44 + colName + colGroup + colAllergy, textY, { width: colDietary - 4, lineBreak: true })

        // Row border
        doc.moveTo(40, y + rowHeight).lineTo(40 + pageWidth, y + rowHeight)
          .strokeColor('#eeeeee').lineWidth(0.5).stroke()

        y += rowHeight
      }

      // === ALLERGY BREAKDOWN ===
      if (data.allergyBreakdown.length > 0) {
        if (y + 60 > doc.page.height - 80) {
          doc.addPage()
          y = 40
        }

        y += 15
        doc.fontSize(11).fillColor(navy).font('Helvetica-Bold')
          .text('Allergy Totals by Type', 40, y)
        y += 16

        // Left border accent
        const breakdownStartY = y
        for (const item of data.allergyBreakdown) {
          if (y + 16 > doc.page.height - 80) {
            doc.addPage()
            y = 40
          }
          doc.fontSize(9).font('Helvetica').fillColor('#374151')
            .text(item.type, 50, y, { width: 250 })
          doc.fontSize(9).font('Helvetica-Bold').fillColor(red)
            .text(`${item.count} ${item.count === 1 ? 'student' : 'students'}`, 300, y, { width: 200, align: 'right' })
          y += 14
        }

        // Total line
        doc.moveTo(50, y).lineTo(40 + pageWidth, y)
          .strokeColor(red).lineWidth(1.5).stroke()
        y += 4
        doc.fontSize(10).font('Helvetica-Bold').fillColor(navy)
          .text('Total with Allergies', 50, y, { width: 250 })
        doc.fontSize(10).font('Helvetica-Bold').fillColor(red)
          .text(String(data.allergiesCount), 300, y, { width: 200, align: 'right' })
        y += 18
      }

      // === DIETARY BREAKDOWN ===
      if (data.dietaryBreakdown.length > 0) {
        if (y + 60 > doc.page.height - 80) {
          doc.addPage()
          y = 40
        }

        y += 10
        doc.fontSize(11).fillColor(navy).font('Helvetica-Bold')
          .text('Dietary Restriction Totals by Type', 40, y)
        y += 16

        for (const item of data.dietaryBreakdown) {
          if (y + 16 > doc.page.height - 80) {
            doc.addPage()
            y = 40
          }
          doc.fontSize(9).font('Helvetica').fillColor('#374151')
            .text(item.type, 50, y, { width: 250 })
          doc.fontSize(9).font('Helvetica-Bold').fillColor(orange)
            .text(`${item.count} ${item.count === 1 ? 'student' : 'students'}`, 300, y, { width: 200, align: 'right' })
          y += 14
        }

        // Total line
        doc.moveTo(50, y).lineTo(40 + pageWidth, y)
          .strokeColor(orange).lineWidth(1.5).stroke()
        y += 4
        doc.fontSize(10).font('Helvetica-Bold').fillColor(navy)
          .text('Total with Dietary Restrictions', 50, y, { width: 250 })
        doc.fontSize(10).font('Helvetica-Bold').fillColor(orange)
          .text(String(data.dietaryCount), 300, y, { width: 200, align: 'right' })
        y += 18
      }

      // === FOOTER on each page ===
      const pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)
        const footerY = doc.page.height - 30
        doc.moveTo(40, footerY - 5).lineTo(40 + pageWidth, footerY - 5)
          .strokeColor('#cccccc').lineWidth(0.5).stroke()
        doc.fontSize(8).fillColor(gray).font('Helvetica')
          .text('ChiRho Events - Dietary & Medical Report - CONFIDENTIAL', 40, footerY, {
            width: pageWidth,
            align: 'center',
          })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
