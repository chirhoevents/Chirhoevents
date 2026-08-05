/**
 * Master Event Report PDF.
 *
 * One large PDF that consolidates everything about an event — registrations,
 * participants, waitlist, vendors, staff, payments, refunds, balances,
 * liability forms with their approval status, check-ins, medical incidents,
 * coupon redemptions, and email history. Intended as the "hand this to the
 * archdiocese" archival document, so nothing is truncated for space:
 * additional records simply flow onto more pages.
 *
 * Uses PDFKit (matches src/lib/reports/generate-report-pdfs.ts) rather than
 * @react-pdf/renderer because the latter is known to hit reconciler errors
 * in this codebase — see the note atop generate-report-pdfs.ts.
 */

// ============================================================
// Colors and helpers (kept in sync with generate-report-pdfs.ts)
// ============================================================

const NAVY = '#1E3A5F'
const TAN = '#9C8466'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#E5E7EB'
const BG_HIGHLIGHT = '#F5F1E8'
const ROW_ALT = '#F9FAFB'
const RED = '#B91C1C'
const ORANGE = '#C2410C'
const GREEN = '#15803D'

function safeTxt(v: any, fallback = '—'): string {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string') return v.length > 0 ? v : fallback
  if (typeof v === 'number' || typeof v === 'bigint') return String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return fallback
}

function safeNum(v: any, decimals?: number): string {
  const n = Number(v)
  if (!isFinite(n)) return '0'
  return decimals !== undefined ? n.toFixed(decimals) : String(n)
}

function fmtMoney(v: any): string {
  return `$${safeNum(v, 2)}`
}

