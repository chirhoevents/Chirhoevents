'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Users, Building2, Download } from 'lucide-react'

const MONTHLY_REVENUE = [
  { month: 'Jan 2026', mrr: 3892, newOrgs: 1, churned: 0, net: 149 },
  { month: 'Feb 2026', mrr: 4041, newOrgs: 1, churned: 0, net: 149 },
  { month: 'Mar 2026', mrr: 4190, newOrgs: 2, churned: 1, net: 149 },
  { month: 'Apr 2026', mrr: 4339, newOrgs: 1, churned: 0, net: 149 },
  { month: 'May 2026', mrr: 4438, newOrgs: 1, churned: 1, net: 99 },
  { month: 'Jun 2026', mrr: 4636, newOrgs: 2, churned: 0, net: 198 },
  { month: 'Jul 2026', mrr: 4785, newOrgs: 1, churned: 0, net: 149 },
]

const TIER_BREAKDOWN = [
  { tier: 'Enterprise', count: 2, mrrPer: 349, total: 698, color: 'bg-purple-600' },
  { tier: 'Professional', count: 8, mrrPer: 149, total: 1192, color: 'bg-[#9C8466]' },
  { tier: 'Starter', count: 4, mrrPer: 49, total: 196, color: 'bg-blue-600' },
]

export default function RevenuePage() {
  const [range, setRange] = useState<'ytd' | '30d' | '90d' | 'all'>('ytd')

  const currentMrr = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1].mrr
  const previousMrr = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 2].mrr
  const mrrGrowth = ((currentMrr - previousMrr) / previousMrr) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy mb-1">Revenue & Analytics</h1>
          <p className="text-muted-foreground">Platform-wide financial performance</p>
        </div>
        <div className="flex gap-2">
          {(['30d', '90d', 'ytd', 'all'] as const).map((r) => (
            <Button
              key={r}
              onClick={() => setRange(r)}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              className={range === r ? 'bg-navy text-white' : ''}
            >
              {r === 'ytd' ? 'YTD' : r === 'all' ? 'All Time' : r.toUpperCase()}
            </Button>
          ))}
          <Button
            onClick={() => alert('Demo: Would export revenue data as CSV.')}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">MRR</span>
              <DollarSign className="h-5 w-5 text-emerald-700" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">${currentMrr.toLocaleString()}</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${mrrGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {mrrGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {mrrGrowth >= 0 ? '+' : ''}{mrrGrowth.toFixed(1)}% MoM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">ARR</span>
              <DollarSign className="h-5 w-5 text-navy" />
            </div>
            <p className="text-2xl font-bold text-navy">${(currentMrr * 12).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Annualized run rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Active orgs</span>
              <Building2 className="h-5 w-5 text-navy" />
            </div>
            <p className="text-2xl font-bold text-navy">14</p>
            <p className="text-xs text-emerald-700 mt-1">+2 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Registrations processed</span>
              <Users className="h-5 w-5 text-navy" />
            </div>
            <p className="text-2xl font-bold text-navy">8,942</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-navy">MRR by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TIER_BREAKDOWN.map((t) => {
              const pct = (t.total / currentMrr) * 100
              return (
                <div key={t.tier}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-navy">
                      {t.tier} <span className="text-muted-foreground">· {t.count} orgs × ${t.mrrPer}/mo</span>
                    </span>
                    <span className="font-semibold">${t.total.toLocaleString()}/mo</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${t.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% of total MRR</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Monthly Trend (2026)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Month</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">MRR</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">New orgs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Churned</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Net MRR change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MONTHLY_REVENUE.slice().reverse().map((m) => (
                <tr key={m.month}>
                  <td className="px-4 py-3 font-medium text-navy">{m.month}</td>
                  <td className="px-4 py-3">${m.mrr.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-emerald-100 text-emerald-800">+{m.newOrgs}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {m.churned > 0 ? (
                      <Badge className="bg-red-100 text-red-800">-{m.churned}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium ${m.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {m.net >= 0 ? '+' : ''}${m.net}
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
