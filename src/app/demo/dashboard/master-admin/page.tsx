'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  DollarSign,
  Ticket,
  TrendingUp,
  ArrowRight,
  Activity,
  AlertCircle,
} from 'lucide-react'

export default function MasterAdminDashboard() {
  const stats = {
    activeOrgs: 14,
    monthlyRecurringRevenue: 4785,
    totalRegistrations: 8942,
    openTickets: 3,
    pendingApprovals: 2,
  }

  const recentOrgs = [
    { id: 'org-1', name: 'Steubenville Ministries', tier: 'Professional', mrr: 149, joined: '2024-03-15', status: 'active' },
    { id: 'org-2', name: 'Archdiocese of Denver Youth', tier: 'Enterprise', mrr: 349, joined: '2024-06-22', status: 'active' },
    { id: 'org-3', name: 'St. Ignatius Retreat Center', tier: 'Professional', mrr: 149, joined: '2025-01-08', status: 'active' },
    { id: 'org-4', name: 'Malvern Retreat House', tier: 'Starter', mrr: 49, joined: '2025-08-01', status: 'trial' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">Platform Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here's what's happening across the ChiRho platform today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Active Organizations" value={stats.activeOrgs} color="text-navy" />
        <StatCard icon={DollarSign} label="Monthly Recurring Revenue" value={`$${stats.monthlyRecurringRevenue.toLocaleString()}`} color="text-emerald-700" />
        <StatCard icon={Users} label="Total Registrations" value={stats.totalRegistrations.toLocaleString()} color="text-navy" />
        <StatCard icon={Ticket} label="Open Support Tickets" value={stats.openTickets} color="text-amber-700" />
      </div>

      {/* Attention needed */}
      {stats.pendingApprovals > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                {stats.pendingApprovals} organizations awaiting approval
              </p>
              <p className="text-sm text-amber-800">
                Review new onboarding requests to activate their portals.
              </p>
            </div>
            <Link href="/demo/dashboard/master-admin/pending-requests">
              <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white">
                Review
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orgs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-navy">Recent Organizations</CardTitle>
              <Link href="/demo/dashboard/master-admin/organizations">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {recentOrgs.map((org) => (
                <div key={org.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-navy">{org.name}</p>
                      <Badge className={org.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
                        {org.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {org.tier} · ${org.mrr}/mo · joined {org.joined}
                    </p>
                  </div>
                  <Link href={`/demo/dashboard/master-admin/organizations/${org.id}`}>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/demo/dashboard/master-admin/organizations">
              <Button variant="outline" className="w-full justify-start border-navy text-navy hover:bg-navy hover:text-white">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Organizations
              </Button>
            </Link>
            <Link href="/demo/dashboard/master-admin/emails">
              <Button variant="outline" className="w-full justify-start border-navy text-navy hover:bg-navy hover:text-white">
                <TrendingUp className="w-4 h-4 mr-2" />
                Send Platform Announcement
              </Button>
            </Link>
            <Link href="/demo/dashboard/master-admin/revenue">
              <Button variant="outline" className="w-full justify-start border-navy text-navy hover:bg-navy hover:text-white">
                <DollarSign className="w-4 h-4 mr-2" />
                Revenue Analytics
              </Button>
            </Link>
            <Link href="/demo/dashboard/master-admin/support-tickets">
              <Button variant="outline" className="w-full justify-start border-navy text-navy hover:bg-navy hover:text-white">
                <Ticket className="w-4 h-4 mr-2" />
                Support Queue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Platform activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-navy flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#9C8466]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <ActivityRow time="12m ago" text="Steubenville Ministries created a new event: Summer Youth Retreat 2026" />
            <ActivityRow time="1h ago" text="Malvern Retreat House upgraded from Trial to Starter" />
            <ActivityRow time="3h ago" text="Archdiocese of Denver Youth ran a report: Financial Q3 2026" />
            <ActivityRow time="6h ago" text="New onboarding request from Sacred Heart Diocese" />
            <ActivityRow time="1d ago" text="Support ticket #1042 resolved by ChiRho Team" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
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
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function ActivityRow({ time, text }: { time: string; text: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <div className="w-2 h-2 rounded-full bg-[#9C8466] mt-2 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-navy">{text}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}