function fmtDate(iso: string | Date | null | undefined, opts?: { withTime?: boolean }): string {
  if (!iso) return '—'
  try {
    const d = iso instanceof Date ? iso : new Date(iso)
    if (isNaN(d.getTime())) return '—'
    if (opts?.withTime) {
      return d.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    }
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function humanize(v: any): string {
  if (!v) return '—'
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function makePDFDoc() {
  const PDFDocument = (await import('pdfkit')).default
  return PDFDocument
}

// ============================================================
// Data shape (all sections are optional so missing modules
// simply skip their pages instead of blowing up the render)
// ============================================================

export interface MasterEventReportData {
  event: {
    name: string
    startDate?: string | Date | null
    endDate?: string | Date | null
    location?: string | null
    organizationName?: string | null
    capacity?: number | null
  }
  summary: {
    groupCount: number
    individualCount: number
    participantCount: number
    waitlistCount: number
    vendorCount: number
    staffCount: number
    totalInvoiced: number
    totalPaid: number
    totalBalance: number
    totalRefunded: number
    liabilityFormCounts: {
      total: number
      approved: number
      pending: number
      denied: number
      needsRevision: number
    }
    checkedInCount: number
    incidentCount: number
    emailsSent: number
  }
  groups: Array<{
    accessCode: string
    groupName: string
    parishName?: string | null
    dioceseName?: string | null
    groupLeaderName?: string | null
    groupLeaderEmail?: string | null
    groupLeaderPhone?: string | null
    housingType?: string | null
    registrationStatus?: string | null
    participantCount: number
    totalInvoiced: number
    totalPaid: number
    balance: number
    paymentStatus?: string | null
    createdAt?: string | Date | null
  }>
  individuals: Array<{
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    age?: number | null
    gender?: string | null
    housingType?: string | null
    registrationStatus?: string | null
    checkedIn: boolean
    totalInvoiced: number
    totalPaid: number
    balance: number
    paymentStatus?: string | null
    createdAt?: string | Date | null
  }>
  participants: Array<{
    firstName: string
    lastName: string
    age?: number | null
    gender?: string | null
    participantType?: string | null
    tShirtSize?: string | null
    groupName?: string | null
    parishName?: string | null
    checkedIn: boolean
    checkedInAt?: string | Date | null
  }>
  waitlist: Array<{
    name: string
    email: string
    phone?: string | null
    partySize: number
    status: string
    notes?: string | null
    createdAt?: string | Date | null
    notifiedAt?: string | Date | null
  }>
  vendors: Array<{
    businessName: string
    contactName?: string | null
    email?: string | null
    phone?: string | null
    selectedTier?: string | null
    tierPrice: number
    invoiceTotal: number
    amountPaid: number
    status?: string | null
    paymentStatus?: string | null
    approvedAt?: string | Date | null
  }>
  staff: Array<{
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    role?: string | null
    isVendorStaff: boolean
    vendorBusinessName?: string | null
    pricePaid: number
    paymentStatus?: string | null
    checkedIn: boolean
  }>
  payments: Array<{
    processedAt?: string | Date | null
    payer: string
    registrationType: string
    amount: number
    paymentMethod?: string | null
    paymentType?: string | null
    paymentStatus?: string | null
    stripePaymentIntentId?: string | null
    checkNumber?: string | null
    processedByName?: string | null
    notes?: string | null
  }>
  refunds: Array<{
    processedAt?: string | Date | null
    payer: string
    refundAmount: number
    refundMethod?: string | null
    refundReason?: string | null
    status?: string | null
    processedByName?: string | null
  }>
  balances: Array<{
    payer: string
    registrationType: string
    totalAmountDue: number
    amountPaid: number
    amountRemaining: number
    paymentStatus?: string | null
    lastPaymentDate?: string | Date | null
  }>
  liabilityForms: Array<{
    participantName: string
    formType?: string | null
    groupName?: string | null
    email?: string | null
    formStatus: string
    completed: boolean
    completedAt?: string | Date | null
    approvedByName?: string | null
    approvedAt?: string | Date | null
    deniedReason?: string | null
    approvalNotes?: string | null
  }>
  checkIns: Array<{
    createdAt?: string | Date | null
    personName: string
    personType: string
    action: string
    station?: string | null
    performedByName?: string | null
  }>
  medicalIncidents: Array<{
    incidentDate?: string | Date | null
    participantName: string
    incidentType: string
    severity: string
    location?: string | null
    status: string
    resolvedAt?: string | Date | null
  }>
  couponRedemptions: Array<{
    redeemedAt?: string | Date | null
    couponCode: string
    couponName?: string | null
    payer: string
    registrationType: string
    discountApplied: number
  }>
  emailHistory: Array<{
    sentAt?: string | Date | null
    recipientEmail: string
    recipientName?: string | null
    emailType: string
    subject: string
    sentStatus: string
    errorMessage?: string | null
  }>
}

// ============================================================
// Main entry point
// ============================================================

export async function generateMasterEventReportPDF(
  data: MasterEventReportData,
  eventName: string
): Promise<Buffer> {
  const PDFDocument = await makePDFDoc()

  return new Promise<Buffer>((resolve, reject) => {
    try {
      // Landscape so the wider tables (payments, participants, liability
      // forms) fit without column truncation. Portrait would force us to
      // drop columns.
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 36, bottom: 40, left: 36, right: 36 },
        bufferPages: true,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const M = 36
      const W = doc.page.width - M * 2
      const PH = doc.page.height
      const BOTTOM = PH - 55

      const ctx = { doc, M, W, PH, BOTTOM, y: M }

      // Cover page
      drawCover(ctx, data, eventName)

      // Table of contents
      doc.addPage()
      ctx.y = M
      drawTableOfContents(ctx, data)

      // Executive summary
      doc.addPage()
      ctx.y = M
      drawEventSummary(ctx, data)

      // Every section only renders if it has data — a section with zero
      // rows would just print an empty header, which reads as a bug.
      if (data.groups.length > 0) {
        doc.addPage()
        ctx.y = M
        drawGroupsSection(ctx, data.groups)
      }

      if (data.individuals.length > 0) {
        doc.addPage()
        ctx.y = M
        drawIndividualsSection(ctx, data.individuals)
      }

      if (data.participants.length > 0) {
        doc.addPage()
        ctx.y = M
        drawParticipantsSection(ctx, data.participants)
      }

      if (data.waitlist.length > 0) {
        doc.addPage()
        ctx.y = M
        drawWaitlistSection(ctx, data.waitlist)
      }

      if (data.vendors.length > 0) {
        doc.addPage()
        ctx.y = M
        drawVendorsSection(ctx, data.vendors)
      }

      if (data.staff.length > 0) {
        doc.addPage()
        ctx.y = M
        drawStaffSection(ctx, data.staff)
      }

      if (data.payments.length > 0) {
        doc.addPage()
        ctx.y = M
        drawPaymentsSection(ctx, data.payments)
      }

      if (data.refunds.length > 0) {
        doc.addPage()
        ctx.y = M
        drawRefundsSection(ctx, data.refunds)
      }

      if (data.balances.length > 0) {
        doc.addPage()
        ctx.y = M
        drawBalancesSection(ctx, data.balances)
      }

      if (data.liabilityForms.length > 0) {
        doc.addPage()
        ctx.y = M
        drawLiabilityFormsSection(ctx, data.liabilityForms)
      }

      if (data.checkIns.length > 0) {
        doc.addPage()
        ctx.y = M
        drawCheckInsSection(ctx, data.checkIns)
      }

      if (data.medicalIncidents.length > 0) {
        doc.addPage()
        ctx.y = M
        drawMedicalIncidentsSection(ctx, data.medicalIncidents)
      }

      if (data.couponRedemptions.length > 0) {
        doc.addPage()
        ctx.y = M
        drawCouponsSection(ctx, data.couponRedemptions)
      }

      if (data.emailHistory.length > 0) {
        doc.addPage()
        ctx.y = M
        drawEmailHistorySection(ctx, data.emailHistory)
      }

      // Footer on every page (page 1..N of N)
      const range = doc.bufferedPageRange()
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`ChiRho Events — Master Event Report — ${eventName} — Confidential`, M, fy, { width: W, align: 'left' })
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`Page ${i + 1} of ${range.count}`, M, fy, { width: W, align: 'right' })
      }

      doc.end()
    } catch (err) {
      console.error('[generateMasterEventReportPDF] failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}

// ============================================================
// Layout primitives (draw + advance ctx.y)
// ============================================================

interface DrawCtx {
  doc: any
  M: number
  W: number
  PH: number
  BOTTOM: number
  y: number
}

function checkPage(ctx: DrawCtx, need = 24) {
  if (ctx.y + need > ctx.BOTTOM) {
    ctx.doc.addPage()
    ctx.y = ctx.M
  }
}

function sectionTitle(ctx: DrawCtx, title: string, subtitle?: string) {
  ctx.doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, ctx.M, ctx.y)
  ctx.y += 24
  if (subtitle) {
    ctx.doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(subtitle, ctx.M, ctx.y, { width: ctx.W })
    ctx.y += 14
  }
  ctx.doc.moveTo(ctx.M, ctx.y).lineTo(ctx.M + ctx.W, ctx.y).strokeColor(NAVY).lineWidth(1.5).stroke()
  ctx.y += 12
}

function subheader(ctx: DrawCtx, title: string) {
  checkPage(ctx, 26)
  ctx.doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text(title, ctx.M, ctx.y)
  ctx.y += 16
  ctx.doc.moveTo(ctx.M, ctx.y).lineTo(ctx.M + ctx.W, ctx.y).strokeColor(TAN).lineWidth(0.7).stroke()
  ctx.y += 8
}

function kvRow(ctx: DrawCtx, label: string, value: string, valueColor = '#111111') {
  checkPage(ctx, 16)
  const labelW = Math.min(220, Math.round(ctx.W * 0.35))
  ctx.doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
    .text(label, ctx.M, ctx.y, { width: labelW, lineBreak: false })
  ctx.doc.font('Helvetica').fontSize(10).fillColor(valueColor)
    .text(value, ctx.M + labelW, ctx.y, { width: ctx.W - labelW })
  ctx.y += 15
}

interface Col {
  label: string
  w: number
  align?: 'left' | 'right'
}

function drawTableHeader(ctx: DrawCtx, cols: Col[]) {
  checkPage(ctx, 22)
  const headerH = 20
  ctx.doc.rect(ctx.M, ctx.y, ctx.W, headerH).fillColor('#F3F4F6').fill()
  let x = ctx.M + 6
  for (const c of cols) {
    ctx.doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#374151')
      .text(c.label, x, ctx.y + 6, {
        width: c.w - 6,
        align: c.align || 'left',
        lineBreak: false,
        ellipsis: true,
      })
    x += c.w
  }
  ctx.y += headerH
}

function drawTableRow(ctx: DrawCtx, cols: Col[], values: string[], zebra = false, opts?: { color?: string; bold?: boolean }) {
  const rowH = 15
  // Repeat header on new page for tables long enough to span pages
  if (ctx.y + rowH > ctx.BOTTOM) {
    ctx.doc.addPage()
    ctx.y = ctx.M
    drawTableHeader(ctx, cols)
  }
  if (zebra) {
    ctx.doc.rect(ctx.M, ctx.y, ctx.W, rowH).fillColor(ROW_ALT).fill()
  }
  let x = ctx.M + 6
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i]
    ctx.doc
      .font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.5)
      .fillColor(opts?.color || '#111111')
      .text(values[i] || '', x, ctx.y + 3.5, {
        width: c.w - 6,
        align: c.align || 'left',
        lineBreak: false,
        ellipsis: true,
      })
    x += c.w
  }
  ctx.y += rowH
}

