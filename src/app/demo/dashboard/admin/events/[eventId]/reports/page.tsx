'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  ArrowLeft,
  Download,
  DollarSign,
  Users,
  FileText,
  Home,
  Stethoscope,
  Shield,
  UserCheck,
  Settings,
} from 'lucide-react'
import ReportViewer, { type ReportId } from '../../../../../lib/ReportViewer'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

const REPORTS: { id: ReportId; title: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'financial', title: 'Financial Report', icon: DollarSign, description: 'Revenue, refunds, payment status' },
  { id: 'registrations', title: 'Registration Report', icon: Users, description: 'Full registration list with contact info' },
  { id: 'forms', title: 'Forms Status Report', icon: FileText, description: 'Waiver completion per participant' },
  { id: 'housing', title: 'Housing Report', icon: Home, description: 'Room assignments and roommate lists' },
  { id: 'medical', title: 'Dietary / Medical', icon: Stethoscope, description: 'Allergies, medications, restrictions' },
  { id: 'certificates', title: 'Safe Environment Certs', icon: Shield, description: 'Chaperone certification status' },
  { id: 'chaperones', title: 'Chaperone Summary', icon: UserCheck, description: 'Ratios and contact by group' },
]

export default function EventReportsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [activeReport, setActiveReport] = useState<ReportId | null>(null)

  if (!eventName) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Reports</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-navy" />
            <h1 className="text-2xl font-bold text-navy">Reports for {eventName}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            View, print, and export event-specific reports
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/demo/dashboard/admin/events/${eventId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <Button
            onClick={() => alert('Demo: Would open the Custom Report Builder wizard.')}
            variant="outline"
            className="border-navy text-navy hover:bg-navy hover:text-white"
          >
            <Settings className="w-4 h-4 mr-1" />
            Custom Builder
          </Button>
          <Button
            onClick={() => alert(`Demo: Would generate one CSV with every report for ${eventName} combined.`)}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            <Download className="w-4 h-4 mr-1" />
            Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <Card key={report.id} className="bg-white border-[#D1D5DB] hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#9C8466]/10 rounded-lg">
                  <report.icon className="h-5 w-5 text-[#9C8466]" />
                </div>
                <CardTitle className="text-base text-navy">{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveReport(report.id)}
                  variant="outline"
                  size="sm"
                  className="border-navy text-navy hover:bg-navy hover:text-white flex-1"
                >
                  View
                </Button>
                <Button
                  onClick={() => alert(`Demo: "${report.title}" would download as CSV.`)}
                  size="sm"
                  className="bg-navy hover:bg-navy/90 text-white"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ReportViewer
        reportId={activeReport}
        eventName={eventName}
        onClose={() => setActiveReport(null)}
      />
    </div>
  )
}
