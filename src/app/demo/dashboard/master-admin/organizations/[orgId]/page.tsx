'use client'

import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2, ArrowLeft, Mail, Phone, MapPin, Calendar, Users,
  DollarSign, Activity, LogIn, Settings, AlertTriangle, Pause,
} from 'lucide-react'

const ORGS: Record<string, any> = {
  'org-1': { name: 'Steubenville Ministries', tier: 'Professional', mrr: 149, status: 'active', joined: '2024-03-15', email: 'admin@steubenvilleministries.org', phone: '555-0100', address: '1235 University Blvd, Steubenville, OH', events: 8, users: 12, registrations: 1247 },
  'org-2': { name: 'Archdiocese of Denver Youth', tier: 'Enterprise', mrr: 349, status: 'active', joined: '2024-06-22', email: 'sarah@denver-youth.org', phone: '555-0200', address: '1300 Colfax Ave, Denver, CO', events: 15, users: 24, registrations: 3842 },
  'org-3': { name: 'St. Ignatius Retreat Center', tier: 'Professional', mrr: 149, status: 'active', joined: '2025-01-08', email: 'info@stignatius.org', phone: '555-0300', address: '100 Pond Rd, Manhasset, NY', events: 5, users: 6, registrations: 512 },
  'org-4': { name: 'Malvern Retreat House', tier: 'Starter', mrr: 49, status: 'trial', joined: '2025-08-01', email: 'admin@malvern.org', phone: '555-0400', address: '315 S Warren Ave, Malvern, PA', events: 3, users: 3, registrations: 89 },
  'org-5': { name: 'Diocese of Peoria Youth', tier: 'Professional', mrr: 149, status: 'active', joined: '2024-11-11', email: 'youth@peoria.diocese', phone: '555-0500', address: '419 NE Madison Ave, Peoria, IL', events: 6, users: 8, registrations: 892 },
  'org-6': { name: 'Franciscan University Events', tier: 'Enterprise', mrr: 349, status: 'active', joined: '2023-09-30', email: 'events@franciscan.edu', phone: '555-0600', address: '1235 University Blvd, Steubenville, OH', events: 22, users: 18, registrations: 5124 },
  'org-7': { name: 'Diocese of Sacramento', tier: 'Starter', mrr: 49, status: 'past_due', joined: '2025-09-15', email: 'admin@sacdiocese.org', phone: '555-0700', address: '2110 Broadway, Sacramento, CA', events: 2, users: 2, registrations: 34 },
  'org-8': { name: 'St. Anne Parish (test)', tier: 'Trial', mrr: 0, status: 'trial', joined: '2026-06-01', email: 'test@stanne.example', phone: '555-0800', address: 'Test address', events: 0, users: 1, registrations: 0 },
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-800',
}

export default function OrgDetailPage() {
  const params = useParams()
  const orgId = params?.orgId as string
  const org = ORGS[orgId]

  if (!org) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/master-admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/master-admin/organizations" className="hover:text-navy">Organizations</Link>
        <span>/</span>
        <span className="text-navy font-medium">{org.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-[#9C8466]/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-[#9C8466]" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-navy">{org.name}</h1>
              <Badge className={statusColors[org.status]}>{org.status.replace('_', ' ')}</Badge>
              <Badge variant="secondary">{org.tier}</Badge>
            </div>
            <p className="text-muted-foreground">Joined {org.joined} · ${org.mrr}/mo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => alert(`Demo: Would impersonate ${org.name} — log in as their org admin to see exactly what they see.`)}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            <LogIn className="w-4 h-4 mr-1" />
            Impersonate
          </Button>
          <Button
            onClick={() => alert('Demo: Would open the pause-account confirmation modal.')}
            variant="outline"
          >
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        </div>
      </div>

      {org.status === 'past_due' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-700" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Payment past due</p>
              <p className="text-sm text-red-800">Last invoice unpaid for 15 days. Account will be paused in 15 more days.</p>
            </div>
            <Button
              onClick={() => alert('Demo: Would email a payment-past-due reminder to the account owner.')}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Send reminder
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Calendar} label="Events" value={org.events} />
        <Stat icon={Users} label="Users" value={org.users} />
        <Stat icon={Activity} label="Registrations" value={org.registrations.toLocaleString()} />
        <Stat icon={DollarSign} label="MRR" value={`$${org.mrr}`} accent="text-emerald-700" />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={Mail} label="Email" value={org.email} />
              <Row icon={Phone} label="Phone" value={org.phone} />
              <Row icon={MapPin} label="Address" value={org.address} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Billing History</CardTitle>
                <Button
                  onClick={() => alert('Demo: Would open the credit / adjustment modal.')}
                  variant="outline"
                  size="sm"
                >
                  Apply Credit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {['2026-07-01', '2026-06-01', '2026-05-01', '2026-04-01', '2026-03-01'].map((date, i) => (
                  <div key={date} className="p-4 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-navy">INV-{1000 + i} — {date}</p>
                      <p className="text-xs text-muted-foreground">{org.tier} subscription</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">${org.mrr}</span>
                      <Badge className={i === 0 && org.status === 'past_due' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                        {i === 0 && org.status === 'past_due' ? 'Overdue' : 'Paid'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {[
                  { name: 'Demo Admin', email: org.email, role: 'Org Admin' },
                  { name: 'Sarah Martinez', email: `sarah@${org.email.split('@')[1]}`, role: 'Event Manager' },
                  { name: 'Michael Chen', email: `mchen@${org.email.split('@')[1]}`, role: 'Finance Manager' },
                ].map((u) => (
                  <div key={u.email} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#9C8466] text-white flex items-center justify-center font-semibold">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-navy">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{u.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              This org has {org.events} events. In the real product, this tab
              lists them with dates, registration counts, and revenue per event.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 text-sm">
                {[
                  { time: '12m ago', action: 'Demo Admin created event "Winter Retreat 2027"' },
                  { time: '2h ago', action: 'Sarah Martinez sent bulk email to group leaders' },
                  { time: '1d ago', action: 'Michael Chen recorded a $2,850 payment' },
                  { time: '2d ago', action: 'Demo Admin invited a new team member' },
                  { time: '3d ago', action: 'Automatic monthly invoice generated ($149)' },
                ].map((a, i) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <p className="text-navy">{a.action}</p>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent || 'text-navy'}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold ${accent || 'text-navy'}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground w-24">{label}:</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  )
}
