'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Loader2, CheckCircle, XCircle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ChaperoneInfo {
  name: string
  groupName: string
  email: string | null
  phone: string | null
}

interface ReportData {
  eventName: string
  youth: {
    male: number
    female: number
    total: number
  }
  chaperones: {
    male: {
      count: number
      list: ChaperoneInfo[]
    }
    female: {
      count: number
      list: ChaperoneInfo[]
    }
    total: number
  }
  priests: number
  ratios: {
    male: number | null
    female: number | null
    requiredRatio: number
  }
  compliance: {
    maleCompliant: boolean
    femaleCompliant: boolean
    overallCompliant: boolean
    message: string
  }
  filters: {
    groups: Array<{ id: string; name: string }>
    housingTypes: string[]
  }
}

interface ChaperoneReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function ChaperoneReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: ChaperoneReportModalProps) {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [housingFilter, setHousingFilter] = useState<string>('all')

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, eventId, groupFilter, housingFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (groupFilter && groupFilter !== 'all') params.set('groupId', groupFilter)
      if (housingFilter && housingFilter !== 'all') params.set('housingType', housingFilter)

      const response = await fetch(
        `/api/admin/events/${eventId}/reports/chaperones${params.toString() ? `?${params}` : ''}`
      )
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
      const response = await fetch(`/api/admin/events/${eventId}/reports/chaperones/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!response.ok) throw new Error('Failed to export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chaperone_report_${eventName.replace(/\s+/g, '_')}.${format === 'pdf' ? 'html' : format}`
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

  const housingLabels: Record<string, string> = {
    on_campus: 'On Campus',
    off_campus: 'Off Campus',
    day_pass: 'Day Pass',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F] flex items-center gap-2">
            <Users className="h-6 w-6" />
            Chaperone Summary Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 mb-1 block">Filter by Group</label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {data?.filters.groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 mb-1 block">Filter by Housing</label>
            <Select value={housingFilter} onValueChange={setHousingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Housing Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Housing Types</SelectItem>
                {data?.filters.housingTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {housingLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Youth Summary */}
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">YOUTH</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{data.youth.male}</p>
                    <p className="text-sm text-[#6B7280]">Male Youth</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-pink-600">{data.youth.female}</p>
                    <p className="text-sm text-[#6B7280]">Female Youth</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#1E3A5F]">{data.youth.total}</p>
                    <p className="text-sm text-[#6B7280]">Total Youth</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Male Chaperones */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {data.chaperones.male.count}
                </span>
                MALE CHAPERONES
              </h3>
              {data.chaperones.male.list.length > 0 ? (
                <div className="space-y-2">
                  {data.chaperones.male.list.map((chaperone, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                      <div>
                        <span className="font-medium">{chaperone.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({chaperone.groupName})</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {chaperone.email && <span className="mr-4">{chaperone.email}</span>}
                        {chaperone.phone && <span>{chaperone.phone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No male chaperones registered</p>
              )}
            </div>

            {/* Female Chaperones */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-sm">
                  {data.chaperones.female.count}
                </span>
                FEMALE CHAPERONES
              </h3>
              {data.chaperones.female.list.length > 0 ? (
                <div className="space-y-2">
                  {data.chaperones.female.list.map((chaperone, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                      <div>
                        <span className="font-medium">{chaperone.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({chaperone.groupName})</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {chaperone.email && <span className="mr-4">{chaperone.email}</span>}
                        {chaperone.phone && <span>{chaperone.phone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No female chaperones registered</p>
              )}
            </div>

            {/* Ratios */}
            <Card className="border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">RATIOS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800 font-medium">Male Ratio</p>
                    <p className="text-lg">
                      {data.youth.male} youth / {data.chaperones.male.count} chaperones ={' '}
                      <strong>{data.ratios.male ? `${data.ratios.male}:1` : 'N/A'}</strong>
                    </p>
                  </div>
                  <div className="p-4 bg-pink-50 rounded">
                    <p className="text-sm text-pink-800 font-medium">Female Ratio</p>
                    <p className="text-lg">
                      {data.youth.female} youth / {data.chaperones.female.count} chaperones ={' '}
                      <strong>{data.ratios.female ? `${data.ratios.female}:1` : 'N/A'}</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance */}
            <div
              className={`p-4 rounded-lg flex items-center gap-3 ${
                data.compliance.overallCompliant
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {data.compliance.overallCompliant ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    data.compliance.overallCompliant ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {data.compliance.message}
                </p>
                {!data.compliance.maleCompliant && (
                  <p className="text-sm text-red-600">Male ratio exceeds {data.ratios.requiredRatio}:1 limit</p>
                )}
                {!data.compliance.femaleCompliant && (
                  <p className="text-sm text-red-600">Female ratio exceeds {data.ratios.requiredRatio}:1 limit</p>
                )}
              </div>
            </div>

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
                Export CSV
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
                Export PDF
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
