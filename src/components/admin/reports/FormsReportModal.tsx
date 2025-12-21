'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface FormsReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function FormsReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: FormsReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, eventId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/reports/forms`)
      if (!response.ok) throw new Error('Failed to fetch')
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
      const response = await fetch(`/api/admin/events/${eventId}/reports/forms/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!response.ok) throw new Error('Failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forms_report_${eventName.replace(/\s+/g, '_')}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to export')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">
            Forms Status Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">OVERALL STATUS</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Forms Completed: {data.formsCompleted}/{data.formsRequired}</span>
                      <span className="font-semibold">{data.completionRate}%</span>
                    </div>
                    <Progress value={data.completionRate} className="h-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#6B7280]">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{data.formsCompleted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#6B7280]">Pending</p>
                      <p className="text-2xl font-bold text-orange-600">{data.formsPending}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">COMPLETION BY TYPE</h3>
              <div className="space-y-3">
                {Object.entries(data.byParticipantType || {}).map(([type, stats]: [string, any]) => (
                  <div key={type} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                      <span>{stats.completed}/{stats.total} ({Math.round((stats.completed / stats.total) * 100)}%)</span>
                    </div>
                    <Progress value={(stats.completed / stats.total) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {data.pendingByGroup && data.pendingByGroup.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">PENDING FORMS BY GROUP</h3>
                <div className="space-y-2">
                  {data.pendingByGroup.map((group: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm">{group.name}</span>
                      <span className="text-sm">
                        {group.pending} pending ({group.completed}/{group.total})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.certificates && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">SAFE ENVIRONMENT CERTIFICATES</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-2">
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span className="font-semibold">{data.certificates.uploaded}/{data.certificates.required} ({data.certificates.uploadRate}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified:</span>
                    <span className="font-semibold">{data.certificates.verified}/{data.certificates.required} ({data.certificates.verifyRate}%)</span>
                  </div>
                  {data.certificates.missing > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Missing:</span>
                      <span className="font-semibold">{data.certificates.missing} ⚠️</span>
                    </div>
                  )}
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
