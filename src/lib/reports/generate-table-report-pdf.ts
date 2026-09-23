/**
 * Generic PDFKit report renderer: a title block followed by sections, each
 * holding key/value summary rows and/or a table. Table cells wrap onto
 * multiple lines and the header row repeats when a table spans pages.
 *
 * Used by the report exports that previously returned plain text under a
 * .pdf filename (forms, certificates, housing, staff, vendors, rooms).
 */

export interface TableReportColumn {
  label: string
  /** Relative width; columns share the page width in proportion. */
  weight: number
  align?: 'left' | 'right'
}

export interface TableReportSection {
  title: string
  subtitle?: string
  summary?: Array<[string, string]>
  columns?: TableReportColumn[]
  rows?: string[][]
  /** Shown instead of the table when `columns` is set but `rows` is empty. */
  emptyText?: string
}

export interface TableReportOptions {
  title: string
  eventName: string
  /** Footer label, e.g. "Forms Status Report". Defaults to `title`. */
  footerLabel?: string
  landscape?: boolean
  sections: TableReportSection[]
}

const NAVY = '#1E3A5F'
const TAN = '#9C8466'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#E5E7EB'
const BG_HIGHLIGHT = '#F5F1E8'
const ROW_ALT = '#F9FAFB'

const CELL_FONT_SIZE = 8.5
const CELL_PAD_X = 6
const CELL_PAD_Y = 4

export async function generateTableReportPDF(opts: TableReportOptions): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: opts.landscape ? 'landscape' : 'portrait',
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
      const LW = Math.round(W * 0.4)

      let y = M

      const newPage = () => {
        doc.addPage()
        y = M
      }
      const checkPage = (need: number) => {
        if (y + need > BOTTOM) newPage()
      }

      // Title block
      doc.font('Helvetica-Bold').fontSize(20).fillColor(NAVY).text(opts.title, M, y, { width: W })
      y = doc.y + 4
      doc.font('Helvetica').fontSize(11).fillColor(GRAY).text(opts.eventName || 'Event', M, y, { width: W })
      y = doc.y + 2
      doc.font('Helvetica').fontSize(10).fillColor(GRAY)
        .text(`Generated: ${new Date().toLocaleDateString()}`, M, y)
      y = doc.y + 6
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(2).stroke()
      y += 14

      for (const section of opts.sections) {
        // Section heading (keep with at least a couple of rows)
        checkPage(60)
        doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(section.title, M, y, { width: W })
        y = doc.y + 2
        if (section.subtitle) {
          doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(section.subtitle, M, y, { width: W })
          y = doc.y + 2
        }
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 8

        if (section.summary && section.summary.length > 0) {
          for (const [label, value] of section.summary) {
            doc.font('Helvetica').fontSize(10)
            const h = Math.max(14, doc.heightOfString(value || ' ', { width: W - LW }) + 2)
            checkPage(h)
            doc.rect(M, y - 2, W, h).fillColor(BG_HIGHLIGHT).fill()
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
              .text(label, M + 8, y, { width: LW - 8, lineBreak: false, ellipsis: true })
            doc.font('Helvetica').fontSize(10).fillColor('#111111')
              .text(value, M + LW, y, { width: W - LW })
            y += h
          }
          y += 10
        }

        if (section.columns && section.columns.length > 0) {
          const rows = section.rows || []
          if (rows.length === 0) {
            checkPage(16)
            doc.font('Helvetica').fontSize(10).fillColor(GRAY)
              .text(section.emptyText || '(none)', M, y, { width: W })
            y = doc.y + 12
            continue
          }

          const totalWeight = section.columns.reduce((s, c) => s + c.weight, 0)
          const cols = section.columns.map(c => ({
            ...c,
            w: (c.weight / totalWeight) * W,
          }))

          const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(CELL_FONT_SIZE)
            const headerH = Math.max(
              ...cols.map(c => doc.heightOfString(c.label, { width: c.w - CELL_PAD_X * 2 }))
            ) + CELL_PAD_Y * 2
            checkPage(headerH + 16)
            doc.rect(M, y, W, headerH).fillColor('#F3F4F6').fill()
            let x = M
            for (const c of cols) {
              doc.font('Helvetica-Bold').fontSize(CELL_FONT_SIZE).fillColor('#374151')
                .text(c.label, x + CELL_PAD_X, y + CELL_PAD_Y, {
                  width: c.w - CELL_PAD_X * 2,
                  align: c.align || 'left',
                })
              x += c.w
            }
            y += headerH
            return headerH
          }

          const headerH = drawHeader()
          // A single row may never be taller than a fresh page can hold.
          const maxRowH = BOTTOM - M - headerH

          rows.forEach((row, rowIndex) => {
            doc.font('Helvetica').fontSize(CELL_FONT_SIZE)
            const textH = Math.max(
              ...cols.map((c, i) =>
                doc.heightOfString(row[i] || ' ', { width: c.w - CELL_PAD_X * 2 })
              )
            )
            const rowH = Math.min(textH + CELL_PAD_Y * 2, maxRowH)

            if (y + rowH > BOTTOM) {
              newPage()
              drawHeader()
            }

            if (rowIndex % 2 === 1) {
              doc.rect(M, y, W, rowH).fillColor(ROW_ALT).fill()
            }
            let x = M
            for (let i = 0; i < cols.length; i++) {
              const c = cols[i]
              doc.font('Helvetica').fontSize(CELL_FONT_SIZE).fillColor('#111111')
                .text(row[i] || '', x + CELL_PAD_X, y + CELL_PAD_Y, {
                  width: c.w - CELL_PAD_X * 2,
                  // +2 slack: heightOfString and the renderer round
                  // differently, and an exact fit can ellipsize a line.
                  height: rowH - CELL_PAD_Y * 2 + 2,
                  align: c.align || 'left',
                  ellipsis: true,
                })
              x += c.w
            }
            y += rowH
            doc.moveTo(M, y).lineTo(M + W, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
          })
          y += 14
        }
      }

      // Footers on all pages
      const label = opts.footerLabel || opts.title
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        // Footer sits inside the bottom margin; zero it so PDFKit does not
        // auto-add a new page.
        doc.page.margins.bottom = 0
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`ChiRho Events — ${label} — Confidential`, M, fy, { width: W, align: 'left', lineBreak: false })
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`Page ${i + 1} of ${pagesRange.count}`, M, fy, { width: W, align: 'right', lineBreak: false })
      }

      doc.end()
    } catch (err) {
      console.error('[generateTableReportPDF] failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}

/** Standard response for a generated report PDF. */
export function pdfResponseInit(filename: string): ResponseInit {
  return {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\w.\-]+/g, '_')}"`,
    },
  }
}
