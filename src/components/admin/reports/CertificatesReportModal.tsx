'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, X, Shield, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface CertificatesReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function CertificatesReportModal({ isOpen, onClose, eventId, eventName }: CertificatesReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, eventId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/reports/certificates`)
      if (!response.ok) throw new Error()
      setData(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/reports/certificates/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificates_report_${eventName.replace(/\s+/g, '_')}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Export failed')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl text-[#1E3A5F] flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Safe Environment Certificates - {eventName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0"><X className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">CERTIFICATE STATUS</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Required</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.required}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Uploaded</p>
                    <p className="text-2xl font-bold text-blue-600">{data.uploaded}</p>
                    <p className="text-xs text-[#6B7280]">{data.uploadRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Verified</p>
                    <p className="text-2xl font-bold text-green-600">{data.verified}</p>
                    <p className="text-xs text-[#6B7280]">{data.verifyRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Missing</p>
                    <p className="text-2xl font-bold text-red-600">{data.missing}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.programs && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">CERTIFICATE PROGRAMS</h3>
                <div className="space-y-2">
                  {Object.entries(data.programs).map(([program, count]: [string, any]) => (
                    <div key={program} className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="uppercase">{program}</span>
                      <span className="font-semibold">{count} ({Math.round((count / data.uploaded) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.pending && data.pending.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">PENDING VERIFICATION ({data.pending.length})</h3>
                <div className="space-y-2">
                  {data.pending.map((cert: any, idx: number) => (
                    <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex justify-between">
                        <span>{cert.name}</span>
                        <span className="text-sm text-[#6B7280]">Uploaded {cert.uploadedDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.missingList && data.missingList.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">MISSING CERTIFICATES ({data.missingList.length}) ⚠️</h3>
                <div className="space-y-2">
                  {data.missingList.map((person: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-[#6B7280]">{person.group}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Mail className="h-3 w-3 mr-1" />
                          Remind
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => handleExport('csv')} disabled={exporting !== null} variant="outline" className="flex-1">
                {exporting === 'csv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                CSV
              </Button>
              <Button onClick={() => handleExport('pdf')} disabled={exporting !== null} variant="outline" className="flex-1">
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                PDF
              </Button>
              <Button onClick={onClose} variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">Close</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#6B7280]">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
