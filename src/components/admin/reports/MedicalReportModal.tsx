'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface MedicalReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function MedicalReportModal({ isOpen, onClose, eventId, eventName }: MedicalReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, eventId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/reports/medical`)
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
      const response = await fetch(`/api/admin/events/${eventId}/reports/medical/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `medical_report_${eventName.replace(/\s+/g, '_')}.${format}`
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
            <DialogTitle className="text-2xl text-[#1E3A5F]">Dietary & Medical Report - {eventName}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0"><X className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-semibold text-red-800">CRITICAL INFORMATION FOR EVENT SAFETY</p>
            </div>

            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">SUMMARY</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Allergies</p>
                    <p className="text-2xl font-bold text-red-600">{data.allergiesCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Dietary Restrictions</p>
                    <p className="text-2xl font-bold text-orange-600">{data.dietaryCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Medical Conditions</p>
                    <p className="text-2xl font-bold text-blue-600">{data.medicalCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.allergies && data.allergies.severe && data.allergies.severe.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">🔴 LIFE-THREATENING ALLERGIES</h3>
                <div className="space-y-2">
                  {data.allergies.severe.map((allergy: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-300 rounded">
                      <div className="flex justify-between">
                        <span className="font-semibold">{allergy.type}</span>
                        <span className="text-red-600">{allergy.count} people</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.dietary && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">DIETARY RESTRICTIONS</h3>
                <div className="space-y-2">
                  {Object.entries(data.dietary).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{count} people</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.medical && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">MEDICAL CONDITIONS</h3>
                <div className="space-y-2">
                  {Object.entries(data.medical).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{count} people</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.medications && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">MEDICATIONS REQUIRED</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-2">
                  {Object.entries(data.medications).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type.replace(/_/g, ' ')}:</span>
                      <span className="font-semibold">{count} people</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.ada && data.ada.total > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">ADA ACCOMMODATIONS</h3>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                  <p className="font-semibold mb-2">Total: {data.ada.total} people</p>
                  {Object.entries(data.ada.types || {}).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type.replace(/_/g, ' ')}:</span>
                      <span>{count}</span>
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
