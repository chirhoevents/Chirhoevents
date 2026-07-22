'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, Search, DollarSign, Users, Calendar } from 'lucide-react'

interface Org {
  id: string
  name: string
  tier: 'Trial' | 'Starter' | 'Professional' | 'Enterprise'
  mrr: number
  events: number
  users: number
  joined: string
  status: 'active' | 'trial' | 'past_due' | 'suspended'
}

const ORGS: Org[] = [
  { id: 'org-1', name: 'Steubenville Ministries', tier: 'Professional', mrr: 149, events: 8, users: 12, joined: '2024-03-15', status: 'active' },
  { id: 'org-2', name: 'Archdiocese of Denver Youth', tier: 'Enterprise', mrr: 349, events: 15, users: 24, joined: '2024-06-22', status: 'active' },
  { id: 'org-3', name: 'St. Ignatius Retreat Center', tier: 'Professional', mrr: 149, events: 5, users: 6, joined: '2025-01-08', status: 'active' },
  { id: 'org-4', name: 'Malvern Retreat House', tier: 'Starter', mrr: 49, events: 3, users: 3, joined: '2025-08-01', status: 'trial' },
  { id: 'org-5', name: 'Diocese of Peoria Youth', tier: 'Professional', mrr: 149, events: 6, users: 8, joined: '2024-11-11', status: 'active' },
  { id: 'org-6', name: 'Franciscan University Events', tier: 'Enterprise', mrr: 349, events: 22, users: 18, joined: '2023-09-30', status: 'active' },
  { id: 'org-7', name: 'Diocese of Sacramento', tier: 'Starter', mrr: 49, events: 2, users: 2, joined: '2025-09-15', status: 'past_due' },
  { id: 'org-8', name: 'St. Anne Parish (test)', tier: 'Trial', mrr: 0, events: 0, users: 1, joined: '2026-06-01', status: 'trial' },
]

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-800',
}

const tierColors: Record<string, string> = {
  Trial: 'bg-blue-100 text-blue-800',
  Starter: 'bg-gray-100 text-gray-800',
  Professional: 'bg-[#9C8466]/20 text-[#8B7355]',
  Enterprise: 'bg-purple-100 text-purple-800',
}

export default function OrganizationsPage() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = ORGS.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (query && !o.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const totalMrr = ORGS.filter((o) => o.status === 'active').reduce((n, o) => n + o.mrr, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy mb-1">Organizations</h1>
          <p className="text-muted-foreground">{ORGS.length} total · ${totalMrr}/mo MRR</p>
        </div>
        <Button
          onClick={() => alert('Demo: Would open a form to onboard a new organization manually (bypassing self-signup).')}
          className="bg-navy hover:bg-navy/90 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Organization
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organizations..."
            className="pl-10"
          />
        </div>
        {(['all', 'active', 'trial', 'past_due', 'suspended'] as const).map((s) => (
          <Button
            key={s}
            onClick={() => setStatusFilter(s)}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            className={statusFilter === s ? 'bg-navy hover:bg-navy/90 text-white' : ''}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">MRR</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Events</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Users</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-[#9C8466]/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[#9C8466]" />
                      </div>
                      <span className="font-medium text-navy">{o.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={tierColors[o.tier]}>{o.tier}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[o.status]}>{o.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">${o.mrr}/mo</td>
                  <td className="px-4 py-3 text-sm">{o.events}</td>
                  <td className="px-4 py-3 text-sm">{o.users}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{o.joined}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/demo/dashboard/master-admin/organizations/${o.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