/**
 * Distribute the page width across columns using proportional weights so
 * the same section renders correctly regardless of paper size / margins.
 */
function sizedCols(ctx: DrawCtx, spec: Array<{ label: string; weight: number; align?: 'left' | 'right' }>): Col[] {
  const totalWeight = spec.reduce((s, c) => s + c.weight, 0)
  return spec.map(c => ({
    label: c.label,
    w: Math.floor((c.weight / totalWeight) * ctx.W),
    align: c.align,
  }))
}

function drawTable<T>(ctx: DrawCtx, cols: Col[], rows: T[], mapRow: (row: T, i: number) => string[], footer?: string[]) {
  if (rows.length === 0) {
    ctx.doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('(no rows)', ctx.M, ctx.y)
    ctx.y += 14
    return
  }
  drawTableHeader(ctx, cols)
  let zebra = false
  for (let i = 0; i < rows.length; i++) {
    drawTableRow(ctx, cols, mapRow(rows[i], i), zebra)
    zebra = !zebra
  }
  if (footer) {
    ctx.doc.moveTo(ctx.M, ctx.y).lineTo(ctx.M + ctx.W, ctx.y).strokeColor(NAVY).lineWidth(1).stroke()
    ctx.y += 4
    drawTableRow(ctx, cols, footer, false, { color: NAVY, bold: true })
  }
  ctx.y += 8
}

// ============================================================
// Section renderers
// ============================================================

