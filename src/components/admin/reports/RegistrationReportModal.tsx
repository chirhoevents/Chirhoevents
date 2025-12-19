'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface RegistrationReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function RegistrationReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: RegistrationReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, eventId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/reports/registrations`)
      if (!response.ok) throw new Error('Failed to fetch')
      const reportData = await response.json()
      setData(reportData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/reports/registrations/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        }
      )
      if (!response.ok) throw new Error('Failed to export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registration_report_${eventName.replace(/\s+/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to export report.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl text-[#1E3A5F]">
              Registration Report - {eventName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Registration Summary */}
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">REGISTRATION SUMMARY</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Registrations</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.totalRegistrations} people
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Group Registrations</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.groupCount}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {data.groupParticipants} people ({Math.round((data.groupParticipants / data.totalRegistrations) * 100)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Individual Registrations</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.individualCount}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      ({Math.round((data.individualCount / data.totalRegistrations) * 100)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Avg Group Size</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.avgGroupSize.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">DEMOGRAPHICS</h3>
              <div className="space-y-2">
                {Object.entries(data.demographics || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">
                        {value.total} ({Math.round((value.total / data.totalRegistrations) * 100)}%)
                      </span>
                    </div>
                    {value.male !== undefined && (
                      <div className="text-sm text-[#6B7280] ml-4">
                        Male: {value.male} ({Math.round((value.male / value.total) * 100)}%) |
                        Female: {value.female} ({Math.round((value.female / value.total) * 100)}%)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Housing Breakdown */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">HOUSING BREAKDOWN</h3>
              <div className="space-y-2">
                {Object.entries(data.housingBreakdown || {}).map(([key, count]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-semibold">
                      {count} ({Math.round((count / data.totalRegistrations) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Groups */}
            {data.topGroups && data.topGroups.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">TOP PARISHES/GROUPS</h3>
                <div className="space-y-2">
                  {data.topGroups.slice(0, 5).map((group: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm">
                        {index + 1}. {group.name}
                      </span>
                      <span className="font-semibold">{group.count} people</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleExport('csv')}
                disabled={exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'csv' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download CSV
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Button onClick={onClose} variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#6B7280]">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
