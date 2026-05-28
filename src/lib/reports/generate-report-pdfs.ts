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

function fmtMoney(v: any): string {
  return `$${safeNum(v, 2)}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function pctOf(n: number, total: number): string {
  if (!total || total <= 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

async function makePDFDoc() {
  const PDFDocument = (await import('pdfkit')).default
  return PDFDocument
}

// Shared page layout constants
const NAVY = '#1E3A5F'
const TAN = '#9C8466'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#E5E7EB'
const BG_HIGHLIGHT = '#F5F1E8'
const ROW_ALT = '#F9FAFB'
const RED = '#B91C1C'
const ORANGE = '#C2410C'
const GREEN = '#15803D'

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
        if (y + need > BOTTOM) {
          doc.addPage()
          y = M
        }
      }

      const sectionHead = (title: string) => {
        checkPage(28)
        doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(title, M, y)
        y += 16
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 8
      }

      const row = (label: string, value: string, valueColor = '#111111') => {
        checkPage(16)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(label, M, y, { width: LW, lineBreak: false })
        doc.font('Helvetica').fontSize(10).fillColor(valueColor).text(value, M + LW, y, { width: W - LW })
        y += 16
      }

      const drawTableHeader = (cols: { label: string; w: number; align?: 'left' | 'right' }[]) => {
        checkPage(22)
        const headerH = 18
        doc.rect(M, y, W, headerH).fillColor('#F3F4F6').fill()
        let x = M + 6
        for (const c of cols) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#374151')
            .text(c.label, x, y + 5, {
              width: c.w - 6,
              align: c.align || 'left',
              lineBreak: false,
            })
          x += c.w
        }
        y += headerH
      }

      const drawTableRow = (
        cols: { label: string; w: number; align?: 'left' | 'right'; color?: string }[],
        values: string[],
        zebra = false
      ) => {
        checkPage(18)
        const rowH = 16
        if (zebra) {
          doc.rect(M, y, W, rowH).fillColor(ROW_ALT).fill()
        }
        let x = M + 6
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i]
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(c.color || '#111111')
            .text(values[i] || '', x, y + 4, {
              width: c.w - 6,
              align: c.align || 'left',
              lineBreak: false,
              ellipsis: true,
            })
          x += c.w
        }
        y += rowH
      }

      // Header
      doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('Financial Statement', M, y)
      y += 26
      doc.font('Helvetica').fontSize(11).fillColor(GRAY).text(safeTxt(eventName, 'Event'), M, y)
      y += 14
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(`Generated: ${new Date().toLocaleDateString()}`, M, y)
      y += 14
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(2).stroke()
      y += 14

      // Revenue Summary (highlight box)
      const sumH = 8 + 16 * 5 + 8
      doc.rect(M, y, W, sumH).fillColor(BG_HIGHLIGHT).fill()
      doc.moveTo(M, y).lineTo(M, y + sumH).strokeColor(TAN).lineWidth(3).stroke()
      y += 8
      row('Total Revenue (Invoiced):', fmtMoney(reportData?.totalRevenue))
      row('Settled Payments:', fmtMoney(reportData?.actualAmountPaid), GREEN)
      row('Balance Due:', fmtMoney(reportData?.balanceDue), ORANGE)
      row('Overdue Balance:', fmtMoney(reportData?.overdueBalance), RED)
      row(
        'Net Revenue (after refunds):',
        fmtMoney(
          Number(reportData?.actualAmountPaid || 0) -
            Number(reportData?.refunds?.totalRefunded || 0)
        )
      )
      y += 8

      // Reconciliation warning
      if (reportData?.paymentMismatch) {
        y += 8
        checkPage(40)
        doc.rect(M, y, W, 34).fillColor('#FEF3C7').fill()
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#92400E')
          .text('Reconciliation Mismatch', M + 8, y + 6)
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#92400E')
          .text(
            `Recorded transactions total ${fmtMoney(
              reportData?.actualAmountPaid
            )}, but payment-balance records show ${fmtMoney(
              reportData?.amountPaid
            )} paid. Investigate before relying on summary totals.`,
            M + 8,
            y + 19,
            { width: W - 16 }
          )
        y += 42
      }

      // Payment Methods
      y += 10
      sectionHead('Payments Received (by method)')
      const totalSettled = Number(reportData?.actualAmountPaid || 0)
      const pmStripe = Number(reportData?.paymentMethods?.stripe || 0)
      const pmCheck = Number(reportData?.paymentMethods?.check || 0)
      const pmCash = Number(reportData?.paymentMethods?.cash || 0)
      const pmOther = Number(reportData?.paymentMethods?.other || 0)
      row('Credit Card (Stripe):', `${fmtMoney(pmStripe)} (${pctOf(pmStripe, totalSettled)})`)
      row('Check:', `${fmtMoney(pmCheck)} (${pctOf(pmCheck, totalSettled)})`)
      if (pmCash > 0) row('Cash:', `${fmtMoney(pmCash)} (${pctOf(pmCash, totalSettled)})`)
      if (pmOther > 0) row('Other:', `${fmtMoney(pmOther)} (${pctOf(pmOther, totalSettled)})`)

      // Expected (pending) payments — commitments only, NOT received
      const expectedCount = Number(reportData?.expectedPayments?.count || 0)
      if (expectedCount > 0) {
        y += 10
        sectionHead(`Expected Payments (${expectedCount}, not yet received)`)
        const expStripe = Number(reportData?.expectedPayments?.stripe || 0)
        const expCheck = Number(reportData?.expectedPayments?.check || 0)
        const expOther = Number(reportData?.expectedPayments?.other || 0)
        if (expCheck > 0) row('Check (awaiting receipt):', fmtMoney(expCheck), ORANGE)
        if (expStripe > 0) row('Credit Card (unfinished):', fmtMoney(expStripe), ORANGE)
        if (expOther > 0) row('Other:', fmtMoney(expOther), ORANGE)
      }

      // Revenue by Participant Type (dynamic)
      if (reportData?.byParticipantType && typeof reportData.byParticipantType === 'object') {
        const entries = Object.entries(reportData.byParticipantType)
        if (entries.length > 0) {
          y += 10
          sectionHead('Revenue by Participant Type')
          for (const [type, data] of entries as [string, any][]) {
            const label = type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) + ':'
            const val = `${fmtMoney(data?.revenue)} (${safeNum(data?.count)} people, avg: ${fmtMoney(data?.avg)})`
            row(label, val)
          }
        }
      }

      // Revenue by Housing Type
      y += 10
      sectionHead('Revenue by Housing Type')
      row(
        'On-Campus:',
        `${fmtMoney(reportData?.byHousingType?.onCampus?.revenue)} (${safeNum(reportData?.byHousingType?.onCampus?.count)} people)`
      )
      row(
        'Off-Campus:',
        `${fmtMoney(reportData?.byHousingType?.offCampus?.revenue)} (${safeNum(reportData?.byHousingType?.offCampus?.count)} people)`
      )
      row(
        'Day Pass:',
        `${fmtMoney(reportData?.byHousingType?.dayPass?.revenue)} (${safeNum(reportData?.byHousingType?.dayPass?.count)} people)`
      )

      // Revenue by Registration Type
      y += 10
      sectionHead('Revenue by Registration Type')
      row(
        'Group Registrations:',
        `${fmtMoney(reportData?.byRegistrationType?.group)} (${pctOf(
          Number(reportData?.byRegistrationType?.group || 0),
          Number(reportData?.totalRevenue || 0)
        )})`
      )
      row(
        'Individual Registrations:',
        `${fmtMoney(reportData?.byRegistrationType?.individual)} (${pctOf(
          Number(reportData?.byRegistrationType?.individual || 0),
          Number(reportData?.totalRevenue || 0)
        )})`
      )

      // Payment timeline by month
      if (Array.isArray(reportData?.paymentTimeline) && reportData.paymentTimeline.length > 0) {
        y += 10
        sectionHead('Payments by Month')
        for (const t of reportData.paymentTimeline) {
          row(`${safeTxt(t?.month, '—')}:`, fmtMoney(t?.amount))
        }
      }

      // ============================================================
      // Transactions (one row per Payment)
      // ============================================================
      doc.addPage()
      y = M
      doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Transactions', M, y)
      y += 22
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
        `Every settled payment recorded for ${safeTxt(eventName, 'this event')}.`,
        M,
        y
      )
      y += 18

      const txCols: { label: string; w: number; align?: 'left' | 'right' }[] = [
        { label: 'Date', w: 70 },
        { label: 'Payer', w: 170 },
        { label: 'Type', w: 70 },
        { label: 'Method', w: 110 },
        { label: 'Amount', w: W - 70 - 170 - 70 - 110, align: 'right' },
      ]

      if (Array.isArray(reportData?.transactions) && reportData.transactions.length > 0) {
        drawTableHeader(txCols)
        let zebra = false
        let txTotal = 0
        for (const t of reportData.transactions) {
          // Add page + repeat header when near bottom
          if (y + 18 > BOTTOM) {
            doc.addPage()
            y = M
            drawTableHeader(txCols)
            zebra = false
          }
          const method =
            t?.paymentMethod === 'card'
              ? `${safeTxt(t?.cardBrand, 'Card')}${t?.cardLast4 ? ` ••${t.cardLast4}` : ''}`
              : t?.paymentMethod === 'check'
                ? t?.checkNumber
                  ? `Check #${t.checkNumber}`
                  : 'Check'
                : safeTxt(t?.paymentMethod, '—')
          const amount = Number(t?.amount || 0)
          txTotal += amount
          drawTableRow(
            txCols,
            [
              fmtDate(t?.processedAt),
              safeTxt(t?.payer, '—'),
              safeTxt(t?.registrationType, '—'),
              method,
              fmtMoney(amount),
            ],
            zebra
          )
          zebra = !zebra
        }
        // Total row
        checkPage(20)
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(1).stroke()
        y += 4
        drawTableRow(
          txCols.map(c => ({ ...c, color: NAVY })),
          ['', '', '', 'Total', fmtMoney(txTotal)],
          false
        )
      } else {
        doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('No settled payments yet.', M, y)
        y += 16
      }

      // ============================================================
      // Expected Payments (intents — NOT money received)
      // ============================================================
      if (
        Array.isArray(reportData?.expectedPayments?.details) &&
        reportData.expectedPayments.details.length > 0
      ) {
        doc.addPage()
        y = M
        doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text(
          'Expected Payments',
          M,
          y
        )
        y += 22
        doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
          'Commitments only — e.g. group leaders who chose "pay by check later" or ' +
            'unfinished card checkouts. These are NOT counted as revenue received.',
          M,
          y,
          { width: W }
        )
        y += 28

        const expCols: { label: string; w: number; align?: 'left' | 'right' }[] = [
          { label: 'Created', w: 80 },
          { label: 'Payer', w: 180 },
          { label: 'Type', w: 70 },
          { label: 'Intended Method', w: 110 },
          { label: 'Amount', w: W - 80 - 180 - 70 - 110, align: 'right' },
        ]
        drawTableHeader(expCols)
        let zebra = false
        let expTotal = 0
        for (const e of reportData.expectedPayments.details) {
          if (y + 18 > BOTTOM) {
            doc.addPage()
            y = M
            drawTableHeader(expCols)
            zebra = false
          }
          const method =
            e?.paymentMethod === 'card'
              ? 'Credit Card'
              : e?.paymentMethod === 'check'
                ? e?.checkNumber
                  ? `Check #${e.checkNumber}`
                  : 'Check'
                : safeTxt(e?.paymentMethod, '—')
          const amount = Number(e?.amount || 0)
          expTotal += amount
          drawTableRow(
            expCols,
            [
              fmtDate(e?.createdAt),
              safeTxt(e?.payer, '—'),
              safeTxt(e?.registrationType, '—'),
              method,
              fmtMoney(amount),
            ],
            zebra
          )
          zebra = !zebra
        }
        checkPage(20)
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(1).stroke()
        y += 4
        drawTableRow(
          expCols.map(c => ({ ...c, color: NAVY })),
          ['', '', '', 'Total expected', fmtMoney(expTotal)],
          false
        )
      }

      // ============================================================
      // Balance by Registration
      // ============================================================
      doc.addPage()
      y = M
      doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Balance by Registration', M, y)
      y += 22
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
        'One row per registration showing invoiced amount, paid, and remaining balance.',
        M,
        y
      )
      y += 18

      const balCols: { label: string; w: number; align?: 'left' | 'right' }[] = [
        { label: 'Payer', w: 200 },
        { label: 'Type', w: 70 },
        { label: 'Status', w: 90 },
        { label: 'Invoiced', w: 70, align: 'right' },
        { label: 'Paid', w: 70, align: 'right' },
        { label: 'Balance', w: W - 200 - 70 - 90 - 70 - 70, align: 'right' },
      ]

      if (
        Array.isArray(reportData?.balancesByRegistration) &&
        reportData.balancesByRegistration.length > 0
      ) {
        drawTableHeader(balCols)
        let zebra = false
        let sumInvoiced = 0
        let sumPaid = 0
        let sumBalance = 0
        for (const b of reportData.balancesByRegistration) {
          if (y + 18 > BOTTOM) {
            doc.addPage()
            y = M
            drawTableHeader(balCols)
            zebra = false
          }
          const invoiced = Number(b?.totalAmountDue || 0)
          const paid = Number(b?.amountPaid || 0)
          const balance = Number(b?.amountRemaining || 0)
          sumInvoiced += invoiced
          sumPaid += paid
          sumBalance += balance
          drawTableRow(
            balCols,
            [
              safeTxt(b?.payer, '—'),
              safeTxt(b?.registrationType, '—'),
              safeTxt(b?.paymentStatus, '—').replace(/_/g, ' '),
              fmtMoney(invoiced),
              fmtMoney(paid),
              fmtMoney(balance),
            ],
            zebra
          )
          zebra = !zebra
        }
        checkPage(20)
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(1).stroke()
        y += 4
        drawTableRow(
          balCols.map(c => ({ ...c, color: NAVY })),
          ['Total', '', '', fmtMoney(sumInvoiced), fmtMoney(sumPaid), fmtMoney(sumBalance)],
          false
        )
      } else {
        doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('No payment balances on file.', M, y)
        y += 16
      }

      // ============================================================
      // Refunds (if any)
      // ============================================================
      if (
        Array.isArray(reportData?.refunds?.details) &&
        reportData.refunds.details.length > 0
      ) {
        doc.addPage()
        y = M
        doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Refunds', M, y)
        y += 22
        doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
          `${reportData.refunds.count} refund(s), totaling ${fmtMoney(
            reportData.refunds.totalRefunded
          )}.`,
          M,
          y
        )
        y += 18

        const refundCols: { label: string; w: number; align?: 'left' | 'right' }[] = [
          { label: 'Date', w: 80 },
          { label: 'Payer', w: 170 },
          { label: 'Reason', w: 200 },
          { label: 'Amount', w: W - 80 - 170 - 200, align: 'right' },
        ]
        drawTableHeader(refundCols)
        let zebra = false
        let refundTotal = 0
        for (const r of reportData.refunds.details) {
          if (y + 18 > BOTTOM) {
            doc.addPage()
            y = M
            drawTableHeader(refundCols)
            zebra = false
          }
          const amt = Number(r?.refundAmount || 0)
          refundTotal += amt
          drawTableRow(
            refundCols,
            [
              fmtDate(r?.processedAt),
              safeTxt(r?.payer, '—'),
              safeTxt(r?.refundReason, '—'),
              `-${fmtMoney(amt)}`,
            ],
            zebra
          )
          zebra = !zebra
        }
        checkPage(20)
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(1).stroke()
        y += 4
        drawTableRow(
          refundCols.map(c => ({ ...c, color: NAVY })),
          ['', '', 'Total', `-${fmtMoney(refundTotal)}`],
          false
        )
      }

      // Footers on all pages
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text('ChiRho Events — Financial Statement — Confidential', M, fy, { width: W, align: 'left' })
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`Page ${i + 1} of ${pagesRange.count}`, M, fy, { width: W, align: 'right' })
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
        if (y + need > BOTTOM) {
          doc.addPage()
          y = M
        }
      }

      const sectionHead = (title: string) => {
        checkPage(28)
        doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(title, M, y)
        y += 16
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 8
      }

      const row = (label: string, value: string) => {
        checkPage(16)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(label, M, y, { width: LW, lineBreak: false })
        doc.font('Helvetica').fontSize(10).fillColor('#111111').text(value, M + LW, y, { width: W - LW })
        y += 16
      }

      const drawTableHeader = (cols: { label: string; w: number; align?: 'left' | 'right' }[]) => {
        checkPage(22)
        const headerH = 18
        doc.rect(M, y, W, headerH).fillColor('#F3F4F6').fill()
        let x = M + 6
        for (const c of cols) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#374151')
            .text(c.label, x, y + 5, {
              width: c.w - 6,
              align: c.align || 'left',
              lineBreak: false,
            })
          x += c.w
        }
        y += headerH
      }

      const drawTableRow = (
        cols: { label: string; w: number; align?: 'left' | 'right' }[],
        values: string[],
        zebra = false
      ) => {
        checkPage(18)
        const rowH = 16
        if (zebra) {
          doc.rect(M, y, W, rowH).fillColor(ROW_ALT).fill()
        }
        let x = M + 6
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i]
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#111111')
            .text(values[i] || '', x, y + 4, {
              width: c.w - 6,
              align: c.align || 'left',
              lineBreak: false,
              ellipsis: true,
            })
          x += c.w
        }
        y += rowH
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
      row(
        'Group Registrations:',
        `${safeNum(reportData?.groupCount)} groups (${safeNum(reportData?.groupParticipants)} people)`
      )
      row('Individual Registrations:', `${safeNum(reportData?.individualCount)} people`)
      row('Average Group Size:', `${safeNum(reportData?.avgGroupSize, 1)} people`)
      y += 8

      // Demographics (dynamic)
      const totalRegs = Number(reportData?.totalRegistrations || 0)
      if (reportData?.demographics && typeof reportData.demographics === 'object') {
        const entries = Object.entries(reportData.demographics)
        if (entries.length > 0) {
          y += 10
          sectionHead('Demographics')
          for (const [type, data] of entries as [string, any][]) {
            const label =
              type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) + ':'
            const total = Number(data?.total || 0)
            const male = Number(data?.male || 0)
            const female = Number(data?.female || 0)
            const val = `${total} (${pctOf(total, totalRegs)})  —  Male: ${male}, Female: ${female}`
            row(label, val)
          }
        }
      }

      // Housing Breakdown
      y += 10
      sectionHead('Housing Breakdown')
      const onCampus = Number(reportData?.housingBreakdown?.on_campus || 0)
      const offCampus = Number(reportData?.housingBreakdown?.off_campus || 0)
      const dayPass = Number(reportData?.housingBreakdown?.day_pass || 0)
      row('On-Campus:', `${onCampus} (${pctOf(onCampus, totalRegs)})`)
      row('Off-Campus:', `${offCampus} (${pctOf(offCampus, totalRegs)})`)
      row('Day Pass:', `${dayPass} (${pctOf(dayPass, totalRegs)})`)

      // Top Groups
      if (Array.isArray(reportData?.topGroups) && reportData.topGroups.length > 0) {
        y += 10
        sectionHead('Groups by Size')
        for (const group of reportData.topGroups) {
          row(safeTxt(group?.name, 'Unknown') + ':', `${safeNum(group?.count)} participants`)
        }
      }

      // ============================================================
      // Full Roster — one row per registered person
      // ============================================================
      if (Array.isArray(reportData?.roster) && reportData.roster.length > 0) {
        doc.addPage()
        y = M
        doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Registered People', M, y)
        y += 22
        doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
          `${reportData.roster.length} person(s) registered for ${safeTxt(eventName, 'this event')}.`,
          M,
          y
        )
        y += 18

        const cols: { label: string; w: number; align?: 'left' | 'right' }[] = [
          { label: 'Name', w: 160 },
          { label: 'Type', w: 90 },
          { label: 'Age', w: 35, align: 'right' },
          { label: 'Gender', w: 55 },
          { label: 'Group', w: 130 },
          { label: 'Housing', w: W - 160 - 90 - 35 - 55 - 130 },
        ]
        drawTableHeader(cols)
        let zebra = false
        for (const p of reportData.roster) {
          if (y + 18 > BOTTOM) {
            doc.addPage()
            y = M
            drawTableHeader(cols)
            zebra = false
          }
          const typeLabel = safeTxt(
            p?.participantType || p?.displayType || '—',
            '—'
          ).replace(/_/g, ' ')
          drawTableRow(
            cols,
            [
              safeTxt(p?.name, '—'),
              typeLabel,
              p?.age !== null && p?.age !== undefined ? String(p.age) : '—',
              safeTxt(p?.gender, '—'),
              safeTxt(p?.group, '—'),
              safeTxt(p?.housingType, '—').replace(/_/g, ' '),
            ],
            zebra
          )
          zebra = !zebra
        }
      }

      // Footers on all pages
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text('ChiRho Events — Registration Report — Confidential', M, fy, { width: W, align: 'left' })
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`Page ${i + 1} of ${pagesRange.count}`, M, fy, { width: W, align: 'right' })
      }

      doc.end()
    } catch (err) {
      console.error('[generateRegistrationReportPDF] failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}