function drawCover(ctx: DrawCtx, data: MasterEventReportData, eventName: string) {
  const centerY = Math.round(ctx.PH * 0.32)
  ctx.doc.font('Helvetica-Bold').fontSize(11).fillColor(TAN)
    .text('MASTER EVENT REPORT', ctx.M, centerY - 40, { width: ctx.W, align: 'center', characterSpacing: 3 })

  ctx.doc.font('Helvetica-Bold').fontSize(34).fillColor(NAVY)
    .text(eventName, ctx.M, centerY, { width: ctx.W, align: 'center' })

  const eventDates = data.event.startDate
    ? `${fmtDate(data.event.startDate)}${data.event.endDate ? ` – ${fmtDate(data.event.endDate)}` : ''}`
    : ''
  if (eventDates) {
    ctx.doc.font('Helvetica').fontSize(14).fillColor(GRAY)
      .text(eventDates, ctx.M, centerY + 52, { width: ctx.W, align: 'center' })
  }
  if (data.event.location) {
    ctx.doc.font('Helvetica').fontSize(12).fillColor(GRAY)
      .text(data.event.location, ctx.M, centerY + 74, { width: ctx.W, align: 'center' })
  }
  if (data.event.organizationName) {
    ctx.doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY)
      .text(data.event.organizationName, ctx.M, centerY + 100, { width: ctx.W, align: 'center' })
  }

  const boxY = ctx.PH - 130
  const totalPeople = data.summary.participantCount + data.summary.individualCount
  ctx.doc.rect(ctx.M + 40, boxY, ctx.W - 80, 60).fillColor(BG_HIGHLIGHT).fill()
  ctx.doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
    .text(
      `${totalPeople} people registered   •   ` +
      `${fmtMoney(data.summary.totalInvoiced)} invoiced   •   ` +
      `${fmtMoney(data.summary.totalPaid)} paid`,
      ctx.M + 40,
      boxY + 15,
      { width: ctx.W - 80, align: 'center' }
    )
  ctx.doc.font('Helvetica').fontSize(9).fillColor(GRAY)
    .text(
      `${data.summary.groupCount} group registrations · ${data.summary.individualCount} individual registrations · ` +
      `${data.summary.waitlistCount} on waitlist · ${data.summary.emailsSent} emails sent`,
      ctx.M + 40,
      boxY + 32,
      { width: ctx.W - 80, align: 'center' }
    )
  ctx.doc.font('Helvetica').fontSize(9).fillColor(GRAY)
    .text(
      `Generated ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`,
      ctx.M,
      ctx.PH - 55,
      { width: ctx.W, align: 'center' }
    )
}

function drawTableOfContents(ctx: DrawCtx, data: MasterEventReportData) {
  sectionTitle(ctx, 'Contents', 'Sections included in this report. Empty sections are omitted.')

  const items: Array<{ label: string; count: number }> = [
    { label: 'Event Summary', count: 1 },
    { label: 'Group Registrations', count: data.groups.length },
    { label: 'Individual Registrations', count: data.individuals.length },
    { label: 'Participant Roster', count: data.participants.length },
    { label: 'Waitlist', count: data.waitlist.length },
    { label: 'Vendors', count: data.vendors.length },
    { label: 'Staff & Volunteers', count: data.staff.length },
    { label: 'Payments (Transactions)', count: data.payments.length },
    { label: 'Refunds', count: data.refunds.length },
    { label: 'Balances by Registration', count: data.balances.length },
    { label: 'Liability Forms', count: data.liabilityForms.length },
    { label: 'Check-In Activity', count: data.checkIns.length },
    { label: 'Medical Incidents', count: data.medicalIncidents.length },
    { label: 'Coupon Redemptions', count: data.couponRedemptions.length },
    { label: 'Email History', count: data.emailHistory.length },
  ]

  for (const it of items) {
    const included = it.count > 0 || it.label === 'Event Summary'
    const line = `${it.label}${it.count > 0 ? `  (${it.count})` : included ? '' : '  — none'}`
    ctx.doc.font(included ? 'Helvetica-Bold' : 'Helvetica').fontSize(11)
      .fillColor(included ? '#111111' : GRAY)
      .text(line, ctx.M + 20, ctx.y, { width: ctx.W - 40 })
    ctx.y += 18
  }
}

