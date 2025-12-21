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
      window.print()
    }
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
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-results,
          #report-results * {
            visibility: visible;
          }
          #report-results {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full">
          <DialogHeader className="print:hidden">
            <DialogTitle>Custom Report Builder - {eventName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 print:space-y-0">
          {/* Load Template Section */}
          <div className="space-y-2 print:hidden">
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
          <div className="space-y-2 print:hidden">
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
          <div className="space-y-2 print:hidden">
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
          <div className="space-y-4 border-t pt-4 print:hidden">
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
          <div className="flex gap-2 border-t pt-4 print:hidden">
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
            <div className="space-y-4 border-t pt-4 print:border-0 print:pt-0" id="report-results">
              <div className="flex items-center justify-between print:mb-6 print:block">
                <div>
                  <h3 className="font-semibold text-lg print:text-2xl">{templateName || reportType} Report</h3>
                  <p className="text-sm text-gray-600 print:text-base">
                    {eventName}
                  </p>
                  <p className="text-sm text-gray-600 print:text-sm">
                    Generated on {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 print:hidden">
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
                  <div className="bg-blue-50 p-4 rounded-lg print:bg-white print:border">
                    <h4 className="font-semibold mb-2">T-Shirt Size Summary</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(reportData.data.sizeCounts || {})
                        .sort(([a], [b]) => {
                          const order = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'A2XL', 'A3XL', 'A4XL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
                          return order.indexOf(a) - order.indexOf(b)
                        })
                        .map(([size, count]: [string, any]) => (
                          <div key={size} className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{Number(count)}</div>
                            <div className="text-sm text-gray-600">{size}</div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-lg font-semibold">
                        Total: {reportData.data.totalCount || 0} shirts
                      </div>
                    </div>
                  </div>

                  {/* Participant Details */}
                  <div className="overflow-auto">
                    <table className="min-w-full border-collapse border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left">First Name</th>
                          <th className="border p-2 text-left">Last Name</th>
                          <th className="border p-2 text-left">T-Shirt Size</th>
                          <th className="border p-2 text-left">Type</th>
                          <th className="border p-2 text-left">Group</th>
                          <th className="border p-2 text-left">Parish</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.data.participants?.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border p-2">{p.firstName}</td>
                            <td className="border p-2">{p.lastName}</td>
                            <td className="border p-2 font-semibold">{p.tShirtSize}</td>
                            <td className="border p-2 text-sm">
                              {p.participantType?.replace(/_/g, ' ')}
                            </td>
                            <td className="border p-2">{p.groupRegistration?.groupName}</td>
                            <td className="border p-2">{p.groupRegistration?.parishName}</td>
                          </tr>
                        ))}
                        {reportData.data.individualRegs?.map((p: any, i: number) => (
                          <tr key={`ind-${i}`} className="hover:bg-gray-50">
                            <td className="border p-2">{p.firstName}</td>
                            <td className="border p-2">{p.lastName}</td>
                            <td className="border p-2 font-semibold">{p.tShirtSize}</td>
                            <td className="border p-2 text-sm">Individual</td>
                            <td className="border p-2">-</td>
                            <td className="border p-2">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Balances Report */}
              {reportType === 'balances' && (
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Group Name</th>
                        <th className="border p-2 text-left">Parish</th>
                        <th className="border p-2 text-left">Contact</th>
                        <th className="border p-2 text-left">Phone</th>
                        <th className="border p-2 text-right">Total Due</th>
                        <th className="border p-2 text-right">Amount Paid</th>
                        <th className="border p-2 text-right">Remaining</th>
                        <th className="border p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border p-2">{row.groupName}</td>
                          <td className="border p-2">{row.parishName}</td>
                          <td className="border p-2">{row.groupLeaderName || row.groupLeaderEmail}</td>
                          <td className="border p-2">{row.groupLeaderPhone}</td>
                          <td className="border p-2 text-right">${Number(row.totalDue || 0).toFixed(2)}</td>
                          <td className="border p-2 text-right">${Number(row.amountPaid || 0).toFixed(2)}</td>
                          <td className="border p-2 text-right font-semibold">
                            ${Number(row.amountRemaining || 0).toFixed(2)}
                          </td>
                          <td className="border p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              row.paymentStatus === 'paid_full' ? 'bg-green-100 text-green-800' :
                              row.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
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
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse border">
                    <thead>
                      <tr className="bg-gray-100">
                        {selectedFields.map(field => (
                          <th key={field} className="border p-2 text-left">
                            {fieldOptions.registration?.find(f => f.value === field)?.label || field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {selectedFields.map(field => (
                            <td key={field} className="border p-2">
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
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Name</th>
                        <th className="border p-2 text-left">Group</th>
                        <th className="border p-2 text-left">Allergies</th>
                        <th className="border p-2 text-left">Medications</th>
                        <th className="border p-2 text-left">Medical Conditions</th>
                        <th className="border p-2 text-left">Dietary Restrictions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border p-2">
                            {row.participant?.firstName} {row.participant?.lastName}
                          </td>
                          <td className="border p-2">{row.participant?.groupRegistration?.groupName}</td>
                          <td className="border p-2">{row.allergies || '-'}</td>
                          <td className="border p-2">{row.medications || '-'}</td>
                          <td className="border p-2">{row.medicalConditions || '-'}</td>
                          <td className="border p-2">{row.dietaryRestrictions || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Generic table for other types */}
              {!['tshirts', 'balances', 'registration', 'medical'].includes(reportType) && Array.isArray(reportData.data) && (
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse border">
                    <thead>
                      <tr className="bg-gray-100">
                        {Object.keys(reportData.data[0] || {}).map(key => (
                          <th key={key} className="border p-2 text-left">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((value: any, j: number) => (
                            <td key={j} className="border p-2">
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
    </>
  )
}
