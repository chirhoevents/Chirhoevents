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

  // Clear report data when report type changes
  useEffect(() => {
    setReportData(null)
  }, [reportType])

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/admin/report-templates?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to load templates')
        setTemplates([])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
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
      setReportData(null) // Clear previous report data
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
        const savedTemplate = await response.json()
        alert('Template saved successfully!')
        await loadTemplates()
        if (savedTemplate && savedTemplate.id) {
          setSelectedTemplate(savedTemplate.id)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to save template: ${errorData.error || 'Unknown error'}`)
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

    if (format === 'csv') {
      const csv = convertToCSV(reportData)
      downloadCSV(csv, `${templateName || reportType || 'custom-report'}.csv`)
    } else if (format === 'pdf') {
      // Open report in new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to print reports')
        return
      }

      const reportHtml = generatePrintHTML()
      printWindow.document.write(reportHtml)
      printWindow.document.close()

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    }
  }

  const generatePrintHTML = (): string => {
    const reportTitle = templateName || reportType.charAt(0).toUpperCase() + reportType.slice(1)

    let tableHTML = ''

    if (reportType === 'tshirts' && reportData) {
      // Size Summary
      const sizeCounts = reportData.data.sizeCounts || {}
      const sizeEntries = Object.entries(sizeCounts).sort(([a], [b]) => {
        const order = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'A2XL', 'A3XL', 'A4XL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
        return order.indexOf(a) - order.indexOf(b)
      })

      const sizeBoxes = sizeEntries.map(([size, count]) =>
        `<div style="border: 1px solid #ccc; padding: 8px; text-align: center; min-width: 60px;">
          <div style="font-size: 18px; font-weight: bold;">${count}</div>
          <div style="font-size: 12px; color: #666;">${size}</div>
        </div>`
      ).join('')

      tableHTML = `
        <div style="border: 1px solid #ccc; padding: 16px; margin-bottom: 20px;">
          <h4 style="margin-top: 0; margin-bottom: 12px;">T-Shirt Size Summary</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            ${sizeBoxes}
          </div>
          <div style="border-top: 1px solid #ccc; padding-top: 12px; margin-top: 12px;">
            <strong>Total: ${reportData.data.totalCount || 0} shirts</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>T-Shirt Size</th>
              <th>Type</th>
              <th>Group</th>
              <th>Parish</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.data.participants || []).map((p: any) => `
              <tr>
                <td>${p.firstName}</td>
                <td>${p.lastName}</td>
                <td><strong>${p.tShirtSize}</strong></td>
                <td>${p.participantType?.replace(/_/g, ' ') || ''}</td>
                <td>${p.groupRegistration?.groupName || ''}</td>
                <td>${p.groupRegistration?.parishName || ''}</td>
              </tr>
            `).join('')}
            ${(reportData.data.individualRegs || []).map((p: any) => `
              <tr>
                <td>${p.firstName}</td>
                <td>${p.lastName}</td>
                <td><strong>${p.tShirtSize}</strong></td>
                <td>Individual</td>
                <td>-</td>
                <td>-</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    } else if (reportType === 'balances' && reportData) {
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Parish</th>
              <th>Contact</th>
              <th>Phone</th>
              <th style="text-align: right;">Total Due</th>
              <th style="text-align: right;">Amount Paid</th>
              <th style="text-align: right;">Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.data || []).map((row: any) => `
              <tr>
                <td>${row.groupName || ''}</td>
                <td>${row.parishName || ''}</td>
                <td>${row.groupLeaderName || row.groupLeaderEmail || ''}</td>
                <td>${row.groupLeaderPhone || ''}</td>
                <td style="text-align: right;">$${Number(row.totalDue || 0).toFixed(2)}</td>
                <td style="text-align: right;">$${Number(row.amountPaid || 0).toFixed(2)}</td>
                <td style="text-align: right;"><strong>$${Number(row.amountRemaining || 0).toFixed(2)}</strong></td>
                <td>${row.paymentStatus?.replace(/_/g, ' ') || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    } else if (reportType === 'medical' && reportData) {
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Allergies</th>
              <th>Medications</th>
              <th>Medical Conditions</th>
              <th>Dietary Restrictions</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.data || []).map((row: any) => `
              <tr>
                <td>${row.participant?.firstName || ''} ${row.participant?.lastName || ''}</td>
                <td>${row.participant?.groupRegistration?.groupName || ''}</td>
                <td>${row.allergies || '-'}</td>
                <td>${row.medications || '-'}</td>
                <td>${row.medicalConditions || '-'}</td>
                <td>${row.dietaryRestrictions || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    } else if (reportData && Array.isArray(reportData.data)) {
      const headers = Object.keys(reportData.data[0] || {})
      tableHTML = `
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${reportData.data.map((row: any) => `
              <tr>
                ${headers.map(h => `<td>${typeof row[h] === 'object' ? JSON.stringify(row[h]) : (row[h] || '')}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} Report - ${eventName}</title>
        <style>
          @page {
            size: landscape;
            margin: 0.5in;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }

          h1 {
            font-size: 24px;
            margin-bottom: 8px;
          }

          .subtitle {
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }

          th, td {
            border: 1px solid #333;
            padding: 6px 8px;
            text-align: left;
          }

          th {
            background-color: #e5e7eb;
            font-weight: bold;
          }

          tbody tr:nth-child(even) {
            background-color: #f9fafb;
          }
        </style>
      </head>
      <body>
        <h1>${reportTitle} Report</h1>
        <div class="subtitle">${eventName} • Generated ${new Date(reportData?.generatedAt || new Date()).toLocaleString()}</div>
        ${tableHTML}
      </body>
      </html>
    `
  }

  const convertToCSV = (data: any): string => {
    const reportType = data.reportType
    let csvData: any[] = []

    // Handle different report types
    if (reportType === 'tshirts') {
      csvData = data.data.participants || []
      // Add individual registrations if they exist
      if (data.data.individualRegs && data.data.individualRegs.length > 0) {
        csvData = [...csvData, ...data.data.individualRegs]
      }
    } else if (reportType === 'balances') {
      csvData = data.data
    } else if (reportType === 'registration') {
      csvData = data.data
    } else if (reportType === 'medical') {
      csvData = data.data
    } else if (Array.isArray(data.data)) {
      csvData = data.data
    } else if (data.data.participants) {
      csvData = data.data.participants
    } else {
      csvData = [data.data]
    }

    if (!csvData || csvData.length === 0) return 'No data available'

    // Flatten nested objects for CSV
    const flattenedData = csvData.map(item => flattenObject(item))

    const headers = Object.keys(flattenedData[0])
    const rows = flattenedData.map(row =>
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  const flattenObject = (obj: any, prefix = ''): any => {
    let flattened: any = {}

    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        flattened[prefix + key] = ''
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        Object.assign(flattened, flattenObject(obj[key], prefix + key + '.'))
      } else {
        flattened[prefix + key] = obj[key]
      }
    }

    return flattened
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
              disabled={executing || (reportType === 'registration' && selectedFields.length === 0)}
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
          {reportData && reportData.reportType === reportType && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {templateName || reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                  </h3>
                  <p className="text-sm text-gray-600">
                    {eventName} • Generated {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    Print/PDF
                  </Button>
                  <Button size="sm" onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* T-Shirt Report */}
              {reportType === 'tshirts' && (
                <div className="space-y-4">
                  {/* Size Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 print:bg-white print:border print:border-gray-300 print:p-3 print:mb-4">
                    <h4 className="font-semibold mb-3 print:text-base">T-Shirt Size Summary</h4>
                    <div className="grid grid-cols-4 gap-4 print:grid-cols-6 print:gap-2">
                      {Object.entries(reportData.data.sizeCounts || {})
                        .sort(([a], [b]) => {
                          const order = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'A2XL', 'A3XL', 'A4XL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
                          return order.indexOf(a) - order.indexOf(b)
                        })
                        .map(([size, count]: [string, any]) => (
                          <div key={size} className="text-center print:border print:border-gray-300 print:p-1">
                            <div className="text-2xl font-bold text-blue-600 print:text-lg print:text-black">{Number(count)}</div>
                            <div className="text-sm text-gray-600 print:text-xs">{size}</div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t print:mt-2 print:pt-2">
                      <div className="text-lg font-semibold print:text-base">
                        Total: {reportData.data.totalCount || 0} shirts
                      </div>
                    </div>
                  </div>

                  {/* Participant Details */}
                  <div className="overflow-auto print:overflow-visible">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100 print:bg-gray-200">
                          <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">First Name</th>
                          <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Last Name</th>
                          <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">T-Shirt Size</th>
                          <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Type</th>
                          <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Group</th>
                          <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Parish</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.data.participants?.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50 print:hover:bg-transparent">
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{p.firstName}</td>
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{p.lastName}</td>
                            <td className="border border-gray-300 p-2 font-semibold print:p-1 print:text-xs">{p.tShirtSize}</td>
                            <td className="border border-gray-300 p-2 text-sm print:p-1 print:text-xs">
                              {p.participantType?.replace(/_/g, ' ')}
                            </td>
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{p.groupRegistration?.groupName}</td>
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{p.groupRegistration?.parishName}</td>
                          </tr>
                        ))}
                        {reportData.data.individualRegs?.map((p: any, i: number) => (
                          <tr key={`ind-${i}`} className="hover:bg-gray-50 print:hover:bg-transparent">
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{p.firstName}</td>
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{p.lastName}</td>
                            <td className="border border-gray-300 p-2 font-semibold print:p-1 print:text-xs">{p.tShirtSize}</td>
                            <td className="border border-gray-300 p-2 text-sm print:p-1 print:text-xs">Individual</td>
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">-</td>
                            <td className="border border-gray-300 p-2 print:p-1 print:text-xs">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Balances Report */}
              {reportType === 'balances' && (
                <div className="overflow-auto print:overflow-visible">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200">
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Group Name</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Parish</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Contact</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Phone</th>
                        <th className="border border-gray-300 p-2 text-right print:p-1 print:text-xs">Total Due</th>
                        <th className="border border-gray-300 p-2 text-right print:p-1 print:text-xs">Amount Paid</th>
                        <th className="border border-gray-300 p-2 text-right print:p-1 print:text-xs">Remaining</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 print:hover:bg-transparent">
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.groupName}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.parishName}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.groupLeaderName || row.groupLeaderEmail}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.groupLeaderPhone}</td>
                          <td className="border border-gray-300 p-2 text-right print:p-1 print:text-xs">${Number(row.totalDue || 0).toFixed(2)}</td>
                          <td className="border border-gray-300 p-2 text-right print:p-1 print:text-xs">${Number(row.amountPaid || 0).toFixed(2)}</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold print:p-1 print:text-xs">
                            ${Number(row.amountRemaining || 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">
                            <span className={`px-2 py-1 rounded text-xs print:px-1 print:py-0 ${
                              row.paymentStatus === 'paid_full' ? 'bg-green-100 text-green-800 print:bg-transparent print:text-black' :
                              row.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800 print:bg-transparent print:text-black' :
                              'bg-red-100 text-red-800 print:bg-transparent print:text-black'
                            }`}>
                              {row.paymentStatus?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Registration Report */}
              {reportType === 'registration' && (
                <div className="overflow-auto print:overflow-visible">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200">
                        {selectedFields.map(field => (
                          <th key={field} className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">
                            {fieldOptions.registration?.find(f => f.value === field)?.label || field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 print:hover:bg-transparent">
                          {selectedFields.map(field => (
                            <td key={field} className="border border-gray-300 p-2 print:p-1 print:text-xs">
                              {typeof row[field] === 'object' ? JSON.stringify(row[field]) : row[field]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Medical Report */}
              {reportType === 'medical' && (
                <div className="overflow-auto print:overflow-visible">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200">
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Name</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Group</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Allergies</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Medications</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Medical Conditions</th>
                        <th className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">Dietary Restrictions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 print:hover:bg-transparent">
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">
                            {row.participant?.firstName} {row.participant?.lastName}
                          </td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.participant?.groupRegistration?.groupName}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.allergies || '-'}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.medications || '-'}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.medicalConditions || '-'}</td>
                          <td className="border border-gray-300 p-2 print:p-1 print:text-xs">{row.dietaryRestrictions || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Generic table for other types */}
              {!['tshirts', 'balances', 'registration', 'medical'].includes(reportType) && Array.isArray(reportData.data) && (
                <div className="overflow-auto print:overflow-visible">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200">
                        {Object.keys(reportData.data[0] || {}).map(key => (
                          <th key={key} className="border border-gray-300 p-2 text-left print:p-1 print:text-xs">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 print:hover:bg-transparent">
                          {Object.values(row).map((value: any, j: number) => (
                            <td key={j} className="border border-gray-300 p-2 print:p-1 print:text-xs">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