function drawEventSummary(ctx: DrawCtx, data: MasterEventReportData) {
  sectionTitle(ctx, 'Event Summary')

  subheader(ctx, 'Event')
  kvRow(ctx, 'Name:', safeTxt(data.event.name))
  if (data.event.organizationName) kvRow(ctx, 'Organization:', safeTxt(data.event.organizationName))
  if (data.event.startDate) kvRow(ctx, 'Start Date:', fmtDate(data.event.startDate))
  if (data.event.endDate) kvRow(ctx, 'End Date:', fmtDate(data.event.endDate))
  if (data.event.location) kvRow(ctx, 'Location:', safeTxt(data.event.location))
  if (data.event.capacity) kvRow(ctx, 'Capacity:', String(data.event.capacity))

  ctx.y += 4
  subheader(ctx, 'Registrations')
  kvRow(ctx, 'Group Registrations:', `${data.summary.groupCount}`)
  kvRow(ctx, 'Individual Registrations:', `${data.summary.individualCount}`)
  kvRow(ctx, 'Total Participants (from groups):', `${data.summary.participantCount}`)
  kvRow(ctx, 'People Checked In:', `${data.summary.checkedInCount}`)
  kvRow(ctx, 'On Waitlist:', `${data.summary.waitlistCount}`)
  kvRow(ctx, 'Vendors:', `${data.summary.vendorCount}`)
  kvRow(ctx, 'Staff & Volunteers:', `${data.summary.staffCount}`)

  ctx.y += 4
  subheader(ctx, 'Financial')
  kvRow(ctx, 'Total Invoiced:', fmtMoney(data.summary.totalInvoiced))
  kvRow(ctx, 'Total Paid:', fmtMoney(data.summary.totalPaid), GREEN)
  kvRow(ctx, 'Balance Remaining:', fmtMoney(data.summary.totalBalance), data.summary.totalBalance > 0 ? ORANGE : '#111111')
  if (data.summary.totalRefunded > 0) {
    kvRow(ctx, 'Total Refunded:', fmtMoney(data.summary.totalRefunded), RED)
  }

  ctx.y += 4
  subheader(ctx, 'Liability Forms')
  kvRow(ctx, 'Total Submitted:', `${data.summary.liabilityFormCounts.total}`)
  kvRow(ctx, 'Approved:', `${data.summary.liabilityFormCounts.approved}`, GREEN)
  kvRow(ctx, 'Pending Review:', `${data.summary.liabilityFormCounts.pending}`)
  kvRow(ctx, 'Denied:', `${data.summary.liabilityFormCounts.denied}`, RED)
  kvRow(ctx, 'Needs Revision:', `${data.summary.liabilityFormCounts.needsRevision}`, ORANGE)

  if (data.summary.incidentCount > 0 || data.summary.emailsSent > 0) {
    ctx.y += 4
    subheader(ctx, 'Activity')
    if (data.summary.emailsSent > 0) kvRow(ctx, 'Emails Sent:', `${data.summary.emailsSent}`)
    if (data.summary.incidentCount > 0) kvRow(ctx, 'Medical Incidents Logged:', `${data.summary.incidentCount}`)
  }
}

function drawGroupsSection(ctx: DrawCtx, groups: MasterEventReportData['groups']) {
  sectionTitle(ctx, `Group Registrations  (${groups.length})`, 'One row per group. Financials reflect the group\'s payment balance record.')

  const cols = sizedCols(ctx, [
    { label: 'Code', weight: 8 },
    { label: 'Group Name', weight: 18 },
    { label: 'Parish', weight: 15 },
    { label: 'Leader', weight: 14 },
    { label: 'Leader Email', weight: 18 },
    { label: 'Phone', weight: 10 },
    { label: 'Housing', weight: 8 },
    { label: 'Ppl', weight: 4, align: 'right' },
    { label: 'Invoiced', weight: 7, align: 'right' },
    { label: 'Paid', weight: 7, align: 'right' },
    { label: 'Balance', weight: 7, align: 'right' },
    { label: 'Registered', weight: 8 },
  ])

  let sumInvoiced = 0
  let sumPaid = 0
  let sumBalance = 0

  drawTable(
    ctx,
    cols,
    groups,
    (g) => {
      sumInvoiced += g.totalInvoiced
      sumPaid += g.totalPaid
      sumBalance += g.balance
      return [
        safeTxt(g.accessCode),
        safeTxt(g.groupName),
        safeTxt(g.parishName),
        safeTxt(g.groupLeaderName),
        safeTxt(g.groupLeaderEmail),
        safeTxt(g.groupLeaderPhone),
        humanize(g.housingType),
        String(g.participantCount),
        fmtMoney(g.totalInvoiced),
        fmtMoney(g.totalPaid),
        fmtMoney(g.balance),
        fmtDate(g.createdAt),
      ]
    },
    ['', '', '', '', '', '', '', 'Total', fmtMoney(sumInvoiced), fmtMoney(sumPaid), fmtMoney(sumBalance), '']
  )
}

function drawIndividualsSection(ctx: DrawCtx, individuals: MasterEventReportData['individuals']) {
  sectionTitle(ctx, `Individual Registrations  (${individuals.length})`, 'People who registered themselves (not through a group).')

  const cols = sizedCols(ctx, [
    { label: 'Name', weight: 15 },
    { label: 'Email', weight: 18 },
    { label: 'Phone', weight: 10 },
    { label: 'Age', weight: 4, align: 'right' },
    { label: 'Gender', weight: 6 },
    { label: 'Housing', weight: 8 },
    { label: 'Reg Status', weight: 8 },
    { label: 'Checked In', weight: 8 },
    { label: 'Invoiced', weight: 8, align: 'right' },
    { label: 'Paid', weight: 8, align: 'right' },
    { label: 'Balance', weight: 8, align: 'right' },
    { label: 'Registered', weight: 9 },
  ])

  let sumInvoiced = 0
  let sumPaid = 0
  let sumBalance = 0

  drawTable(
    ctx,
    cols,
    individuals,
    (i) => {
      sumInvoiced += i.totalInvoiced
      sumPaid += i.totalPaid
      sumBalance += i.balance
      return [
        `${i.firstName} ${i.lastName}`.trim(),
        safeTxt(i.email),
        safeTxt(i.phone),
        i.age != null ? String(i.age) : '—',
        humanize(i.gender),
        humanize(i.housingType),
        humanize(i.registrationStatus),
        i.checkedIn ? 'Yes' : 'No',
        fmtMoney(i.totalInvoiced),
        fmtMoney(i.totalPaid),
        fmtMoney(i.balance),
        fmtDate(i.createdAt),
      ]
    },
    ['', '', '', '', '', '', '', '', fmtMoney(sumInvoiced), fmtMoney(sumPaid), fmtMoney(sumBalance), '']
  )
}

