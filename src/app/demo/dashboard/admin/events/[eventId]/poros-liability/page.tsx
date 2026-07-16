'use client'

import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Shield,
  ArrowLeft,
  CheckCircle,
  Clock,
  Users,
  User,
  ScrollText,
  Settings,
  ClipboardList,
} from 'lucide-react'

const DEMO_EVENTS: Record<string, { name: string; stats: Stats }> = {
  'evt-summer-retreat': {
    name: 'Summer Youth Retreat 2026',
    stats: {
      totalForms: 247,
      approvedForms: 189,
      pendingForms: 58,
      totalCertificates: 24,
      verifiedCertificates: 21,
      pendingCertificates: 3,
      lettersTotal: 8,
      lettersVerified: 6,
      lettersPending: 2,
    },
  },
  'evt-diocesan-conference': {
    name: 'Diocesan Youth Conference',
    stats: {
      totalForms: 89, approvedForms: 42, pendingForms: 47,
      totalCertificates: 12, verifiedCertificates: 8, pendingCertificates: 4,
      lettersTotal: 0, lettersVerified: 0, lettersPending: 0,
    },
  },
  'evt-mens-retreat': {
    name: "Men's Silent Retreat",
    stats: {
      totalForms: 42, approvedForms: 40, pendingForms: 2,
      totalCertificates: 0, verifiedCertificates: 0, pendingCertificates: 0,
      lettersTotal: 0, lettersVerified: 0, lettersPending: 0,
    },
  },
}

interface Stats {
  totalForms: number
  approvedForms: number
  pendingForms: number
  totalCertificates: number
  verifiedCertificates: number
  pendingCertificates: number
  lettersTotal: number
  lettersVerified: number
  lettersPending: number
}

export default function PorosLiabilityPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const data = DEMO_EVENTS[eventId]

  if (!data) notFound()
  const { name: eventName, stats } = data

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Liability Platform</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-purple-600" />
            <h1 className="text-3xl font-bold text-navy">Poros Liability Platform</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage waivers, chaperone certifications, and clergy letters for {eventName}
          </p>
        </div>
        <Link href={`/demo/dashboard/admin/events/${eventId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={FileText} label="Total forms" value={stats.totalForms} color="text-blue-600" />
        <Stat icon={CheckCircle} label="Approved" value={stats.approvedForms} color="text-emerald-700" />
        <Stat icon={Clock} label="Pending" value={stats.pendingForms} color="text-amber-700" />
        <Stat icon={Shield} label="Chaperone certs" value={`${stats.verifiedCertificates}/${stats.totalCertificates}`} color="text-purple-700" />
      </div>

      <Tabs defaultValue="liability" className="space-y-4">
        <TabsList>
          <TabsTrigger value="liability" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Group Liability Forms
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Individual Forms
          </TabsTrigger>
          <TabsTrigger value="safe-env" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Safe Environment
          </TabsTrigger>
          <TabsTrigger value="letters" className="flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            Letters of Good Standing
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liability">
          <TabCard
            title="Group Liability Forms"
            body="Per-participant waivers organized by group. Approve, reject, or request re-signature. Bulk-send reminders to any group with pending waivers."
            metric={`${stats.approvedForms} approved, ${stats.pendingForms} pending across ${stats.totalForms} forms`}
          />
        </TabsContent>

        <TabsContent value="individual">
          <TabCard
            title="Individual Registration Forms"
            body="Waivers for participants who registered individually (not through a group). Same review workflow, filtered to individual regs."
            metric="12 individual waivers, all complete"
          />
        </TabsContent>

        <TabsContent value="safe-env">
          <TabCard
            title="Safe Environment Certificates"
            body="Every chaperone must upload a valid Safe Environment certification. Admin verifies the certificate is authentic and current."
            metric={`${stats.verifiedCertificates} of ${stats.totalCertificates} verified, ${stats.pendingCertificates} awaiting review`}
          />
        </TabsContent>

        <TabsContent value="letters">
          <TabCard
            title="Letters of Good Standing (Clergy)"
            body="Clergy attending require a letter from their bishop confirming good standing in their diocese. Track receipt and verification."
            metric={
              stats.lettersTotal > 0
                ? `${stats.lettersVerified} of ${stats.lettersTotal} letters verified`
                : 'No clergy attending this event'
            }
          />
        </TabsContent>

        <TabsContent value="templates">
          <TabCard
            title="Waiver Templates"
            body="Manage the actual PDF templates for each waiver type: Youth-under-18, Adult, Chaperone, Clergy. Upload a new template, set which one applies to which registrant role."
            metric="4 templates active"
          />
        </TabsContent>

        <TabsContent value="config">
          <TabCard
            title="Section Configuration"
            body="Enable or disable liability sections for this event (Group forms, Individual forms, Safe Env certs, Letters of Good Standing). Set which fields are required per section."
            metric="All 4 sections enabled"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TabCard({ title, body, metric }: { title: string; body: string; metric: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{body}</p>
        <div className="mt-4 p-3 bg-[#F5F1E8] border border-[#E1D5BA] rounded-lg">
          <p className="text-sm font-medium text-navy">{metric}</p>
        </div>
      </CardContent>
    </Card>
  )
}
