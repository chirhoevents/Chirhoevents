/** CSV that opens cleanly in Excel (BOM for accents, quoted cells, CRLF) */
export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const cell = (value: unknown) => {
    if (value === null || value === undefined) return ''
    let text = value instanceof Date ? value.toISOString() : String(value)
    // Keep spreadsheet apps from treating a cell as a formula
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [headers, ...rows].map(row => row.map(cell).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function csvResponse(filename: string, csv: string): Response {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}
