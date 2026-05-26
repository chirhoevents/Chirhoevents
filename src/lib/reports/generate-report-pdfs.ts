/**
 * PDFKit-based report PDF generation.
 * Replaces the @react-pdf/renderer components in pdf-generator.tsx
 * which fail with React error #31 due to reconciler incompatibility.
 */

function safeNum(v: any, decimals?: number): string {
  const n = Number(v)
  if (!isFinite(n)) return '0'
  return decimals !== undefined ? n.toFixed(decimals) : String(n)
}

function safeTxt(v: any, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return fallback
}

async function makePDFDoc(opts?: { bufferPages?: boolean }) {
  const PDFDocument = (await import('pdfkit')).default
  return PDFDocument
}

// Shared page layout constants
const NAVY = '#1E3A5F'
const TAN = '#9C8466'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#E5E7EB'
const BG_HIGHLIGHT = '#F5F1E8'

// ============================================================
// Financial Report
// ============================================================
export async function generateFinancialReportPDF(reportData: any, eventName: string): Promise<Buffer> {
  const PDFDocument = await makePDFDoc()

  return new Promise<Buffer>((resolve, reject) => {
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

      const M = 40
      const W = doc.page.width - M * 2
      const PH = doc.page.height
      const BOTTOM = PH - 55
      const LW = Math.round(W * 0.45)

      let y = M

      const checkPage = (need = 24) => {
        if (y + need > BOTTOM) { doc.addPage(); y = M }
      }

      const sectionHead = (title: string) => {
        checkPage(28)
        doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(title, M, y)
        y += 14
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 6
      }

      const row = (label: string, value: string) => {
        checkPage(16)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(label, M, y, { width: LW, lineBreak: false })
        doc.font('Helvetica').fontSize(10).fillColor('#111111').text(value, M + LW, y, { width: W - LW })
        y += 16
      }

      // Header
      doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('Financial Report', M, y)
      y += 26
      doc.font('Helvetica').fontSize(11).fillColor(GRAY).text(safeTxt(eventName, 'Event'), M, y)
      y += 14
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(`Generated: ${new Date().toLocaleDateString()}`, M, y)
      y += 14
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(2).stroke()
      y += 14

      // Revenue Summary (highlight box)
      const sumH = 8 + 16 * 4 + 8
      doc.rect(M, y, W, sumH).fillColor(BG_HIGHLIGHT).fill()
      doc.moveTo(M, y).lineTo(M, y + sumH).strokeColor(TAN).lineWidth(3).stroke()
      y += 8
      row('Total Revenue:', `$${safeNum(reportData?.totalRevenue, 2)}`)
      row('Amount Paid:', `$${safeNum(reportData?.amountPaid, 2)}`)
      row('Balance Due:', `$${safeNum(reportData?.balanceDue, 2)}`)
      row('Overdue Balance:', `$${safeNum(reportData?.overdueBalance, 2)}`)
      y += 8

      y += 10
      sectionHead('Payment Methods')
      row('Credit Card (Stripe):', `$${safeNum(reportData?.paymentMethods?.stripe, 2)}`)
      row('Check:', `$${safeNum(reportData?.paymentMethods?.check, 2)}`)
      row('Pending:', `$${safeNum(reportData?.paymentMethods?.pending, 2)}`)

      // Revenue by Participant Type (dynamic)
      if (reportData?.byParticipantType && typeof reportData.byParticipantType === 'object') {
        const entries = Object.entries(reportData.byParticipantType)
        if (entries.length > 0) {
          y += 10
          sectionHead('Revenue by Participant Type')
          for (const [type, data] of entries as [string, any][]) {
            const label = type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) + ':'
            const val = `$${safeNum(data?.revenue, 2)} (${safeNum(data?.count)} people, avg: $${safeNum(data?.avg, 2)})`
            row(label, val)
          }
        }
      }

      // Revenue by Housing Type
      y += 10
      sectionHead('Revenue by Housing Type')
      row('On-Campus:', `$${safeNum(reportData?.byHousingType?.onCampus?.revenue, 2)} (${safeNum(reportData?.byHousingType?.onCampus?.count)} people)`)
      row('Off-Campus:', `$${safeNum(reportData?.byHousingType?.offCampus?.revenue, 2)} (${safeNum(reportData?.byHousingType?.offCampus?.count)} people)`)
      row('Day Pass:', `$${safeNum(reportData?.byHousingType?.dayPass?.revenue, 2)} (${safeNum(reportData?.byHousingType?.dayPass?.count)} people)`)

      // Footers on all pages
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text('ChiRho Events — Financial Report — Confidential', M, fy, { width: W, align: 'center' })
      }

      doc.end()
    } catch (err) {
      console.error('[generateFinancialReportPDF] failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}

// ============================================================
// Registration Report
// ============================================================
export async function generateRegistrationReportPDF(reportData: any, eventName: string): Promise<Buffer> {
  const PDFDocument = await makePDFDoc()

  return new Promise<Buffer>((resolve, reject) => {
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

      const M = 40
      const W = doc.page.width - M * 2
      const PH = doc.page.height
      const BOTTOM = PH - 55
      const LW = Math.round(W * 0.45)

      let y = M

      const checkPage = (need = 24) => {
        if (y + need > BOTTOM) { doc.addPage(); y = M }
      }

      const sectionHead = (title: string) => {
        checkPage(28)
        doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(title, M, y)
        y += 14
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 6
      }

      const row = (label: string, value: string) => {
        checkPage(16)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(label, M, y, { width: LW, lineBreak: false })
        doc.font('Helvetica').fontSize(10).fillColor('#111111').text(value, M + LW, y, { width: W - LW })
        y += 16
      }

      // Header
      doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('Registration Report', M, y)
      y += 26
      doc.font('Helvetica').fontSize(11).fillColor(GRAY).text(safeTxt(eventName, 'Event'), M, y)
      y += 14
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(`Generated: ${new Date().toLocaleDateString()}`, M, y)
      y += 14
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(2).stroke()
      y += 14

      // Registration Summary (highlight box)
      const sumH = 8 + 16 * 4 + 8
      doc.rect(M, y, W, sumH).fillColor(BG_HIGHLIGHT).fill()
      doc.moveTo(M, y).lineTo(M, y + sumH).strokeColor(TAN).lineWidth(3).stroke()
      y += 8
      row('Total Registrations:', `${safeNum(reportData?.totalRegistrations)} people`)
      row('Group Registrations:', `${safeNum(reportData?.groupCount)} (${safeNum(reportData?.groupParticipants)} people)`)
      row('Individual Registrations:', safeNum(reportData?.individualCount))
      row('Average Group Size:', `${safeNum(reportData?.avgGroupSize, 1)} people`)
      y += 8

      // Demographics (dynamic)
      if (reportData?.demographics && typeof reportData.demographics === 'object') {
        const entries = Object.entries(reportData.demographics)
        if (entries.length > 0) {
          y += 10
          sectionHead('Demographics')
          for (const [type, data] of entries as [string, any][]) {
            const label = type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) + ':'
            const val = `${safeNum(data?.total)} (Male: ${safeNum(data?.male)}, Female: ${safeNum(data?.female)})`
            row(label, val)
          }
        }
      }

      // Housing Breakdown
      y += 10
      sectionHead('Housing Breakdown')
      row('On-Campus:', safeNum(reportData?.housingBreakdown?.on_campus))
      row('Off-Campus:', safeNum(reportData?.housingBreakdown?.off_campus))
      row('Day Pass:', safeNum(reportData?.housingBreakdown?.day_pass))

      // Top Groups
      if (Array.isArray(reportData?.topGroups) && reportData.topGroups.length > 0) {
        y += 10
        sectionHead('Top Groups (by size)')
        for (const group of reportData.topGroups.slice(0, 10)) {
          row(safeTxt(group?.name, 'Unknown') + ':', `${safeNum(group?.count)} participants`)
        }
      }

      // Footers on all pages
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text('ChiRho Events — Registration Report — Confidential', M, fy, { width: W, align: 'center' })
      }

      doc.end()
    } catch (err) {
      console.error('[generateRegistrationReportPDF] failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}