function drawParticipantsSection(ctx: DrawCtx, participants: MasterEventReportData['participants']) {
  sectionTitle(ctx, `Participant Roster  (${participants.length})`, 'Every individual person on the event roster, rolled up across group registrations.')

  const cols = sizedCols(ctx, [
    { label: 'First Name', weight: 12 },
    { label: 'Last Name', weight: 12 },
    { label: 'Age', weight: 4, align: 'right' },
    { label: 'Gender', weight: 7 },
    { label: 'Type', weight: 10 },
    { label: 'T-Shirt', weight: 6 },
    { label: 'Group', weight: 18 },
    { label: 'Parish', weight: 18 },
    { label: 'Checked In', weight: 7 },
    { label: 'Checked-In At', weight: 12 },
  ])

  drawTable(
    ctx,
    cols,
    participants,
    (p) => [
      safeTxt(p.firstName),
      safeTxt(p.lastName),
      p.age != null ? String(p.age) : '—',
      humanize(p.gender),
      humanize(p.participantType),
      safeTxt(p.tShirtSize),
      safeTxt(p.groupName),
      safeTxt(p.parishName),
      p.checkedIn ? 'Yes' : 'No',
      p.checkedInAt ? fmtDate(p.checkedInAt, { withTime: true }) : '—',
    ]
  )
}

function drawWaitlistSection(ctx: DrawCtx, waitlist: MasterEventReportData['waitlist']) {
  sectionTitle(ctx, `Waitlist  (${waitlist.length})`, 'People / groups requesting a spot that were not (or are not yet) admitted.')

  const cols = sizedCols(ctx, [
    { label: 'Name', weight: 15 },
    { label: 'Email', weight: 20 },
    { label: 'Phone', weight: 10 },
    { label: 'Party Size', weight: 6, align: 'right' },
    { label: 'Status', weight: 8 },
    { label: 'Requested', weight: 10 },
    { label: 'Notified', weight: 10 },
    { label: 'Notes', weight: 21 },
  ])

  drawTable(
    ctx,
    cols,
    waitlist,
    (w) => [
      safeTxt(w.name),
      safeTxt(w.email),
      safeTxt(w.phone),
      String(w.partySize),
      humanize(w.status),
      fmtDate(w.createdAt),
      w.notifiedAt ? fmtDate(w.notifiedAt) : '—',
      safeTxt(w.notes),
    ]
  )
}

function drawVendorsSection(ctx: DrawCtx, vendors: MasterEventReportData['vendors']) {
  sectionTitle(ctx, `Vendors  (${vendors.length})`, 'Vendor booth registrations, approval status, and payment.')

  const cols = sizedCols(ctx, [
    { label: 'Business', weight: 18 },
    { label: 'Contact', weight: 14 },
    { label: 'Email', weight: 20 },
    { label: 'Phone', weight: 10 },
    { label: 'Tier', weight: 8 },
    { label: 'Tier Price', weight: 7, align: 'right' },
    { label: 'Invoice', weight: 7, align: 'right' },
    { label: 'Paid', weight: 7, align: 'right' },
    { label: 'Approval', weight: 9 },
  ])

  drawTable(
    ctx,
    cols,
    vendors,
    (v) => [
      safeTxt(v.businessName),
      safeTxt(v.contactName),
      safeTxt(v.email),
      safeTxt(v.phone),
      humanize(v.selectedTier),
      fmtMoney(v.tierPrice),
      fmtMoney(v.invoiceTotal),
      fmtMoney(v.amountPaid),
      `${humanize(v.status)}${v.paymentStatus ? ` / ${humanize(v.paymentStatus)}` : ''}`,
    ]
  )
}

