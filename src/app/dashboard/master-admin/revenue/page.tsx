'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Building2,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
  Download,
  Loader2,
} from 'lucide-react'

interface TierRevenue {
  count: number
  mrr: number
}

interface RevenueData {
  mrr: number
  arr: number
  totalActiveOrgs: number
  tierRevenue: Record<string, TierRevenue>
  billingCycleBreakdown: {
    monthly: number
    annual: number
  }
  setupFees: {
    paid: number
    owed: number
    collected: number
    outstanding: number
  }
  monthlySignups: { month: string; count: number }[]
  invoiceStats: {
    total: number
    paid: number
    pending: number
    overdue: number
    totalCollected: number
    totalOutstanding: number
  }
  recentOrgs: {
    id: string
    name: string
    subscriptionTier: string
    billingCycle: string
    monthlyFee: number
    createdAt: string
  }[]
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  small_diocese: 'Small Diocese',
  growing: 'Growing',
  conference: 'Conference',
  enterprise: 'Enterprise',
}

const tierColors: Record<string, string> = {
  starter: 'bg-gray-500',
  small_diocese: 'bg-blue-500',
  growing: 'bg-green-500',
  conference: 'bg-purple-500',
  enterprise: 'bg-amber-500',
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const handleExportCSV = async () => {
    if (!data) return
    setExporting(true)

    try {
      // Generate CSV content
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]

      let csvContent = 'ChirhoEvents Revenue Report\n'
      csvContent += `Generated: ${now.toLocaleString()}\n\n`

      // Summary metrics
      csvContent += 'SUMMARY METRICS\n'
      csvContent += 'Metric,Value\n'
      csvContent += `Monthly Recurring Revenue (MRR),${formatCurrency(data.mrr)}\n`
      csvContent += `Annual Recurring Revenue (ARR),${formatCurrency(data.arr)}\n`
      csvContent += `Active Organizations,${data.totalActiveOrgs}\n`
      csvContent += `Average Revenue per Org,${formatCurrency(data.totalActiveOrgs > 0 ? data.mrr / data.totalActiveOrgs : 0)}\n\n`

      // Revenue by tier
      csvContent += 'REVENUE BY TIER\n'
      csvContent += 'Tier,Organizations,MRR\n'
      Object.entries(data.tierRevenue).forEach(([tier, stats]) => {
        csvContent += `${tierLabels[tier] || tier},${stats.count},${formatCurrency(stats.mrr)}\n`
      })
      csvContent += '\n'

      // Billing cycle breakdown
      csvContent += 'BILLING CYCLE\n'
      csvContent += 'Cycle,Count\n'
      csvContent += `Annual,${data.billingCycleBreakdown.annual}\n`
      csvContent += `Monthly,${data.billingCycleBreakdown.monthly}\n\n`

      // Setup fees
      csvContent += 'SETUP FEES\n'
      csvContent += 'Status,Amount,Count\n'
      csvContent += `Collected,${formatCurrency(data.setupFees.collected)},${data.setupFees.paid}\n`
      csvContent += `Outstanding,${formatCurrency(data.setupFees.outstanding)},${data.setupFees.owed}\n\n`

      // Invoice stats
      csvContent += 'INVOICE SUMMARY\n'
      csvContent += 'Status,Count,Amount\n'
      csvContent += `Paid,${data.invoiceStats.paid},${formatCurrency(data.invoiceStats.totalCollected)}\n`
      csvContent += `Pending,${data.invoiceStats.pending},-\n`
      csvContent += `Overdue,${data.invoiceStats.overdue},-\n`
      csvContent += `Total Outstanding,-,${formatCurrency(data.invoiceStats.totalOutstanding)}\n\n`

      // Monthly signups
      csvContent += 'MONTHLY SIGNUPS (6 MONTHS)\n'
      csvContent += 'Month,New Organizations\n'
      data.monthlySignups.forEach(m => {
        csvContent += `${m.month},${m.count}\n`
      })
      csvContent += '\n'

      // Recent orgs
      csvContent += 'RECENT ORGANIZATIONS\n'
      csvContent += 'Name,Tier,Billing Cycle,Monthly Fee,Created\n'
      data.recentOrgs.forEach(org => {
        csvContent += `"${org.name}",${tierLabels[org.subscriptionTier] || org.subscriptionTier},${org.billingCycle},${formatCurrency(org.monthlyFee || 0)},${new Date(org.createdAt).toLocaleDateString()}\n`
      })

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `chirhoevents-revenue-report-${dateStr}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export report')
    } finally {
      setExporting(false)
    }
  }

  const fetchData = async () => {
    try {
      const response = await fetch('/api/master-admin/revenue')
      if (!response.ok) throw new Error('Failed to fetch revenue data')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching revenue:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-purple-600 animate-pulse" />
          <span className="text-gray-600">Loading revenue data...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load revenue data</p>
      </div>
    )
  }

  // Calculate max for bar chart
  const maxSignups = Math.max(...data.monthlySignups.map(s => s.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Analytics</h1>
          <p className="text-gray-600">Platform financial overview and growth metrics</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting || !data}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export Report
            </>
          )}
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 opacity-80" />
            <TrendingUp className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(data.mrr)}</p>
          <p className="text-green-100 text-sm">Monthly Recurring Revenue</p>
        </div>

        {/* ARR */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 opacity-80" />
            <Calendar className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(data.arr)}</p>
          <p className="text-purple-100 text-sm">Annual Recurring Revenue</p>
        </div>

        {/* Active Orgs */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="h-8 w-8 opacity-80" />
            <ArrowUpRight className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{data.totalActiveOrgs}</p>
          <p className="text-blue-100 text-sm">Active Organizations</p>
        </div>

        {/* Avg Revenue per Org */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Receipt className="h-8 w-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(data.totalActiveOrgs > 0 ? data.mrr / data.totalActiveOrgs : 0)}
          </p>
          <p className="text-amber-100 text-sm">Avg. Revenue per Org</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Signups */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Organizations (6 Months)</h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {data.monthlySignups.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-gray-600 mb-1">{month.count}</span>
                  <div
                    className="w-full bg-purple-500 rounded-t transition-all"
                    style={{ height: `${(month.count / maxSignups) * 100}px`, minHeight: month.count > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2">{month.month.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Tier */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Tier</h3>
          <div className="space-y-4">
            {Object.entries(data.tierRevenue).map(([tier, stats]) => (
              <div key={tier} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${tierColors[tier]}`} />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{tierLabels[tier]}</span>
                    <span className="text-sm text-gray-600">{stats.count} orgs</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${tierColors[tier]} rounded-full`}
                      style={{ width: `${data.mrr > 0 ? (stats.mrr / data.mrr) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-20 text-right">
                  {formatCurrency(stats.mrr)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Billing Cycle Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Billing Cycle</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.billingCycleBreakdown.annual}</p>
              <p className="text-sm text-gray-500">Annual</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{data.billingCycleBreakdown.monthly}</p>
              <p className="text-sm text-gray-500">Monthly</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-purple-500"
              style={{
                width: `${
                  data.totalActiveOrgs > 0
                    ? (data.billingCycleBreakdown.annual / data.totalActiveOrgs) * 100
                    : 0
                }%`,
              }}
            />
            <div
              className="h-full bg-cyan-500"
              style={{
                width: `${
                  data.totalActiveOrgs > 0
                    ? (data.billingCycleBreakdown.monthly / data.totalActiveOrgs) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" /> Annual
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-500" /> Monthly
            </span>
          </div>
        </div>

        {/* Setup Fees */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Setup Fees</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Collected</span>
              <span className="font-medium text-green-600">{formatCurrency(data.setupFees.collected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Outstanding</span>
              <span className="font-medium text-amber-600">{formatCurrency(data.setupFees.outstanding)}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
              <span>{data.setupFees.paid} paid</span>
              <span>{data.setupFees.owed} pending</span>
            </div>
          </div>
        </div>

        {/* Invoice Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Invoices</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Paid</span>
              <span className="font-medium text-green-600">{data.invoiceStats.paid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-medium text-amber-600">{data.invoiceStats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Overdue</span>
              <span className="font-medium text-red-600">{data.invoiceStats.overdue}</span>
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Collections</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Collected</span>
              <span className="font-medium text-green-600">{formatCurrency(data.invoiceStats.totalCollected)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding</span>
              <span className="font-medium text-amber-600">{formatCurrency(data.invoiceStats.totalOutstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Organizations</h3>
          <Link
            href="/dashboard/master-admin/organizations"
            className="text-sm text-purple-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {data.recentOrgs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No organizations yet</div>
          ) : (
            data.recentOrgs.map((org) => (
              <div key={org.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">
                    {tierLabels[org.subscriptionTier] || org.subscriptionTier} - {org.billingCycle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(org.monthlyFee || 0)}/mo</p>
                  <p className="text-xs text-gray-500">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
