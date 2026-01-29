'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, AlertTriangle, Users, List, Pill, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface MedicalReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

type ViewMode = 'by-student' | 'by-category'

interface ConsolidatedStudent {
  name: string
  age: number | null
  group: string
  groupLeaderEmail?: string
  groupLeaderPhone?: string
  allergies: string[]
  allergyFullText?: string
  allergySeverity?: string
  dietaryRestrictions: string[]
  dietaryFullText?: string
  medicalConditions: string[]
  medicalFullText?: string
  medications: string[]
  medicationsFullText?: string
  adaAccommodations?: string
}

// Show the detected keywords if available, otherwise fall back to the raw text.
// Never display "See notes" — just show the actual data.
function formatItems(items: string[] | undefined, fullText: string | undefined): string {
  const filtered = (items || []).filter(i => i && i !== 'See notes')
  if (filtered.length > 0) return filtered.join(', ')
  if (fullText) return fullText
  return ''
}

export default function MedicalReportModal({ isOpen, onClose, eventId, eventName }: MedicalReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('by-student')
  const [showMedications, setShowMedications] = useState(false)
  const [allergiesOnly, setAllergiesOnly] = useState(false)

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

  const getStudentConsolidated = (): ConsolidatedStudent[] => {
    if (!data) return []
    const studentMap = new Map<string, ConsolidatedStudent>()

    const getOrCreate = (detail: any): ConsolidatedStudent => {
      const key = detail.name
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: detail.name,
          age: detail.age,
          group: detail.group || 'Individual',
          groupLeaderEmail: detail.groupLeaderEmail,
          groupLeaderPhone: detail.groupLeaderPhone,
          allergies: [],
          dietaryRestrictions: [],
          medicalConditions: [],
          medications: [],
        })
      }
      return studentMap.get(key)!
    }

    if (data.foodAllergies?.details) {
      for (const detail of data.foodAllergies.details) {
        const student = getOrCreate(detail)
        student.allergies = detail.allergies || []
        student.allergyFullText = detail.fullText
        student.allergySeverity = detail.severity
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
        if (detail.groupLeaderPhone) student.groupLeaderPhone = detail.groupLeaderPhone
      }
    }

    if (data.dietaryRestrictions?.details) {
      for (const detail of data.dietaryRestrictions.details) {
        const student = getOrCreate(detail)
        student.dietaryRestrictions = detail.restrictions || []
        student.dietaryFullText = detail.fullText
      }
    }

    if (data.medicalConditions?.details) {
      for (const detail of data.medicalConditions.details) {
        const student = getOrCreate(detail)
        student.medicalConditions = detail.conditions || []
        student.medicalFullText = detail.fullText
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
        if (detail.groupLeaderPhone) student.groupLeaderPhone = detail.groupLeaderPhone
      }
    }

    if (data.medications?.details) {
      for (const detail of data.medications.details) {
        const student = getOrCreate(detail)
        student.medications = detail.medications || []
        student.medicationsFullText = detail.fullText
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
        if (detail.groupLeaderPhone) student.groupLeaderPhone = detail.groupLeaderPhone
      }
    }

    if (data.ada?.details) {
      for (const detail of data.ada.details) {
        const student = getOrCreate(detail)
        student.adaAccommodations = detail.accommodations
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
      }
    }

    return Array.from(studentMap.values()).sort((a, b) => {
      if (a.allergySeverity === 'SEVERE' && b.allergySeverity !== 'SEVERE') return -1
      if (a.allergySeverity !== 'SEVERE' && b.allergySeverity === 'SEVERE') return 1
      return a.name.localeCompare(b.name)
    })
  }

  const renderByStudentView = () => {
    let students = getStudentConsolidated()
    if (students.length === 0) {
      return <p className="text-center text-[#6B7280] py-4">No medical data found</p>
    }

    const totalCount = students.length
    if (allergiesOnly) {
      students = students.filter(s => {
        const display = formatItems(s.allergies, s.allergyFullText)
        return display !== ''
      })
    }

    return (
      <div className="space-y-1">
        <p className="text-sm text-[#6B7280] mb-3">
          {allergiesOnly
            ? `${students.length} students with allergies (of ${totalCount} total)`
            : `${students.length} students with dietary/medical information`
          }
        </p>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#1E3A5F] text-white text-xs font-semibold rounded-t">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Group</div>
          <div className="col-span-3">Allergies</div>
          <div className="col-span-2">Dietary</div>
          {showMedications && <div className="col-span-2">Medications</div>}
          {!showMedications && <div className="col-span-2"></div>}
        </div>

        {students.map((student, idx) => {
          const allergyDisplay = formatItems(student.allergies, student.allergyFullText)
          const dietaryDisplay = formatItems(student.dietaryRestrictions, student.dietaryFullText)
          const medsDisplay = formatItems(student.medications, student.medicationsFullText)

          return (
            <div
              key={idx}
              className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm items-start border-b border-gray-100 ${
                student.allergySeverity === 'SEVERE'
                  ? 'bg-red-50'
                  : idx % 2 === 0
                  ? 'bg-white'
                  : 'bg-gray-50'
              }`}
            >
              <div className="col-span-3">
                <span className="font-medium text-[#1E3A5F]">{student.name}</span>
                {student.allergySeverity === 'SEVERE' && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">SEVERE</span>
                )}
              </div>
              <div className="col-span-2 text-[#6B7280] text-xs">{student.group}</div>
              <div className="col-span-3">
                {allergyDisplay ? (
                  <span className={student.allergySeverity === 'SEVERE' ? 'text-red-700 font-medium' : ''}>
                    {allergyDisplay}
                  </span>
                ) : (
                  <span className="text-[#D1D5DB]">--</span>
                )}
              </div>
              <div className="col-span-2">
                {dietaryDisplay ? (
                  <span>{dietaryDisplay}</span>
                ) : (
                  <span className="text-[#D1D5DB]">--</span>
                )}
              </div>
              {showMedications && (
                <div className="col-span-2">
                  {medsDisplay ? (
                    <span>{medsDisplay}</span>
                  ) : (
                    <span className="text-[#D1D5DB]">--</span>
                  )}
                </div>
              )}
              {!showMedications && <div className="col-span-2"></div>}
            </div>
          )
        })}
      </div>
    )
  }

  const renderByCategoryView = () => {
    if (!data) return null

    const renderDetailRow = (detail: any, items: string[], fullText: string, idx: number, color: string) => {
      const display = formatItems(items, fullText)
      return (
        <div
          key={idx}
          className={`flex items-start justify-between px-3 py-2 text-sm border-b border-gray-100 ${
            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium text-[#1E3A5F]">{detail.name}</span>
            {detail.severity === 'SEVERE' && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">SEVERE</span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center">{display}</div>
          <div className="flex-shrink-0 text-xs text-[#6B7280] text-right w-32 truncate">{detail.group}</div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {data.foodAllergies?.details && data.foodAllergies.details.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-red-700">Food Allergies</h3>
              <span className="text-xs text-[#6B7280]">({data.foodAllergies.total})</span>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-red-700 text-white text-xs font-semibold">
                <div>Name</div>
                <div className="text-center">Allergies</div>
                <div className="text-right">Group</div>
              </div>
              {data.foodAllergies.details.map((detail: any, idx: number) =>
                renderDetailRow(detail, detail.allergies, detail.fullText, idx, 'red')
              )}
            </div>
          </div>
        )}

        {data.dietaryRestrictions?.details && data.dietaryRestrictions.details.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-orange-700">Dietary Restrictions</h3>
              <span className="text-xs text-[#6B7280]">({data.dietaryRestrictions.total})</span>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold">
                <div>Name</div>
                <div className="text-center">Restrictions</div>
                <div className="text-right">Group</div>
              </div>
              {data.dietaryRestrictions.details.map((detail: any, idx: number) =>
                renderDetailRow(detail, detail.restrictions, detail.fullText, idx, 'orange')
              )}
            </div>
          </div>
        )}

        {data.medicalConditions?.details && data.medicalConditions.details.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-blue-700">Medical Conditions</h3>
              <span className="text-xs text-[#6B7280]">({data.medicalConditions.total})</span>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold">
                <div>Name</div>
                <div className="text-center">Conditions</div>
                <div className="text-right">Group</div>
              </div>
              {data.medicalConditions.details.map((detail: any, idx: number) =>
                renderDetailRow(detail, detail.conditions, detail.fullText, idx, 'blue')
              )}
            </div>
          </div>
        )}

        {showMedications && data.medications?.details && data.medications.details.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-purple-700">Medications</h3>
              <span className="text-xs text-[#6B7280]">({data.medications.total})</span>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-purple-700 text-white text-xs font-semibold">
                <div>Name</div>
                <div className="text-center">Medications</div>
                <div className="text-right">Group</div>
              </div>
              {data.medications.details.map((detail: any, idx: number) =>
                renderDetailRow(detail, detail.medications, detail.fullText, idx, 'purple')
              )}
            </div>
          </div>
        )}

        {data.ada?.details && data.ada.details.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-indigo-700">ADA Accommodations</h3>
              <span className="text-xs text-[#6B7280]">({data.ada.total})</span>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-indigo-700 text-white text-xs font-semibold">
                <div>Name</div>
                <div className="text-center">Accommodations</div>
                <div className="text-right">Group</div>
              </div>
              {data.ada.details.map((detail: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-start justify-between px-3 py-2 text-sm border-b border-gray-100 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#1E3A5F]">{detail.name}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-center">{detail.accommodations}</div>
                  <div className="flex-shrink-0 text-xs text-[#6B7280] text-right w-32 truncate">{detail.group}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">Dietary & Medical Report - {eventName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-5">
            <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-800">CRITICAL INFORMATION FOR EVENT SAFETY</p>
            </div>

            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-xs text-[#6B7280]">Allergies</p>
                    <p className="text-xl font-bold text-red-600">{data.summary?.foodAllergiesCount ?? data.foodAllergies?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">Dietary</p>
                    <p className="text-xl font-bold text-orange-600">{data.summary?.dietaryRestrictionsCount ?? data.dietaryRestrictions?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">Medical</p>
                    <p className="text-xl font-bold text-blue-600">{data.summary?.medicalConditionsCount ?? data.medicalConditions?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">Medications</p>
                    <p className="text-xl font-bold text-purple-600">{data.summary?.medicationsCount ?? data.medications?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">ADA</p>
                    <p className="text-xl font-bold text-indigo-600">{data.summary?.adaCount ?? data.ada?.total ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls row */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[#6B7280]">View:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('by-student')}
                  className={
                    viewMode === 'by-student'
                      ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] hover:bg-[#2a4d75] hover:text-white'
                      : 'text-[#1E3A5F] border-[#9C8466]'
                  }
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  By Student
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('by-category')}
                  className={
                    viewMode === 'by-category'
                      ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] hover:bg-[#2a4d75] hover:text-white'
                      : 'text-[#1E3A5F] border-[#9C8466]'
                  }
                >
                  <List className="h-3.5 w-3.5 mr-1" />
                  By Category
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllergiesOnly(!allergiesOnly)}
                  className={
                    allergiesOnly
                      ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white'
                      : 'text-red-700 border-red-300 hover:bg-red-50'
                  }
                >
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Allergies Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMedications(!showMedications)}
                  className={
                    showMedications
                      ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:text-white'
                      : 'text-purple-700 border-purple-300 hover:bg-purple-50'
                  }
                >
                  <Pill className="h-3.5 w-3.5 mr-1" />
                  Medications
                  {showMedications ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            </div>

            {viewMode === 'by-student' ? renderByStudentView() : renderByCategoryView()}

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => handleExport('csv')} disabled={exporting !== null} variant="outline" className="flex-1 border-[#9C8466] text-[#1E3A5F]">
                {exporting === 'csv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Export CSV
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
