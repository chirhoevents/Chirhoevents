'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Loader2, Printer } from 'lucide-react'

interface TShirtReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

interface GroupRow {
  group: string
  sizes: Record<string, number>
  total: number
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export default function TShirtReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: TShirtReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [view, setView] = useState<'totals' | 'groups'>('totals')

  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      try {
        setLoading(true)
        setError(false)
        const res = await fetch(`/api/admin/events/${eventId}/reports/tshirts`)
        if (!res.ok) throw new Error('Failed to fetch')
        setData(await res.json())
      } catch (e) {
        console.error('Error loading t-shirt report:', e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isOpen, eventId])

  const sizes: string[] = data?.sizes || []
  const groups: GroupRow[] = data?.byGroup || []

  const totalsRow = useMemo(() => {
    const t: Record<string, number> = {}
    for (const s of sizes) t[s] = data?.sizeCounts?.[s]?.total || 0
    return t
  }, [sizes, data])

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const safeName = eventName.replace(/\s+/g, '_')

  const exportTotalsCsv = () => {
    const rows = [['Size', 'Total', 'Youth', 'Adult']]
    for (const s of sizes) {
      const c = data.sizeCounts[s]
      rows.push([s, c.total, c.youth, c.adult] as any)
    }
    rows.push(['TOTAL', data.totalShirts, data.totalYouth, data.totalAdult] as any)
    download(`tshirt_totals_${safeName}.csv`, rows.map(r => r.map(csvCell).join(',')).join('\n'))
  }

  const exportGroupsCsv = () => {
    const rows: (string | number)[][] = [['Group', ...sizes, 'Total']]
    for (const g of groups) rows.push([g.group, ...sizes.map(s => g.sizes[s] || 0), g.total])
    rows.push(['TOTAL', ...sizes.map(s => totalsRow[s]), data.totalShirts])
    download(`tshirts_by_group_${safeName}.csv`, rows.map(r => r.map(csvCell).join(',')).join('\n'))
  }

  const printGroups = () => {
    const head = `<tr><th style="text-align:left">Group</th>${sizes
      .map(s => `<th>${escapeHtml(s)}</th>`)
      .join('')}<th>Total</th></tr>`
    const body = groups
      .map(
        g =>
          `<tr><td>${escapeHtml(g.group)}</td>${sizes
            .map(s => `<td>${g.sizes[s] || ''}</td>`)
            .join('')}<td><strong>${g.total}</strong></td></tr>`
      )
      .join('')
    const foot = `<tr><td><strong>TOTAL</strong></td>${sizes
      .map(s => `<td><strong>${totalsRow[s]}</strong></td>`)
      .join('')}<td><strong>${data.totalShirts}</strong></td></tr>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>T-Shirts by Group</title><style>
      body{font-family:Arial,sans-serif;padding:16px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #bbb;padding:5px 7px;text-align:center}
      td:first-child{text-align:left}
      tr:nth-child(even){background:#f6f6f6}
      </style></head><body><h2>${escapeHtml(eventName)} - T-Shirts by Group</h2>
      <table><thead>${head}</thead><tbody>${body}${foot}</tbody></table></body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">
            T-Shirt Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : error || !data ? (
          <div className="text-center py-8 text-[#6B7280]">Failed to load report.</div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Shirts</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.totalShirts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Youth</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.totalYouth}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Adult</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.totalAdult}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">No Size Entered</p>
                    <p className="text-2xl font-bold text-amber-600">{data.missingCount}</p>
                  </div>
                </div>
                <p className="text-xs text-[#6B7280] mt-3">
                  Includes group participants, individual registrations and staff.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={view === 'totals' ? 'default' : 'outline'}
                onClick={() => setView('totals')}
              >
                Order Totals
              </Button>
              <Button
                variant={view === 'groups' ? 'default' : 'outline'}
                onClick={() => setView('groups')}
              >
                By Group (Packing)
              </Button>
              <div className="ml-auto flex gap-2">
                {view === 'groups' && (
                  <Button variant="outline" onClick={printGroups}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={view === 'totals' ? exportTotalsCsv : exportGroupsCsv}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            {sizes.length === 0 ? (
              <div className="text-center py-8 text-[#6B7280]">No T-shirt sizes entered yet.</div>
            ) : view === 'totals' ? (
              <table className="w-full text-sm border">
                <thead className="bg-[#F5F1E8]">
                  <tr>
                    <th className="text-left p-2">Size</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Youth</th>
                    <th className="text-right p-2">Adult</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map(s => (
                    <tr key={s} className="border-t">
                      <td className="p-2 font-medium">{s}</td>
                      <td className="p-2 text-right font-semibold">{data.sizeCounts[s].total}</td>
                      <td className="p-2 text-right">{data.sizeCounts[s].youth}</td>
                      <td className="p-2 text-right">{data.sizeCounts[s].adult}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 bg-[#F5F1E8] font-bold">
                    <td className="p-2">TOTAL</td>
                    <td className="p-2 text-right">{data.totalShirts}</td>
                    <td className="p-2 text-right">{data.totalYouth}</td>
                    <td className="p-2 text-right">{data.totalAdult}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-[#F5F1E8]">
                    <tr>
                      <th className="text-left p-2">Group</th>
                      {sizes.map(s => (
                        <th key={s} className="text-center p-2">{s}</th>
                      ))}
                      <th className="text-center p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.group} className="border-t">
                        <td className="p-2 font-medium">{g.group}</td>
                        {sizes.map(s => (
                          <td key={s} className="p-2 text-center">{g.sizes[s] || ''}</td>
                        ))}
                        <td className="p-2 text-center font-semibold">{g.total}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-[#F5F1E8] font-bold">
                      <td className="p-2">TOTAL</td>
                      {sizes.map(s => (
                        <td key={s} className="p-2 text-center">{totalsRow[s]}</td>
                      ))}
                      <td className="p-2 text-center">{data.totalShirts}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
