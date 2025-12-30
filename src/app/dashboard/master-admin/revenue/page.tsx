'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Receipt,
  Download,
  Loader2,
  Percent,
  CreditCard,
  FileText,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TierRevenue {
  count: number
  mrr: number
}

interface PlatformFeeTransaction {
  id: string
  amount: number
  platformFee: number
  organizationName: string
  eventId: string | null
  date: string
}

interface SetupFeeInvoice {
  id: string
  invoiceNumber: number
  amount: number
  status: string
  organizationName: string
  createdAt: string
  paidAt: string | null
}

interface SubscriptionInvoice {
  id: string
  invoiceNumber: number
  amount: number
  status: string
  organizationName: string
  tier: string
  createdAt: string
  paidAt: string | null
  periodStart: string | null
  periodEnd: string | null
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
  platformFees: {
    totalCollected: number
    totalPaymentsProcessed: number
    transactionCount: number
    recentTransactions: PlatformFeeTransaction[]
  }
  setupFeeDetails: {
    invoices: SetupFeeInvoice[]
  }
  subscriptionDetails: {
    invoices: SubscriptionInvoice[]
  }
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

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchData()
  }, [])

  const handleExportCSV = async () => {
    if (!data) return
    setExporting(true)

    try {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]

      let csvContent = 'ChirhoEvents Revenue Report\n'
      csvContent += `Generated: ${now.toLocaleString()}\n\n`

      csvContent += 'SUMMARY METRICS\n'
      csvContent += 'Metric,Value\n'
      csvContent += `Monthly Recurring Revenue (MRR),${formatCurrency(data.mrr)}\n`
      csvContent += `Annual Recurring Revenue (ARR),${formatCurrency(data.arr)}\n`
      csvContent += `Active Organizations,${data.totalActiveOrgs}\n`
      csvContent += `Platform Fees Collected,${formatCurrency(data.platformFees?.totalCollected || 0)}\n\n`

      csvContent += 'REVENUE BY TIER\n'
      csvContent += 'Tier,Organizations,MRR\n'
      Object.entries(data.tierRevenue).forEach(([tier, stats]) => {
        csvContent += `${tierLabels[tier] || tier},${stats.count},${formatCurrency(stats.mrr)}\n`
      })
      csvContent += '\n'

      csvContent += 'PLATFORM FEES (1%)\n'
      csvContent += 'Total Payments Processed,Total Fees Collected,Transaction Count\n'
      csvContent += `${formatCurrency(data.platformFees?.totalPaymentsProcessed || 0)},${formatCurrency(data.platformFees?.totalCollected || 0)},${data.platformFees?.transactionCount || 0}\n\n`

      csvContent += 'SETUP FEES\n'
      csvContent += 'Status,Amount,Count\n'
      csvContent += `Collected,${formatCurrency(data.setupFees.collected)},${data.setupFees.paid}\n`
      csvContent += `Outstanding,${formatCurrency(data.setupFees.outstanding)},${data.setupFees.owed}\n`

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

  const handleExportPlatformFees = () => {
    if (!data?.platformFees?.recentTransactions) return

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]

    let csvContent = 'ChirhoEvents Platform Fees Report\n'
    csvContent += `Generated: ${now.toLocaleString()}\n\n`
    csvContent += 'Date,Organization,Event,Payment Amount,Platform Fee (1%)\n'

    data.platformFees.recentTransactions.forEach(t => {
      csvContent += `${new Date(t.date).toLocaleDateString()},"${t.organizationName}","${t.eventId || 'N/A'}",${formatCurrency(t.amount)},${formatCurrency(t.platformFee)}\n`
    })

    csvContent += `\nTotals\n`
    csvContent += `Total Payments Processed,${formatCurrency(data.platformFees.totalPaymentsProcessed)}\n`
    csvContent += `Total Platform Fees,${formatCurrency(data.platformFees.totalCollected)}\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `platform-fees-${dateStr}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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

      {/* Top Stats - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 opacity-80" />
            <TrendingUp className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(data.mrr)}</p>
          <p className="text-green-100 text-sm">Monthly Recurring Revenue</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Percent className="h-8 w-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(data.platformFees?.totalCollected || 0)}</p>
          <p className="text-purple-100 text-sm">Platform Fees (1%)</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="h-8 w-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{data.totalActiveOrgs}</p>
          <p className="text-blue-100 text-sm">Active Organizations</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Receipt className="h-8 w-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(data.setupFees.collected)}</p>
          <p className="text-amber-100 text-sm">Setup Fees Collected</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="platform-fees" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Platform Fees
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="setup-fees" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Setup Fees
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            </div>

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
              </div>
            </div>

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
        </TabsContent>

        {/* Platform Fees Tab */}
        <TabsContent value="platform-fees" className="space-y-6">
          {/* Platform Fees Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Payments Processed</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.platformFees?.totalPaymentsProcessed || 0)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Platform Fees Collected (1%)</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.platformFees?.totalCollected || 0)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Transactions</h3>
              <p className="text-2xl font-bold text-gray-900">{data.platformFees?.transactionCount || 0}</p>
            </div>
          </div>

          {/* Platform Fees Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Platform Fee Transactions</h3>
              <button
                onClick={handleExportPlatformFees}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fee (1%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.platformFees?.recentTransactions || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No platform fee transactions yet
                      </td>
                    </tr>
                  ) : (
                    data.platformFees.recentTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDate(t.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{t.organizationName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.eventId || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(t.amount)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">{formatCurrency(t.platformFee)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(data.platformFees?.recentTransactions || []).length > 0 && (
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">Totals</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(data.platformFees.totalPaymentsProcessed)}</td>
                      <td className="px-4 py-3 text-sm text-green-600 text-right">{formatCurrency(data.platformFees.totalCollected)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Subscription Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.subscriptionDetails?.invoices || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No subscription invoices yet
                      </td>
                    </tr>
                  ) : (
                    data.subscriptionDetails.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.organizationName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tierLabels[inv.tier] || inv.tier}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {inv.periodStart && inv.periodEnd
                            ? `${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Setup Fees Tab */}
        <TabsContent value="setup-fees" className="space-y-6">
          {/* Setup Fees Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Collected</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.setupFees.collected)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Outstanding</h3>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.setupFees.outstanding)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Paid</h3>
              <p className="text-2xl font-bold text-gray-900">{data.setupFees.paid}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending</h3>
              <p className="text-2xl font-bold text-gray-900">{data.setupFees.owed}</p>
            </div>
          </div>

          {/* Setup Fees Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Setup Fee Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.setupFeeDetails?.invoices || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No setup fee invoices yet
                      </td>
                    </tr>
                  ) : (
                    data.setupFeeDetails.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.organizationName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {inv.paidAt ? formatDate(inv.paidAt) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
