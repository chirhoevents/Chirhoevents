'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface HousingReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function HousingReportModal({ isOpen, onClose, eventId, eventName }: HousingReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, eventId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/reports/housing`)
      if (!response.ok) throw new Error('Failed')
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
      const response = await fetch(`/api/admin/events/${eventId}/reports/housing/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `housing_report_${eventName.replace(/\s+/g, '_')}.${format}`
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
          <DialogTitle className="text-2xl text-[#1E3A5F]">Housing Report - {eventName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">HOUSING BREAKDOWN</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">On-Campus</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.onCampus}</p>
                    <p className="text-xs text-[#6B7280]">{Math.round((data.onCampus / data.total) * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Off-Campus</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.offCampus}</p>
                    <p className="text-xs text-[#6B7280]">{Math.round((data.offCampus / data.total) * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Day Pass</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{data.dayPass}</p>
                    <p className="text-xs text-[#6B7280]">{Math.round((data.dayPass / data.total) * 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.onCampusDetails && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">ON-CAMPUS DETAILS</h3>
                <div className="space-y-2">
                  {Object.entries(data.onCampusDetails).map(([type, details]: [string, any]) => (
                    <div key={type} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between">
                        <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                        <span className="font-semibold">Total: {details.total}</span>
                      </div>
                      <div className="text-sm text-[#6B7280] ml-4">
                        Male: {details.male} | Female: {details.female}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.roomTypes && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">INDIVIDUAL ROOM TYPES</h3>
                <div className="space-y-2">
                  {Object.entries(data.roomTypes).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="capitalize">{type} Rooms</span>
                      <span className="font-semibold">{count} people</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.specialAccommodations && data.specialAccommodations.ada > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">SPECIAL ACCOMMODATIONS</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p>ADA Accessibility Needs: {data.specialAccommodations.ada} people</p>
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
