interface InvoiceData {
  invoiceNumber: number
  invoiceType: string
  amount: number
  description: string
  lineItems: Array<{ description: string; amount: number }> | null
  dueDate: string
  status: string
  paidAt: string | null
  createdAt: string
  periodStart: string | null
  periodEnd: string | null
  organization: {
    name: string
    legalName: string
    contactName: string
    contactEmail: string
    contactPhone: string
    address: { street?: string; city?: string; state?: string; zip?: string } | null
    tier: string
  }
}

function fmtDate(dateStr: unknown): string {
  try {
    if (!dateStr) return 'N/A'
    const d = new Date(String(dateStr))
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return 'N/A' }
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        bufferPages: true,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const M = 50
      const W = doc.page.width - M * 2   // ~612 - 100 = 512 for LETTER
      const PH = doc.page.height

      const NAVY = '#1E3A5F'
      const GRAY = '#666666'
      const GREEN_BG = '#DEF7EC'
      const GREEN_TEXT = '#03543F'
      const AMBER_BG = '#FEF3C7'
      const AMBER_TEXT = '#92400E'
      const RED_BG = '#FEE2E2'
      const RED_TEXT = '#991B1B'
      const LIGHT_GRAY = '#E5E7EB'
      const BG_GRAY = '#F3F4F6'

      const org = invoice.organization || {} as InvoiceData['organization']
      const orgName = String(org.legalName || org.name || 'Organization')
      const orgContact = org.contactName ? String(org.contactName) : ''
      const orgEmail = org.contactEmail ? String(org.contactEmail) : ''
      const orgPhone = org.contactPhone ? String(org.contactPhone) : ''
      const orgTier = String(org.tier || 'Standard')

      const addr = org.address
      let addressLine = ''
      if (addr && typeof addr === 'object') {
        const parts = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean)
        addressLine = parts.join(', ')
      }

      const invoiceNum = String(invoice.invoiceNumber || '')
      const status = String(invoice.status || 'pending').toLowerCase()
      const amount = Number(invoice.amount) || 0
      const description = String(invoice.description || invoice.invoiceType || 'Service')

      let y = 40

      // ===== HEADER — two columns: company left, invoice right =====
      // Left: company name
      doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('ChirhoEvents', M, y)
      y += 26
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('Event Management Platform', M, y)

      // Right: INVOICE title + number
      doc.font('Helvetica-Bold').fontSize(26).fillColor(NAVY)
        .text('INVOICE', M, 40, { width: W, align: 'right' })
      doc.font('Helvetica').fontSize(12).fillColor(GRAY)
        .text(`#${invoiceNum}`, M, 70, { width: W, align: 'right' })

      // Status badge (right-aligned)
      const statusColors: Record<string, [string, string]> = {
        paid: [GREEN_BG, GREEN_TEXT],
        overdue: [RED_BG, RED_TEXT],
        pending: [AMBER_BG, AMBER_TEXT],
      }
      const [bgColor, textColor] = statusColors[status] || statusColors.pending
      const statusLabel = status.toUpperCase()
      const badgeW = 70, badgeH = 18
      const badgeX = M + W - badgeW
      const badgeY = 88
      doc.rect(badgeX, badgeY, badgeW, badgeH).fillColor(bgColor).fill()
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor)
        .text(statusLabel, badgeX, badgeY + 5, { width: badgeW, align: 'center' })

      y = 120
      // Divider
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(1).stroke()
      y += 20

      // ===== BILLING INFO — two columns =====
      const colW = W * 0.45
      const col2X = M + W - colW

      // Bill To (left)
      doc.font('Helvetica').fontSize(8).fillColor(GRAY).text('BILL TO', M, y)
      y += 14
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333').text(orgName, M, y, { width: colW })
      y += 14
      if (orgContact) {
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(`Attn: ${orgContact}`, M, y, { width: colW })
        y += 14
      }
      if (addressLine) {
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(addressLine, M, y, { width: colW })
        y += 14
      }
      if (orgEmail) {
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(orgEmail, M, y, { width: colW })
        y += 14
      }
      if (orgPhone) {
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(orgPhone, M, y, { width: colW })
        y += 14
      }

      // Invoice Details (right column — rendered from fixed y=120+20=140)
      let ry = 140
      doc.font('Helvetica').fontSize(8).fillColor(GRAY).text('INVOICE DETAILS', col2X, ry, { width: colW })
      ry += 14
      const details: Array<[string, string]> = [
        ['Invoice Date:', fmtDate(invoice.createdAt)],
        ['Due Date:', fmtDate(invoice.dueDate)],
        ...(invoice.paidAt ? [['Paid On:', fmtDate(invoice.paidAt)] as [string, string]] : []),
        ['Plan:', orgTier],
      ]
      if (invoice.periodStart && invoice.periodEnd) {
        details.push(['Service Period:', `${fmtDate(invoice.periodStart)} – ${fmtDate(invoice.periodEnd)}`])
      }
      for (const [lb, vl] of details) {
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(lb, col2X, ry, { width: colW * 0.5, lineBreak: false })
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(vl, col2X + colW * 0.5, ry, { width: colW * 0.5 })
        ry += 14
      }

      y = Math.max(y, ry) + 20

      // Divider
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(1).stroke()
      y += 14

      // ===== LINE ITEMS TABLE =====
      // Header row
      doc.rect(M, y, W, 26).fillColor(BG_GRAY).fill()
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY)
        .text('DESCRIPTION', M + 10, y + 9, { width: W * 0.7, lineBreak: false })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY)
        .text('AMOUNT', M + 10, y + 9, { width: W - 10, align: 'right' })
      y += 26

      // Rows
      const rows: Array<{ desc: string; amt: number }> = invoice.lineItems && invoice.lineItems.length > 0
        ? invoice.lineItems.map(li => ({ desc: String(li.description || description), amt: Number(li.amount) || 0 }))
        : [{ desc: description, amt: amount }]

      for (const row of rows) {
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        y += 10
        doc.font('Helvetica').fontSize(10).fillColor('#333333').text(row.desc, M + 10, y, { width: W * 0.7 })
        doc.font('Helvetica').fontSize(10).fillColor('#333333')
          .text(fmtCurrency(row.amt), M + 10, y, { width: W - 10, align: 'right' })
        y += 20
      }

      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(1).stroke()
      y += 14

      // ===== TOTALS — right-aligned =====
      const totalsW = W * 0.4
      const totalsX = M + W - totalsW

      // Subtotal row
      doc.moveTo(totalsX, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
      y += 6
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('Subtotal', totalsX, y, { width: totalsW * 0.5, lineBreak: false })
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(fmtCurrency(amount), totalsX, y, { width: totalsW, align: 'right' })
      y += 18

      doc.moveTo(totalsX, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
      y += 6

      // Grand total row (navy bg)
      const gtH = 32
      doc.rect(totalsX, y, totalsW, gtH).fillColor(NAVY).fill()
      doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
        .text('Total Due', totalsX + 10, y + 9, { width: totalsW * 0.5, lineBreak: false })
      doc.font('Helvetica-Bold').fontSize(13).fillColor('white')
        .text(fmtCurrency(amount), totalsX + 10, y + 8, { width: totalsW - 10, align: 'right' })
      y += gtH + 20

      // ===== PAYMENT INFO BOX =====
      const payBoxH = 60
      doc.rect(M, y, W, payBoxH).fillColor('#F9FAFB').fill()
      y += 12
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Payment Information', M + 12, y)
      y += 16
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text(`Payment is due by ${fmtDate(invoice.dueDate)}.`, M + 12, y)
      y += 12
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('For questions about this invoice, please contact support@chirhoevents.com', M + 12, y)

      // ===== FOOTER =====
      const fy = PH - 50
      doc.moveTo(M, fy).lineTo(M + W, fy).strokeColor(LIGHT_GRAY).lineWidth(1).stroke()
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('ChirhoEvents — Event Management for Faith Communities', M, fy + 10, { width: W, align: 'center' })
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('www.chirhoevents.com | support@chirhoevents.com', M, fy + 22, { width: W, align: 'center' })

      doc.end()
    } catch (err) {
      console.error('[generateInvoicePDF] PDFKit failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}
