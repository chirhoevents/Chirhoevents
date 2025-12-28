'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  Loader2,
  Printer,
  Download,
  AlertTriangle,
  Pill,
  AlertCircle,
  Shield,
  ClipboardList,
  Calendar,
  Users,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format } from 'date-fns'

interface RaphaReportsProps {
  eventId: string
  eventName: string
}

interface ReportData {
  title: string
  event: {
    name: string
    organization?: string
    dates?: string
  }
  generatedAt: string
  [key: string]: any
}

export default function RaphaReports({ eventId, eventName }: RaphaReportsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function generateReport(reportType: string) {
    setLoading(reportType)
    try {
      const params = new URLSearchParams({ type: reportType })
      if (reportType === 'incident-summary') {
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
      }

      const response = await fetch(`/api/admin/events/${eventId}/rapha/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
        setShowPreview(true)
      } else {
        toast.error('Failed to generate report')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(null)
    }
  }

  function handlePrint() {
    if (!reportData) return

    // Create a new window with printable content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    // Get the report content HTML
    const reportContent = document.getElementById('report-content')
    if (!reportContent) {
      toast.error('Report content not found')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.title} - ${reportData.event.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 12px;
          }
          h1 { color: #0077BE; margin: 0; font-size: 24px; }
          h2 { font-size: 18px; margin: 16px 0 8px 0; }
          h3 { font-size: 14px; margin: 12px 0 6px 0; }
          h4 { font-size: 13px; margin: 8px 0 4px 0; }
          p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: 600; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .font-medium { font-weight: 500; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 12px; }
          .text-lg { font-size: 16px; }
          .text-xl { font-size: 18px; }
          .text-2xl { font-size: 22px; }
          .text-red-600 { color: #dc2626; }
          .text-red-700 { color: #b91c1c; }
          .text-amber-600 { color: #d97706; }
          .text-amber-700 { color: #b45309; }
          .text-green-600 { color: #16a34a; }
          .text-green-700 { color: #15803d; }
          .text-blue-600 { color: #2563eb; }
          .text-blue-700 { color: #1d4ed8; }
          .text-purple-700 { color: #7c3aed; }
          .text-indigo-700 { color: #4338ca; }
          .text-muted { color: #666; }
          .bg-red-50 { background-color: #fef2f2; }
          .bg-amber-50 { background-color: #fffbeb; }
          .bg-green-50 { background-color: #f0fdf4; }
          .bg-blue-50 { background-color: #eff6ff; }
          .bg-purple-50 { background-color: #faf5ff; }
          .bg-indigo-50 { background-color: #eef2ff; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .border { border: 1px solid #ddd; }
          .border-t { border-top: 1px solid #ddd; }
          .border-b { border-bottom: 1px solid #ddd; }
          .rounded { border-radius: 4px; }
          .rounded-lg { border-radius: 8px; }
          .p-2 { padding: 8px; }
          .p-3 { padding: 12px; }
          .p-4 { padding: 16px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .mt-4 { margin-top: 16px; }
          .mt-8 { margin-top: 32px; }
          .pt-4 { padding-top: 16px; }
          .pb-4 { padding-bottom: 16px; }
          .grid { display: grid; gap: 16px; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .gap-4 { gap: 16px; }
          .space-y-6 > * + * { margin-top: 24px; }
          .inline { display: inline; }
          .mr-1 { margin-right: 4px; }
          .confidential-banner {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            padding: 8px;
            text-align: center;
            font-size: 12px;
            margin-top: 16px;
          }
          .page-break { page-break-before: always; }
          @media print {
            body { padding: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        ${reportContent.innerHTML}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const reports = [
    {
      id: 'daily-summary',
      title: 'Daily Medical Summary',
      description: 'Complete overview of all participants with medical needs, active incidents, and medications. Print this at the start of each day.',
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'allergy-list',
      title: 'Allergy Master List',
      description: 'All participants with allergies, categorized by allergy type. Perfect for kitchen staff and dining hall.',
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'medication-list',
      title: 'Medication Administration List',
      description: 'Participants who take daily medications. Use for tracking medication administration.',
      icon: Pill,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'critical-list',
      title: 'Critical Participants List',
      description: 'One-page quick reference of participants with severe allergies, critical conditions, and ADA needs.',
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      id: 'incident-summary',
      title: 'Incident Summary Report',
      description: 'All medical incidents for the event with statistics and details. Filter by date range.',
      icon: ClipboardList,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      hasDateFilter: true,
    },
    {
      id: 'insurance-list',
      title: 'Insurance Information',
      description: 'Insurance details and emergency contacts for all participants. For emergency use only.',
      icon: Shield,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0077BE]" />
            Medical Reports
          </CardTitle>
          <CardDescription>
            Generate and print medical reports for {eventName}. All reports include HIPAA confidentiality notice.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Report Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="hover:border-[#0077BE] transition-colors">
            <CardContent className="pt-6">
              <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center mb-4`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <h3 className="font-semibold mb-2">{report.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{report.description}</p>

              {report.hasDateFilter && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                variant="outline"
                onClick={() => generateReport(report.id)}
                disabled={loading === report.id}
              >
                {loading === report.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{reportData?.title}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {reportData && (
            <div className="print:p-8" id="report-content">
              {/* Report Header */}
              <div className="border-b pb-4 mb-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-[#0077BE]">{reportData.title}</h1>
                  <p className="text-lg">{reportData.event.name}</p>
                  <p className="text-muted-foreground">{reportData.event.organization}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Generated: {format(new Date(reportData.generatedAt), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded text-center text-sm">
                  <strong>CONFIDENTIAL MEDICAL INFORMATION</strong> - For authorized medical staff only
                </div>
              </div>

              {/* Daily Summary Report */}
              {reportData.summary && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.summary.totalWithMedicalNeeds}
                      </p>
                      <p className="text-sm text-blue-700">With Medical Needs</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {reportData.summary.severeAllergies}
                      </p>
                      <p className="text-sm text-red-700">Severe Allergies</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">
                        {reportData.summary.activeIncidents}
                      </p>
                      <p className="text-sm text-amber-700">Active Incidents</p>
                    </div>
                  </div>

                  {reportData.activeIncidents?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-red-600 mb-2">Active Incidents</h3>
                      <table className="w-full text-sm border">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="p-2 text-left border">Participant</th>
                            <th className="p-2 text-left border">Type</th>
                            <th className="p-2 text-left border">Severity</th>
                            <th className="p-2 text-left border">Status</th>
                            <th className="p-2 text-left border">Next Check</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.activeIncidents.map((i: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-2 border">{i.participantName}</td>
                              <td className="p-2 border">{i.type}</td>
                              <td className="p-2 border">{i.severity}</td>
                              <td className="p-2 border">{i.status}</td>
                              <td className="p-2 border">
                                {i.nextCheck ? format(new Date(i.nextCheck), 'h:mm a') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {reportData.participants?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Participants with Medical Needs</h3>
                      <table className="w-full text-sm border">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left border">Name</th>
                            <th className="p-2 text-left border">Age</th>
                            <th className="p-2 text-left border">Group</th>
                            <th className="p-2 text-left border">Allergies</th>
                            <th className="p-2 text-left border">Conditions</th>
                            <th className="p-2 text-left border">Medications</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.participants.map((p: any, idx: number) => (
                            <tr key={idx} className={p.isSevere ? 'bg-red-50' : ''}>
                              <td className="p-2 border font-medium">
                                {p.isSevere && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-500" />}
                                {p.name}
                              </td>
                              <td className="p-2 border">{p.age || '-'}</td>
                              <td className="p-2 border">{p.group}</td>
                              <td className="p-2 border text-xs">{p.allergies || '-'}</td>
                              <td className="p-2 border text-xs">{p.conditions || '-'}</td>
                              <td className="p-2 border text-xs">{p.medications || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Allergy List Report */}
              {reportData.categories && (
                <div className="space-y-6">
                  <p className="text-center">
                    Total participants with allergies: <strong>{reportData.totalWithAllergies}</strong>
                  </p>
                  {Object.entries(reportData.categories).map(([category, participants]: [string, any]) => {
                    if (!participants || participants.length === 0) return null
                    return (
                      <div key={category}>
                        <h3 className="font-semibold mb-2 text-amber-700">
                          {category} ({participants.length})
                        </h3>
                        <table className="w-full text-sm border">
                          <thead className="bg-amber-50">
                            <tr>
                              <th className="p-2 text-left border">Name</th>
                              <th className="p-2 text-left border">Age</th>
                              <th className="p-2 text-left border">Group</th>
                              <th className="p-2 text-left border">Allergy Details</th>
                              <th className="p-2 text-left border">Severe?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map((p: any, idx: number) => (
                              <tr key={idx} className={p.isSevere ? 'bg-red-50' : ''}>
                                <td className="p-2 border font-medium">{p.name}</td>
                                <td className="p-2 border">{p.age || '-'}</td>
                                <td className="p-2 border">{p.group}</td>
                                <td className="p-2 border text-xs">{p.allergies}</td>
                                <td className="p-2 border">
                                  {p.isSevere ? (
                                    <span className="text-red-600 font-bold">YES - EPIPEN</span>
                                  ) : (
                                    'No'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Medication List Report */}
              {reportData.totalWithMedications !== undefined && (
                <div>
                  <p className="text-center mb-4">
                    Total participants with medications: <strong>{reportData.totalWithMedications}</strong>
                  </p>
                  <table className="w-full text-sm border">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="p-2 text-left border">Name</th>
                        <th className="p-2 text-left border">Age</th>
                        <th className="p-2 text-left border">Group</th>
                        <th className="p-2 text-left border">Medications</th>
                        <th className="p-2 text-left border">Conditions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.participants?.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 border font-medium">{p.name}</td>
                          <td className="p-2 border">{p.age || '-'}</td>
                          <td className="p-2 border">{p.group}</td>
                          <td className="p-2 border text-xs">{p.medications}</td>
                          <td className="p-2 border text-xs">{p.conditions || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Critical List Report */}
              {reportData.totalCritical !== undefined && (
                <div>
                  <div className="bg-red-50 p-4 rounded-lg mb-4 text-center">
                    <p className="text-red-700 font-semibold">
                      {reportData.totalCritical} Critical Participants Requiring Special Attention
                    </p>
                  </div>
                  {reportData.participants?.map((p: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-lg">{p.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Age {p.age} • {p.gender} • {p.group}
                          </p>
                        </div>
                      </div>
                      {p.allergies && (
                        <div className="bg-red-50 p-2 rounded mb-2">
                          <strong className="text-red-700">Allergies:</strong> {p.allergies}
                        </div>
                      )}
                      {p.conditions && (
                        <div className="bg-purple-50 p-2 rounded mb-2">
                          <strong className="text-purple-700">Conditions:</strong> {p.conditions}
                        </div>
                      )}
                      {p.medications && (
                        <div className="bg-blue-50 p-2 rounded mb-2">
                          <strong className="text-blue-700">Medications:</strong> {p.medications}
                        </div>
                      )}
                      {p.ada && (
                        <div className="bg-indigo-50 p-2 rounded mb-2">
                          <strong className="text-indigo-700">ADA:</strong> {p.ada}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <strong>Emergency Contact 1:</strong>
                          <p>{p.emergencyContact1?.name} ({p.emergencyContact1?.relation})</p>
                          <p>{p.emergencyContact1?.phone}</p>
                        </div>
                        {p.emergencyContact2?.name && (
                          <div>
                            <strong>Emergency Contact 2:</strong>
                            <p>{p.emergencyContact2?.name} ({p.emergencyContact2?.relation})</p>
                            <p>{p.emergencyContact2?.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Incident Summary Report */}
              {reportData.stats && reportData.incidents && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xl font-bold">{reportData.stats.total}</p>
                      <p className="text-xs">Total Incidents</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-xl font-bold text-green-600">{reportData.stats.bySeverity.minor}</p>
                      <p className="text-xs text-green-700">Minor</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded">
                      <p className="text-xl font-bold text-amber-600">{reportData.stats.bySeverity.moderate}</p>
                      <p className="text-xs text-amber-700">Moderate</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded">
                      <p className="text-xl font-bold text-red-600">{reportData.stats.bySeverity.severe}</p>
                      <p className="text-xs text-red-700">Severe</p>
                    </div>
                  </div>

                  {(reportData.stats.hospitalizations > 0 || reportData.stats.ambulanceCalls > 0) && (
                    <div className="bg-red-50 p-3 rounded text-center">
                      <p className="text-red-700">
                        Ambulance Calls: <strong>{reportData.stats.ambulanceCalls}</strong> |
                        Hospitalizations: <strong>{reportData.stats.hospitalizations}</strong>
                      </p>
                    </div>
                  )}

                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left border">Date/Time</th>
                        <th className="p-2 text-left border">Participant</th>
                        <th className="p-2 text-left border">Type</th>
                        <th className="p-2 text-left border">Severity</th>
                        <th className="p-2 text-left border">Status</th>
                        <th className="p-2 text-left border">Treatment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.incidents.map((i: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 border">
                            {format(new Date(i.date), 'MM/dd')} {i.time}
                          </td>
                          <td className="p-2 border">{i.participantName}</td>
                          <td className="p-2 border">{i.type}</td>
                          <td className="p-2 border">{i.severity}</td>
                          <td className="p-2 border">{i.status}</td>
                          <td className="p-2 border text-xs">{i.treatment?.substring(0, 50)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Insurance List Report */}
              {reportData.notice === 'CONFIDENTIAL - For emergency use only' && reportData.participants && (
                <div>
                  <div className="bg-gray-100 p-3 rounded mb-4 text-center">
                    <strong>For emergency hospitalization use only</strong>
                  </div>
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left border">Name</th>
                        <th className="p-2 text-left border">Age</th>
                        <th className="p-2 text-left border">Group</th>
                        <th className="p-2 text-left border">Insurance Provider</th>
                        <th className="p-2 text-left border">Policy #</th>
                        <th className="p-2 text-left border">Emergency Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.participants.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 border font-medium">{p.name}</td>
                          <td className="p-2 border">{p.age || '-'}</td>
                          <td className="p-2 border">{p.group}</td>
                          <td className="p-2 border">{p.insurance?.provider}</td>
                          <td className="p-2 border text-xs">{p.insurance?.policyNumber}</td>
                          <td className="p-2 border text-xs">
                            {p.emergencyContact?.name} - {p.emergencyContact?.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
                <p>This report was generated from ChiRho Events - Rapha Medical Platform</p>
                <p>Page ___ of ___</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
