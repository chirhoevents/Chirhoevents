'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Users,
  FileText,
  Home,
  Heart,
  Shield,
  Eye,
  Download,
  Loader2,
} from 'lucide-react'

interface ReportCardProps {
  title: string
  reportType: 'financial' | 'registrations' | 'forms' | 'housing' | 'medical' | 'certificates'
  eventId: string
  onViewReport: () => void
}

interface ReportStats {
  stat1: { label: string; value: string | number }
  stat2: { label: string; value: string | number }
  stat3?: { label: string; value: string | number }
}

const ICONS = {
  financial: DollarSign,
  registrations: Users,
  forms: FileText,
  housing: Home,
  medical: Heart,
  certificates: Shield,
}

export default function ReportCard({
  title,
  reportType,
  eventId,
  onViewReport,
}: ReportCardProps) {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  const Icon = ICONS[reportType]

  useEffect(() => {
    fetchStats()
  }, [eventId, reportType])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/events/${eventId}/reports/${reportType}?preview=true`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(formatStats(data, reportType))
    } catch (error) {
      console.error('Error fetching report stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatStats = (data: any, type: string): ReportStats => {
    switch (type) {
      case 'financial':
        return {
          stat1: { label: 'Total Revenue', value: `$${data.totalRevenue?.toLocaleString() || '0'}` },
          stat2: { label: 'Amount Paid', value: `$${data.amountPaid?.toLocaleString() || '0'}` },
          stat3: { label: 'Balance Due', value: `$${data.balanceDue?.toLocaleString() || '0'}` },
        }
      case 'registrations':
        return {
          stat1: { label: 'Total Registrations', value: data.totalRegistrations || 0 },
          stat2: { label: 'Group Registrations', value: `${data.groupCount || 0} (${data.groupParticipants || 0} people)` },
          stat3: { label: 'Individual Registrations', value: data.individualCount || 0 },
        }
      case 'forms':
        return {
          stat1: { label: 'Forms Required', value: data.formsRequired || 0 },
          stat2: { label: 'Completed', value: `${data.formsCompleted || 0} (${data.completionRate || 0}%)` },
          stat3: { label: 'Pending', value: data.formsPending || 0 },
        }
      case 'housing':
        return {
          stat1: { label: 'On-Campus', value: `${data.onCampus || 0} people` },
          stat2: { label: 'Off-Campus', value: `${data.offCampus || 0} people` },
          stat3: { label: 'Day Pass', value: `${data.dayPass || 0} people` },
        }
      case 'medical':
        return {
          stat1: { label: 'Allergies', value: `${data.allergies || 0} people` },
          stat2: { label: 'Dietary Restrictions', value: `${data.dietary || 0} people` },
          stat3: { label: 'Medical Conditions', value: `${data.medical || 0} people` },
        }
      case 'certificates':
        return {
          stat1: { label: 'Certificates Required', value: data.required || 0 },
          stat2: { label: 'Uploaded', value: `${data.uploaded || 0} (${data.uploadRate || 0}%)` },
          stat3: { label: 'Verified', value: `${data.verified || 0} (${data.verifyRate || 0}%)` },
        }
      default:
        return {
          stat1: { label: 'Loading', value: '-' },
          stat2: { label: 'Loading', value: '-' },
        }
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/reports/${reportType}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}_report.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Card className="bg-white border-[#D1D5DB] hover:border-[#9C8466] transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#9C8466]" />
            <CardTitle className="text-lg text-[#1E3A5F]">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#9C8466]" />
          </div>
        ) : stats ? (
          <>
            {/* Preview Stats */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">{stats.stat1.label}:</span>
                <span className="text-sm font-semibold text-[#1E3A5F]">
                  {stats.stat1.value}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">{stats.stat2.label}:</span>
                <span className="text-sm font-semibold text-[#1E3A5F]">
                  {stats.stat2.value}
                </span>
              </div>
              {stats.stat3 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">{stats.stat3.label}:</span>
                  <span className="text-sm font-semibold text-[#1E3A5F]">
                    {stats.stat3.value}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={onViewReport}
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Report
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={exporting !== null}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  {exporting === 'csv' ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  CSV
                </Button>
                <Button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting !== null}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  {exporting === 'pdf' ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  PDF
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-sm text-[#6B7280]">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
