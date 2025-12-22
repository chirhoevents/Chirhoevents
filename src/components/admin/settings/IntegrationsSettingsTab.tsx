'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
  DollarSign,
  Sheet,
  Mail as MailIcon,
  Calculator,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'

interface StripeIntegration {
  connected: boolean
  accountId: string | null
  accountName: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  mode: 'test' | 'live'
  stats: {
    totalVolume: number
    totalPayments: number
    lastPaymentDate: string | null
  }
}

interface Integrations {
  stripe: StripeIntegration
  googleSheets: { connected: boolean; comingSoon: boolean }
  mailchimp: { connected: boolean; comingSoon: boolean }
  quickbooks: { connected: boolean; comingSoon: boolean }
}

export default function IntegrationsSettingsTab() {
  const [integrations, setIntegrations] = useState<Integrations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings/integrations')
      if (!response.ok) throw new Error('Failed to fetch integrations')
      const data = await response.json()
      setIntegrations(data.integrations)
    } catch (err) {
      console.error('Error fetching integrations:', err)
      setError('Failed to load integrations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to initiate Stripe connection')
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error connecting Stripe:', err)
      alert('Failed to connect Stripe. Please try again.')
    } finally {
      setIsConnecting(false)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  const stripe = integrations?.stripe

  return (
    <div className="space-y-6">
      {/* Stripe Integration */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#635bff]/10 rounded-lg">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18.4 14.1c0-1.2 1-1.6 2.6-1.6 2.3 0 5.2.7 7.5 2V8.5c-2.5-1-5-1.4-7.5-1.4-6.1 0-10.2 3.2-10.2 8.5 0 8.3 11.4 7 11.4 10.6 0 1.4-1.2 1.8-2.9 1.8-2.5 0-5.8-.9-8.4-2.3v6.1c2.9 1.2 5.8 1.8 8.4 1.8 6.3 0 10.6-3.1 10.6-8.5 0-8.9-11.5-7.4-11.5-10.8"
                    fill="#635bff"
                  />
                </svg>
              </div>
              <div>
                <CardTitle className="text-[#1E3A5F]">Stripe</CardTitle>
                <CardDescription>Accept online payments for registrations</CardDescription>
              </div>
            </div>
            {stripe?.connected ? (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripe?.connected ? (
            <>
              {/* Connection Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Account</p>
                  <p className="font-medium text-[#1E3A5F]">
                    {stripe.accountName || 'Stripe Account'}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {stripe.accountId?.slice(0, 20)}...
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mode</p>
                  <Badge
                    variant="outline"
                    className={
                      stripe.mode === 'live'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }
                  >
                    {stripe.mode === 'live' ? 'Live Mode' : 'Test Mode'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="flex items-center gap-2">
                    {stripe.chargesEnabled && stripe.payoutsEnabled ? (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Fully Active
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500 text-white">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Setup Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-gray-500">Total Volume</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stripe.stats.totalVolume)}
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 text-[#1E3A5F]" />
                    <p className="text-sm text-gray-500">Total Payments</p>
                  </div>
                  <p className="text-2xl font-bold text-[#1E3A5F]">
                    {stripe.stats.totalPayments}
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-[#9C8466]" />
                    <p className="text-sm text-gray-500">Last Payment</p>
                  </div>
                  <p className="text-lg font-medium text-[#1E3A5F]">
                    {stripe.stats.lastPaymentDate
                      ? format(new Date(stripe.stats.lastPaymentDate), 'MMM d, yyyy')
                      : 'No payments yet'}
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="flex items-center gap-1 text-sm">
                  {stripe.chargesEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={stripe.chargesEnabled ? 'text-green-700' : 'text-red-600'}>
                    Charges {stripe.chargesEnabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {stripe.payoutsEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={stripe.payoutsEnabled ? 'text-green-700' : 'text-red-600'}>
                    Payouts {stripe.payoutsEnabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {stripe.detailsSubmitted ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={stripe.detailsSubmitted ? 'text-green-700' : 'text-red-600'}>
                    Details {stripe.detailsSubmitted ? 'complete' : 'incomplete'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Dashboard
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Connect your Stripe account to accept online payments for event registrations.
              </p>
              <Button
                onClick={handleConnectStripe}
                disabled={isConnecting}
                className="bg-[#635bff] hover:bg-[#5851ea] text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Stripe
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google Sheets */}
        <Card className="bg-white border-[#D1D5DB] opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Sheet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-[#1E3A5F] text-base">Google Sheets</CardTitle>
                <CardDescription className="text-xs">Sync registrations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="bg-gray-50">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>

        {/* Mailchimp */}
        <Card className="bg-white border-[#D1D5DB] opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <MailIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-[#1E3A5F] text-base">Mailchimp</CardTitle>
                <CardDescription className="text-xs">Email marketing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="bg-gray-50">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>

        {/* QuickBooks */}
        <Card className="bg-white border-[#D1D5DB] opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-[#1E3A5F] text-base">QuickBooks</CardTitle>
                <CardDescription className="text-xs">Accounting sync</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="bg-gray-50">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
