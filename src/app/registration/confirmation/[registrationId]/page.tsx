'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, Mail, Loader2 } from 'lucide-react'
import '@/styles/print-receipt.css'

interface RegistrationData {
  id: string
  groupName: string
  accessCode: string
  groupLeaderEmail: string
  totalParticipants: number
  eventName: string
  depositPaid: number
  totalAmount: number
  balanceRemaining: number
  registrationStatus: string
}

export default function ConfirmationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const registrationId = params.registrationId as string
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRegistration() {
      try {
        const response = await fetch(`/api/registration/${registrationId}`)
        if (!response.ok) throw new Error('Registration not found')
        const data = await response.json()
        setRegistration(data)

        // If there's a session ID, verify payment
        if (sessionId) {
          await fetch('/api/webhooks/stripe/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, registrationId }),
          })
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load registration')
      } finally {
        setLoading(false)
      }
    }
    loadRegistration()
  }, [registrationId, sessionId])

  const handleDownloadReceipt = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    )
  }

  if (error || !registration) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Registration not found'}</p>
            <Button onClick={() => window.location.href = '/'}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-beige py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-navy mb-2">
              Registration Complete!
            </h1>
            <p className="text-xl text-gray-600">
              Thank you for registering for {registration.eventName}
            </p>
          </div>

          {/* Access Code Card */}
          <Card className="mb-6 border-2 border-gold">
            <CardHeader className="bg-gold-50">
              <CardTitle className="text-center">Your Access Code</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="inline-block bg-white px-8 py-4 rounded-lg border-2 border-gold mb-4">
                  <p className="text-sm text-gray-600 mb-1">Group Access Code</p>
                  <p className="text-3xl font-bold text-navy font-mono tracking-wider">
                    {registration.accessCode}
                  </p>
                </div>
                <p className="text-gray-600 text-sm">
                  Save this code! You&apos;ll need it to complete liability forms and access your group portal.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Registration Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Registration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Group Name</p>
                  <p className="font-semibold text-navy">{registration.groupName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Participants</p>
                  <p className="font-semibold text-navy">{registration.totalParticipants}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Registration Cost:</span>
                  <span className="font-semibold">${registration.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Deposit Paid:</span>
                  <span className="font-semibold">-${registration.depositPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-navy">Balance Remaining:</span>
                  <span className="font-bold text-navy text-xl">
                    ${registration.balanceRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Payment Due:</strong> Your balance of ${registration.balanceRemaining.toFixed(2)} is due before the event.
                  You can make payments anytime using your access code in the Group Leader Portal.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Complete Liability Forms</p>
                    <p className="text-sm text-gray-600">
                      Each participant must complete their liability form. Under 18? Parents will receive an email.
                      Over 18? They can complete it themselves.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      size="sm"
                      onClick={() => window.open(`/poros?code=${registration.accessCode}`, '_blank')}
                    >
                      Start Liability Forms
                    </Button>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Pay Remaining Balance</p>
                    <p className="text-sm text-gray-600">
                      Pay your balance before the event using the Group Leader Portal with your access code.
                    </p>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Check-In at Event</p>
                    <p className="text-sm text-gray-600">
                      Arrive at the event and check in with your access code to receive your group packet.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Email Confirmation Notice */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 flex items-start">
              <Mail className="h-6 w-6 text-green-600 mr-3 mt-1" />
              <div>
                <p className="font-semibold text-green-900 mb-1">
                  Confirmation Email Sent
                </p>
                <p className="text-sm text-green-800">
                  We&apos;ve sent a confirmation email to <strong>{registration.groupLeaderEmail}</strong> with your
                  access code, payment receipt, and next steps. Check your spam folder if you don&apos;t see it.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center print:hidden">
            <Button size="lg" variant="outline" onClick={handleDownloadReceipt}>
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
            <Button
              size="lg"
              onClick={() => window.open(`/sign-in?portal=group-leader&code=${encodeURIComponent(registration.accessCode)}`, '_blank')}
            >
              Access Group Portal
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
