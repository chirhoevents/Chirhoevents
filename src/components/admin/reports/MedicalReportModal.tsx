'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, AlertTriangle, Users, List } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface MedicalReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

type ViewMode = 'by-student' | 'by-category'

export default function MedicalReportModal({ isOpen, onClose, eventId, eventName }: MedicalReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('by-student')

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

  // Build a consolidated by-student view: each student appears once with all their info
  const getStudentConsolidated = () => {
    if (!data) return []
    const studentMap = new Map<string, {
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
    }>()

    const getOrCreate = (detail: any) => {
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

    // Food allergies
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

    // Dietary restrictions
    if (data.dietaryRestrictions?.details) {
      for (const detail of data.dietaryRestrictions.details) {
        const student = getOrCreate(detail)
        student.dietaryRestrictions = detail.restrictions || []
        student.dietaryFullText = detail.fullText
      }
    }

    // Medical conditions
    if (data.medicalConditions?.details) {
      for (const detail of data.medicalConditions.details) {
        const student = getOrCreate(detail)
        student.medicalConditions = detail.conditions || []
        student.medicalFullText = detail.fullText
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
        if (detail.groupLeaderPhone) student.groupLeaderPhone = detail.groupLeaderPhone
      }
    }

    // Medications
    if (data.medications?.details) {
      for (const detail of data.medications.details) {
        const student = getOrCreate(detail)
        student.medications = detail.medications || []
        student.medicationsFullText = detail.fullText
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
        if (detail.groupLeaderPhone) student.groupLeaderPhone = detail.groupLeaderPhone
      }
    }

    // ADA
    if (data.ada?.details) {
      for (const detail of data.ada.details) {
        const student = getOrCreate(detail)
        student.adaAccommodations = detail.accommodations
        if (detail.groupLeaderEmail) student.groupLeaderEmail = detail.groupLeaderEmail
      }
    }

    // Sort: SEVERE first, then alphabetical
    return Array.from(studentMap.values()).sort((a, b) => {
      if (a.allergySeverity === 'SEVERE' && b.allergySeverity !== 'SEVERE') return -1
      if (a.allergySeverity !== 'SEVERE' && b.allergySeverity === 'SEVERE') return 1
      return a.name.localeCompare(b.name)
    })
  }

  const renderByStudentView = () => {
    const students = getStudentConsolidated()
    if (students.length === 0) {
      return <p className="text-center text-[#6B7280] py-4">No medical data found</p>
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-[#6B7280]">{students.length} students with medical/dietary information</p>
        {students.map((student, idx) => (
          <div
            key={idx}
            className={`p-4 rounded border ${
              student.allergySeverity === 'SEVERE'
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-semibold text-[#1E3A5F]">{student.name}</span>
                {student.age && <span className="text-sm text-[#6B7280] ml-2">Age {student.age}</span>}
                {student.allergySeverity === 'SEVERE' && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">SEVERE</span>
                )}
              </div>
              <span className="text-sm text-[#6B7280]">{student.group}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {student.allergies.length > 0 && (
                <div>
                  <span className="font-medium text-red-700">Allergies: </span>
                  <span>{student.allergies.join(', ')}</span>
                  {student.allergyFullText && student.allergyFullText !== student.allergies.join(', ') && (
                    <span className="text-[#6B7280] block text-xs mt-0.5">Notes: {student.allergyFullText}</span>
                  )}
                </div>
              )}
              {student.dietaryRestrictions.length > 0 && (
                <div>
                  <span className="font-medium text-orange-700">Dietary: </span>
                  <span>{student.dietaryRestrictions.join(', ')}</span>
                  {student.dietaryFullText && student.dietaryFullText !== student.dietaryRestrictions.join(', ') && (
                    <span className="text-[#6B7280] block text-xs mt-0.5">Notes: {student.dietaryFullText}</span>
                  )}
                </div>
              )}
              {student.medicalConditions.length > 0 && (
                <div>
                  <span className="font-medium text-blue-700">Medical: </span>
                  <span>{student.medicalConditions.join(', ')}</span>
                  {student.medicalFullText && student.medicalFullText !== student.medicalConditions.join(', ') && (
                    <span className="text-[#6B7280] block text-xs mt-0.5">Notes: {student.medicalFullText}</span>
                  )}
                </div>
              )}
              {student.medications.length > 0 && (
                <div>
                  <span className="font-medium text-purple-700">Medications: </span>
                  <span>{student.medications.join(', ')}</span>
                </div>
              )}
              {student.adaAccommodations && (
                <div>
                  <span className="font-medium text-indigo-700">ADA: </span>
                  <span>{student.adaAccommodations}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderByCategoryView = () => {
    if (!data) return null

    return (
      <div className="space-y-6">
        {/* Food Allergies */}
        {data.foodAllergies?.details && data.foodAllergies.details.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#1E3A5F] mb-3">FOOD ALLERGIES ({data.foodAllergies.total})</h3>
            <div className="space-y-2">
              {data.foodAllergies.details.map((detail: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded border ${
                    detail.severity === 'SEVERE' ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{detail.name}</span>
                      {detail.age && <span className="text-sm text-[#6B7280] ml-2">Age {detail.age}</span>}
                      {detail.severity === 'SEVERE' && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">SEVERE</span>
                      )}
                    </div>
                    <span className="text-sm text-[#6B7280]">{detail.group}</span>
                  </div>
                  <p className="text-sm mt-1">{detail.allergies.join(', ')}</p>
                  {detail.fullText && <p className="text-xs text-[#6B7280] mt-0.5">Notes: {detail.fullText}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dietary Restrictions */}
        {data.dietaryRestrictions?.details && data.dietaryRestrictions.details.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#1E3A5F] mb-3">DIETARY RESTRICTIONS ({data.dietaryRestrictions.total})</h3>
            <div className="space-y-2">
              {data.dietaryRestrictions.details.map((detail: any, idx: number) => (
                <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{detail.name}</span>
                    <span className="text-sm text-[#6B7280]">{detail.group}</span>
                  </div>
                  <p className="text-sm mt-1">{detail.restrictions.join(', ')}</p>
                  {detail.fullText && <p className="text-xs text-[#6B7280] mt-0.5">Notes: {detail.fullText}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {data.medicalConditions?.details && data.medicalConditions.details.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#1E3A5F] mb-3">MEDICAL CONDITIONS ({data.medicalConditions.total})</h3>
            <div className="space-y-2">
              {data.medicalConditions.details.map((detail: any, idx: number) => (
                <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{detail.name}</span>
                    <span className="text-sm text-[#6B7280]">{detail.group}</span>
                  </div>
                  <p className="text-sm mt-1">{detail.conditions.join(', ')}</p>
                  {detail.fullText && <p className="text-xs text-[#6B7280] mt-0.5">Notes: {detail.fullText}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {data.medications?.details && data.medications.details.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#1E3A5F] mb-3">MEDICATIONS ({data.medications.total})</h3>
            <div className="space-y-2">
              {data.medications.details.map((detail: any, idx: number) => (
                <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{detail.name}</span>
                    <span className="text-sm text-[#6B7280]">{detail.group}</span>
                  </div>
                  <p className="text-sm mt-1">{detail.medications.join(', ')}</p>
                  {detail.fullText && <p className="text-xs text-[#6B7280] mt-0.5">Notes: {detail.fullText}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADA */}
        {data.ada?.details && data.ada.details.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#1E3A5F] mb-3">ADA ACCOMMODATIONS ({data.ada.total})</h3>
            <div className="space-y-2">
              {data.ada.details.map((detail: any, idx: number) => (
                <div key={idx} className="p-3 bg-indigo-50 border border-indigo-200 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{detail.name}</span>
                    <span className="text-sm text-[#6B7280]">{detail.group}</span>
                  </div>
                  <p className="text-sm mt-1">{detail.accommodations}</p>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">Dietary & Medical Report - {eventName}</DialogTitle>
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
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Allergies</p>
                    <p className="text-2xl font-bold text-red-600">{data.summary?.foodAllergiesCount ?? data.foodAllergies?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Dietary</p>
                    <p className="text-2xl font-bold text-orange-600">{data.summary?.dietaryRestrictionsCount ?? data.dietaryRestrictions?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Medical</p>
                    <p className="text-2xl font-bold text-blue-600">{data.summary?.medicalConditionsCount ?? data.medicalConditions?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Medications</p>
                    <p className="text-2xl font-bold text-purple-600">{data.summary?.medicationsCount ?? data.medications?.total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">ADA</p>
                    <p className="text-2xl font-bold text-indigo-600">{data.summary?.adaCount ?? data.ada?.total ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View mode toggle */}
            <div className="flex items-center gap-2 border-b pb-3">
              <span className="text-sm font-medium text-[#6B7280]">View:</span>
              <Button
                variant={viewMode === 'by-student' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('by-student')}
                className={viewMode === 'by-student' ? 'bg-[#1E3A5F]' : ''}
              >
                <Users className="h-4 w-4 mr-1" />
                By Student
              </Button>
              <Button
                variant={viewMode === 'by-category' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('by-category')}
                className={viewMode === 'by-category' ? 'bg-[#1E3A5F]' : ''}
              >
                <List className="h-4 w-4 mr-1" />
                By Category
              </Button>
            </div>

            {viewMode === 'by-student' ? renderByStudentView() : renderByCategoryView()}

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