function drawStaffSection(ctx: DrawCtx, staff: MasterEventReportData['staff']) {
  sectionTitle(ctx, `Staff & Volunteers  (${staff.length})`, 'Event staff plus vendor booth workers.')

  const cols = sizedCols(ctx, [
    { label: 'Name', weight: 14 },
    { label: 'Email', weight: 18 },
    { label: 'Phone', weight: 10 },
    { label: 'Role', weight: 12 },
    { label: 'Type', weight: 8 },
    { label: 'Vendor', weight: 15 },
    { label: 'Price Paid', weight: 8, align: 'right' },
    { label: 'Payment', weight: 8 },
    { label: 'Checked In', weight: 7 },
  ])

  drawTable(
    ctx,
    cols,
    staff,
    (s) => [
      `${s.firstName} ${s.lastName}`.trim(),
      safeTxt(s.email),
      safeTxt(s.phone),
      safeTxt(s.role),
      s.isVendorStaff ? 'Vendor Staff' : 'Event Staff',
      safeTxt(s.vendorBusinessName),
      fmtMoney(s.pricePaid),
      humanize(s.paymentStatus),
      s.checkedIn ? 'Yes' : 'No',
    ]
  )
}

function drawPaymentsSection(ctx: DrawCtx, payments: MasterEventReportData['payments']) {
  sectionTitle(ctx, `Payments  (${payments.length})`, 'Every payment row on file, including Stripe payment intent IDs, check numbers, and who processed each.')

  const cols = sizedCols(ctx, [
    { label: 'Date', weight: 10 },
    { label: 'Payer', weight: 18 },
    { label: 'Reg Type', weight: 7 },
    { label: 'Amount', weight: 7, align: 'right' },
    { label: 'Method', weight: 7 },
    { label: 'Payment Type', weight: 8 },
    { label: 'Status', weight: 7 },
    { label: 'Stripe ID', weight: 15 },
    { label: 'Check #', weight: 6 },
    { label: 'Processed By', weight: 10 },
    { label: 'Notes', weight: 5 },
  ])

  let total = 0
  drawTable(
    ctx,
    cols,
    payments,
    (p) => {
      total += p.amount
      return [
        fmtDate(p.processedAt),
        safeTxt(p.payer),
        humanize(p.registrationType),
        fmtMoney(p.amount),
        humanize(p.paymentMethod),
        humanize(p.paymentType),
        humanize(p.paymentStatus),
        safeTxt(p.stripePaymentIntentId, ''),
        safeTxt(p.checkNumber, ''),
        safeTxt(p.processedByName),
        safeTxt(p.notes, ''),
      ]
    },
    ['', '', 'Total', fmtMoney(total), '', '', '', '', '', '', '']
  )
}

function drawRefundsSection(ctx: DrawCtx, refunds: MasterEventReportData['refunds']) {
  sectionTitle(ctx, `Refunds  (${refunds.length})`, 'Refunds processed for this event.')

  const cols = sizedCols(ctx, [
    { label: 'Date', weight: 10 },
    { label: 'Payer', weight: 22 },
    { label: 'Amount', weight: 8, align: 'right' },
    { label: 'Method', weight: 10 },
    { label: 'Reason', weight: 20 },
    { label: 'Status', weight: 10 },
    { label: 'Processed By', weight: 20 },
  ])

  let total = 0
  drawTable(
    ctx,
    cols,
    refunds,
    (r) => {
      total += r.refundAmount
      return [
        fmtDate(r.processedAt),
        safeTxt(r.payer),
        fmtMoney(r.refundAmount),
        humanize(r.refundMethod),
        humanize(r.refundReason),
        humanize(r.status),
        safeTxt(r.processedByName),
      ]
    },
    ['', 'Total', fmtMoney(total), '', '', '', '']
  )
}

function drawBalancesSection(ctx: DrawCtx, balances: MasterEventReportData['balances']) {
  sectionTitle(ctx, `Balances by Registration  (${balances.length})`, 'One row per registration with invoiced amount, paid, remaining, and status.')

  const cols = sizedCols(ctx, [
    { label: 'Payer', weight: 30 },
    { label: 'Type', weight: 10 },
    { label: 'Status', weight: 12 },
    { label: 'Invoiced', weight: 10, align: 'right' },
    { label: 'Paid', weight: 10, align: 'right' },
    { label: 'Balance', weight: 10, align: 'right' },
    { label: 'Last Payment', weight: 18 },
  ])

  let sumInvoiced = 0
  let sumPaid = 0
  let sumBalance = 0

  drawTable(
    ctx,
    cols,
    balances,
    (b) => {
      sumInvoiced += b.totalAmountDue
      sumPaid += b.amountPaid
      sumBalance += b.amountRemaining
      return [
        safeTxt(b.payer),
        humanize(b.registrationType),
        humanize(b.paymentStatus),
        fmtMoney(b.totalAmountDue),
        fmtMoney(b.amountPaid),
        fmtMoney(b.amountRemaining),
        b.lastPaymentDate ? fmtDate(b.lastPaymentDate) : '—',
      ]
    },
    ['Total', '', '', fmtMoney(sumInvoiced), fmtMoney(sumPaid), fmtMoney(sumBalance), '']
  )
}

