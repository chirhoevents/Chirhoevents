'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Download, CreditCard, Calendar, FileText, TrendingUp } from 'lucide-react'
import UpgradeRequestModal from '@/components/admin/UpgradeRequestModal'

interface BillingData {
  subscription: {
    tier: string
    status: string
    billingCycle: string
    monthlyPrice: number
    annualPrice: number
    renewsAt: string | null
    startedAt: string | null
  }
  usage: {
    eventsUsed: number
    eventsLimit: number | null
    registrationsUsed: number
    registrationsLimit: number | null
    storageUsedGb: number
    storageLimitGb: number
  }
  invoices: Array<{
    id: string
    invoiceNumber: number
    invoiceType: string
    amount: number
    status: string
    dueDate: string
    paidAt: string | null
    createdAt: string
  }>
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  small_diocese: 'Small Diocese',
  growing: 'Growing',
  conference: 'Conference',
  enterprise: 'Enterprise',
  test: 'Test (Free)',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  suspended: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
}

export default function BillingSettingsTab() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BillingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/admin/billing', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch billing data')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getProgressColor = (used: number, limit: number | null) => {
    if (!limit) return 'bg-blue-500'
    const percentage = (used / limit) * 100
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || 'Failed to load billing data'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-xl font-semibold text-[#1E3A5F]">
                {tierLabels[data.subscription.tier] || data.subscription.tier}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={statusColors[data.subscription.status] || 'bg-gray-100'}>
                {data.subscription.status.charAt(0).toUpperCase() + data.subscription.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Billing Cycle</p>
              <p className="font-medium">
                {data.subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(
                  data.subscription.billingCycle === 'annual'
                    ? data.subscription.annualPrice || 0
                    : data.subscription.monthlyPrice || 0
                )}
                <span className="text-sm font-normal text-gray-500">
                  /{data.subscription.billingCycle === 'annual' ? 'year' : 'month'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Started</p>
              <p className="font-medium">{formatDate(data.subscription.startedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Renewal</p>
              <p className="font-medium">{formatDate(data.subscription.renewsAt)}</p>
            </div>
          </div>

          {/* Upgrade Button */}
          {data.subscription.tier !== 'enterprise' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1E3A5F]">Need more capacity?</p>
                  <p className="text-sm text-gray-500">
                    Upgrade your plan to increase limits and unlock additional features.
                  </p>
                </div>
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Request Upgrade
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Events */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Events</span>
                <span className="text-sm text-gray-500">
                  {data.usage.eventsUsed} / {data.usage.eventsLimit || 'Unlimited'}
                </span>
              </div>
              {data.usage.eventsLimit && (
                <Progress
                  value={(data.usage.eventsUsed / data.usage.eventsLimit) * 100}
                  className="h-2"
                />
              )}
            </div>

            {/* Registrations */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Registrations</span>
                <span className="text-sm text-gray-500">
                  {data.usage.registrationsUsed.toLocaleString()} / {data.usage.registrationsLimit?.toLocaleString() || 'Unlimited'}
                </span>
              </div>
              {data.usage.registrationsLimit && (
                <Progress
                  value={(data.usage.registrationsUsed / data.usage.registrationsLimit) * 100}
                  className="h-2"
                />
              )}
            </div>

            {/* Storage */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-gray-500">
                  {data.usage.storageUsedGb.toFixed(2)} GB / {data.usage.storageLimitGb} GB
                </span>
              </div>
              <Progress
                value={(data.usage.storageUsedGb / data.usage.storageLimitGb) * 100}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No invoices yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      #{invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="capitalize">
                      {invoice.invoiceType.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status] || 'bg-gray-100'}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/api/admin/invoices/${invoice.id}/pdf`, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Request Modal */}
      <UpgradeRequestModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={data.subscription.tier}
      />
    </div>
  )
}
