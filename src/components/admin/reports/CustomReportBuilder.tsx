'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Save, Loader2, Play, Trash2 } from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string | null
  reportType: string
  configuration: any
  isPublic: boolean
  createdBy: {
    firstName: string
    lastName: string
  }
}

interface CustomReportBuilderProps {
  eventId: string
  eventName: string
  organizationId: string
  open: boolean
  onClose: () => void
}

export function CustomReportBuilder({
  eventId,
  eventName,
  organizationId,
  open,
  onClose,
}: CustomReportBuilderProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [reportType, setReportType] = useState<string>('registration')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<any>({})
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  // Available fields for each report type
  const fieldOptions: Record<string, { value: string; label: string }[]> = {
    registration: [
      { value: 'groupName', label: 'Group Name' },
      { value: 'parishName', label: 'Parish Name' },
      { value: 'dioceseName', label: 'Diocese Name' },
      { value: 'groupLeaderName', label: 'Group Leader Name' },
      { value: 'groupLeaderEmail', label: 'Group Leader Email' },
      { value: 'groupLeaderPhone', label: 'Group Leader Phone' },
      { value: 'youthCount', label: 'Youth Count' },
      { value: 'chaperoneCount', label: 'Chaperone Count' },
      { value: 'priestCount', label: 'Priest Count' },
      { value: 'totalParticipants', label: 'Total Participants' },
      { value: 'housingType', label: 'Housing Type' },
      { value: 'registrationStatus', label: 'Registration Status' },
      { value: 'registeredAt', label: 'Registration Date' },
    ],
    tshirts: [
      { value: 'firstName', label: 'First Name' },
      { value: 'lastName', label: 'Last Name' },
      { value: 'tShirtSize', label: 'T-Shirt Size' },
      { value: 'participantType', label: 'Participant Type' },
      { value: 'groupRegistration.groupName', label: 'Group Name' },
      { value: 'groupRegistration.parishName', label: 'Parish Name' },
    ],
    balances: [
      { value: 'groupName', label: 'Group Name' },
      { value: 'parishName', label: 'Parish Name' },
      { value: 'groupLeaderName', label: 'Group Leader Name' },
      { value: 'groupLeaderEmail', label: 'Group Leader Email' },
      { value: 'groupLeaderPhone', label: 'Group Leader Phone' },
      { value: 'participantCount', label: 'Participant Count' },
      { value: 'totalDue', label: 'Total Due' },
      { value: 'amountPaid', label: 'Amount Paid' },
      { value: 'amountRemaining', label: 'Amount Remaining' },
      { value: 'paymentStatus', label: 'Payment Status' },
      { value: 'lastPaymentDate', label: 'Last Payment Date' },
    ],
    medical: [
      { value: 'participant.firstName', label: 'First Name' },
      { value: 'participant.lastName', label: 'Last Name' },
      { value: 'allergies', label: 'Allergies' },
      { value: 'medications', label: 'Medications' },
      { value: 'medicalConditions', label: 'Medical Conditions' },
      { value: 'dietaryRestrictions', label: 'Dietary Restrictions' },
      { value: 'adaAccommodations', label: 'ADA Accommodations' },
      { value: 'participant.groupRegistration.groupName', label: 'Group Name' },
      { value: 'participant.groupRegistration.groupLeaderEmail', label: 'Group Leader Email' },
    ],
  }

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, organizationId])

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/admin/report-templates?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setReportType(template.reportType)
      setSelectedFields(template.configuration.fields || [])
      setFilters(template.configuration.filters || {})
      setTemplateName(template.name)
      setTemplateDescription(template.description || '')
      setIsPublic(template.isPublic)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateName) {
      alert('Please enter a template name')
      return
    }

    setLoading(true)
    try {
      const configuration = {
        fields: selectedFields,
        filters,
        reportType,
      }

      const url = selectedTemplate
        ? `/api/admin/report-templates/${selectedTemplate}`
        : '/api/admin/report-templates'

      const response = await fetch(url, {
        method: selectedTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: templateName,
          description: templateDescription,
          reportType,
          configuration,
          isPublic,
        }),
      })

      if (response.ok) {
        alert('Template saved successfully!')
        loadTemplates()
      } else {
        alert('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error saving template')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return
    if (!confirm('Are you sure you want to delete this template?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/report-templates/${selectedTemplate}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Template deleted successfully!')
        setSelectedTemplate('')
        loadTemplates()
      } else {
        alert('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteReport = async () => {
    setExecuting(true)
    try {
      const url = selectedTemplate
        ? `/api/admin/report-templates/${selectedTemplate}/execute`
        : `/api/admin/events/${eventId}/reports/custom`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          configuration: selectedTemplate ? undefined : {
            fields: selectedFields,
            filters,
            reportType,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        alert('Failed to execute report')
      }
    } catch (error) {
      console.error('Error executing report:', error)
      alert('Error executing report')
    } finally {
      setExecuting(false)
    }
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!reportData) return

    // Convert report data to CSV or PDF
    if (format === 'csv') {
      const csv = convertToCSV(reportData.data)
      downloadCSV(csv, `${templateName || 'custom-report'}.csv`)
    }
  }

  const convertToCSV = (data: any): string => {
    if (!data || !Array.isArray(data) || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const rows = data.map(row =>
      headers.map(header => JSON.stringify(row[header] || '')).join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Report Builder - {eventName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Load Template Section */}
          <div className="space-y-2">
            <Label>Load Saved Template</Label>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.reportType})
                      {template.isPublic && ' 🌐'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteTemplate}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registration">Registration Report</SelectItem>
                <SelectItem value="tshirts">T-Shirt Report</SelectItem>
                <SelectItem value="balances">Balances Report</SelectItem>
                <SelectItem value="medical">Medical/Dietary Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          <div className="space-y-2">
            <Label>Select Fields to Include</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-4 max-h-64 overflow-y-auto">
              {fieldOptions[reportType]?.map(field => (
                <label key={field.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.value)}
                    onChange={() => toggleField(field.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save Template Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Youth Registration Summary"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this report shows..."
                className="w-full p-2 border rounded-md h-20"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Make this template available to other users in my organization</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 border-t pt-4">
            <Button
              onClick={handleSaveTemplate}
              disabled={loading || !templateName}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
            <Button
              onClick={handleExecuteReport}
              disabled={executing || selectedFields.length === 0}
              className="flex-1"
              variant="secondary"
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Report
            </Button>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Report Results</h3>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
              <div className="max-h-96 overflow-auto border rounded-md">
                <pre className="p-4 text-xs">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