function drawLiabilityFormsSection(ctx: DrawCtx, forms: MasterEventReportData['liabilityForms']) {
  const counts = forms.reduce(
    (acc, f) => {
      acc[f.formStatus] = (acc[f.formStatus] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const subtitle = `Total ${forms.length}. ` + Object.entries(counts).map(([s, n]) => `${humanize(s)}: ${n}`).join(' · ')

  sectionTitle(ctx, `Liability Forms  (${forms.length})`, subtitle)

  const cols = sizedCols(ctx, [
    { label: 'Participant', weight: 16 },
    { label: 'Email', weight: 18 },
    { label: 'Form Type', weight: 10 },
    { label: 'Group', weight: 14 },
    { label: 'Status', weight: 10 },
    { label: 'Completed', weight: 5 },
    { label: 'Completed At', weight: 10 },
    { label: 'Approved By', weight: 10 },
    { label: 'Denial / Notes', weight: 22 },
  ])

  drawTable(
    ctx,
    cols,
    forms,
    (f) => {
      const notes = f.deniedReason || f.approvalNotes || ''
      return [
        safeTxt(f.participantName),
        safeTxt(f.email),
        humanize(f.formType),
        safeTxt(f.groupName),
        humanize(f.formStatus),
        f.completed ? 'Yes' : 'No',
        f.completedAt ? fmtDate(f.completedAt) : '—',
        safeTxt(f.approvedByName, ''),
        notes,
      ]
    }
  )
}

function drawCheckInsSection(ctx: DrawCtx, logs: MasterEventReportData['checkIns']) {
  sectionTitle(ctx, `Check-In Activity  (${logs.length})`, 'Every check-in / check-out event, in chronological order.')

  const cols = sizedCols(ctx, [
    { label: 'When', weight: 12 },
    { label: 'Person', weight: 22 },
    { label: 'Type', weight: 10 },
    { label: 'Action', weight: 10 },
    { label: 'Station', weight: 15 },
    { label: 'Performed By', weight: 31 },
  ])

  drawTable(
    ctx,
    cols,
    logs,
    (l) => [
      fmtDate(l.createdAt, { withTime: true }),
      safeTxt(l.personName),
      humanize(l.personType),
      humanize(l.action),
      safeTxt(l.station, ''),
      safeTxt(l.performedByName, ''),
    ]
  )
}

function drawMedicalIncidentsSection(ctx: DrawCtx, incidents: MasterEventReportData['medicalIncidents']) {
  sectionTitle(ctx, `Medical Incidents  (${incidents.length})`, 'Rapha incident records.')

  const cols = sizedCols(ctx, [
    { label: 'When', weight: 12 },
    { label: 'Participant', weight: 20 },
    { label: 'Type', weight: 12 },
    { label: 'Severity', weight: 10 },
    { label: 'Location', weight: 16 },
    { label: 'Status', weight: 10 },
    { label: 'Resolved At', weight: 20 },
  ])

  drawTable(
    ctx,
    cols,
    incidents,
    (i) => [
      fmtDate(i.incidentDate, { withTime: true }),
      safeTxt(i.participantName),
      humanize(i.incidentType),
      humanize(i.severity),
      safeTxt(i.location),
      humanize(i.status),
      i.resolvedAt ? fmtDate(i.resolvedAt, { withTime: true }) : '—',
    ]
  )
}

function drawCouponsSection(ctx: DrawCtx, redemptions: MasterEventReportData['couponRedemptions']) {
  sectionTitle(ctx, `Coupon Redemptions  (${redemptions.length})`, 'Discount codes applied at checkout.')

  const cols = sizedCols(ctx, [
    { label: 'When', weight: 12 },
    { label: 'Coupon Code', weight: 12 },
    { label: 'Coupon Name', weight: 22 },
    { label: 'Redeemed By', weight: 24 },
    { label: 'Reg Type', weight: 10 },
    { label: 'Discount', weight: 10, align: 'right' },
  ])

  let total = 0
  drawTable(
    ctx,
    cols,
    redemptions,
    (r) => {
      total += r.discountApplied
      return [
        fmtDate(r.redeemedAt),
        safeTxt(r.couponCode),
        safeTxt(r.couponName),
        safeTxt(r.payer),
        humanize(r.registrationType),
        fmtMoney(r.discountApplied),
      ]
    },
    ['', '', '', '', 'Total', fmtMoney(total)]
  )
}

function drawEmailHistorySection(ctx: DrawCtx, emails: MasterEventReportData['emailHistory']) {
  sectionTitle(ctx, `Email History  (${emails.length})`, 'Every email the system sent related to this event. Body text is not included; use the admin email inspector for full content.')

  const cols = sizedCols(ctx, [
    { label: 'Sent', weight: 12 },
    { label: 'Recipient', weight: 22 },
    { label: 'Name', weight: 14 },
    { label: 'Type', weight: 10 },
    { label: 'Subject', weight: 32 },
    { label: 'Status', weight: 10 },
  ])

  drawTable(
    ctx,
    cols,
    emails,
    (e) => [
      fmtDate(e.sentAt, { withTime: true }),
      safeTxt(e.recipientEmail),
      safeTxt(e.recipientName, ''),
      humanize(e.emailType),
      safeTxt(e.subject),
      humanize(e.sentStatus),
    ]
  )
}
