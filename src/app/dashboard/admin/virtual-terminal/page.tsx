'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreditCard, Search, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { VirtualTerminalForm } from '@/components/admin/virtual-terminal/VirtualTerminalForm'
import { VirtualTerminalSuccess } from '@/components/admin/virtual-terminal/VirtualTerminalSuccess'
import Link from 'next/link'

interface RegistrationData {
  type: 'group' | 'individual'
  id: string
  accessCode?: string
  confirmationCode?: string
  groupName?: string
  parishName?: string
  leaderName?: string
  leaderEmail?: string
  leaderPhone?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  event: {
    id: string
    name: string
    startDate: string
  }
  totalAmount: number
  amountPaid: number
  balance: number
  participantCount?: number
  depositAmount?: number
  roomType?: string
  housingType?: string
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    stripePaymentMethodId?: string
    cardBrand?: string
    cardLast4?: string
    createdAt: string
  }>
}

interface PaymentSuccessData {
  id: string
  amount: number
  paymentMethod: string
  cardLast4?: string
  recipientEmail: string
  recipientName: string
  eventName: string
  newBalance: number
}

export default function VirtualTerminalPage() {
  const [accessCode, setAccessCode] = useState('')
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessData | null>(null)
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean
    chargesEnabled: boolean
  } | null>(null)
  const [checkingStripe, setCheckingStripe] = useState(true)

  // Check Stripe connection status on mount
  useEffect(() => {
    checkStripeStatus()
  }, [])

  async function checkStripeStatus() {
    try {
      const response = await fetch('/api/admin/settings/integrations')
      const data = await response.json()
      setStripeStatus({
        connected: data.integrations?.stripe?.connected || false,
        chargesEnabled: data.integrations?.stripe?.chargesEnabled || false
      })
    } catch (err) {
      console.error('Failed to check Stripe status:', err)
      setStripeStatus({ connected: false, chargesEnabled: false })
    } finally {
      setCheckingStripe(false)
    }
  }

  async function handleLookup() {
    if (!accessCode.trim()) {
      setError('Please enter an access code')
      return
    }

    setLoading(true)
    setError('')
    setRegistration(null)

    try {
      const response = await fetch(`/api/admin/virtual-terminal/lookup?code=${encodeURIComponent(accessCode.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration not found')
      }

      setRegistration(data)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function handlePaymentSuccess(paymentData: PaymentSuccessData) {
    setPaymentSuccess(paymentData)
    setRegistration(null)
    setAccessCode('')
  }

  function handleProcessAnother() {
    setPaymentSuccess(null)
    setAccessCode('')
    setError('')
  }

  if (checkingStripe) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  // Show warning if Stripe is not connected
  if (!stripeStatus?.connected || !stripeStatus?.chargesEnabled) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-[#1E3A5F]" />
            <h1 className="text-3xl font-bold text-[#1E3A5F]">Virtual Terminal</h1>
          </div>
          <p className="text-gray-600">
            Process payments over the phone or in-person
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <CardTitle className="text-amber-800">Stripe Connection Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-amber-700">
              {!stripeStatus?.connected
                ? 'Your organization has not connected a Stripe account. You must connect Stripe to process card payments.'
                : 'Your Stripe account is connected but charges are not yet enabled. Please complete the Stripe onboarding process.'}
            </p>
            <p className="text-sm text-amber-600">
              Note: You can still record check and cash payments without Stripe.
            </p>
            <Link href="/dashboard/admin/settings?tab=integrations">
              <Button className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-8 h-8 text-[#1E3A5F]" />
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Virtual Terminal</h1>
        </div>
        <p className="text-gray-600">
          Process payments over the phone or in-person
        </p>
      </div>

      {/* Success State */}
      {paymentSuccess && (
        <VirtualTerminalSuccess
          payment={paymentSuccess}
          onProcessAnother={handleProcessAnother}
        />
      )}

      {/* Payment Form State */}
      {!paymentSuccess && registration && (
        <VirtualTerminalForm
          registration={registration}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setRegistration(null)
            setAccessCode('')
          }}
        />
      )}

      {/* Lookup State */}
      {!paymentSuccess && !registration && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">Look Up Registration</CardTitle>
            <CardDescription>
              Enter the group access code or individual confirmation code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accessCode">Access Code or Confirmation Code</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="accessCode"
                  placeholder="e.g., MTN-2000-ABC123 or IND-XYZ789"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  onClick={handleLookup}
                  disabled={loading || !accessCode.trim()}
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="ml-2">Look Up</span>
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium text-[#1E3A5F] mb-2">Quick Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Group access codes typically start with event prefix (e.g., MTN-2000-ABC123)</li>
                <li>Individual confirmation codes typically start with IND-</li>
                <li>Ask the caller for their code or search by name in Registrations first</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
