'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, Mail, Loader2 } from 'lucide-react'
import '@/styles/print-receipt.css'
import LoadingScreen from '@/components/LoadingScreen'

interface RegistrationData {
  id: string
  groupName: string
  accessCode: string
  qrCode: string | null
  groupLeaderEmail: string
  totalParticipants: number
  eventName: string
  eventId: string
  depositPaid: number
  totalAmount: number
  balanceRemaining: number
  registrationStatus: string
  organizationName: string
  organizationLogoUrl: string | null
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
    if (!registration) return

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Registration Confirmation - ${registration.groupName}</title>
        <style>
          @page {
            size: letter;
            margin: 0.75in;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            font-size: 14px;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0;
          }
          .header {
            border-bottom: 3px solid #9C8466;
            margin-bottom: 1.5em;
            padding-bottom: 1em;
            text-align: center;
          }
          .header-logos {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            margin-bottom: 15px;
          }
          .chirho-logo {
            height: 40px;
          }
          .org-logo {
            max-height: 70px;
            max-width: 200px;
          }
          h1 {
            color: #1E3A5F;
            font-size: 28px;
            margin: 10px 0 5px 0;
          }
          .event-name {
            color: #9C8466;
            font-size: 18px;
            margin: 0;
          }
          h2 {
            color: #9C8466;
            margin-top: 1.5em;
            font-size: 18px;
            border-bottom: 2px solid #9C8466;
            padding-bottom: 5px;
          }
          .welcome-box {
            background: linear-gradient(135deg, #f8f6f3 0%, #f0ebe4 100%);
            border: 2px solid #9C8466;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 20px 0;
          }
          .group-name {
            font-size: 24px;
            font-weight: bold;
            color: #1E3A5F;
            margin-bottom: 10px;
          }
          .access-code-box {
            background: white;
            border: 3px solid #1E3A5F;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 20px auto;
            max-width: 350px;
          }
          .access-code-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .access-code {
            font-size: 36px;
            font-weight: bold;
            color: #1E3A5F;
            font-family: 'Courier New', monospace;
            letter-spacing: 3px;
          }
          .qr-section {
            text-align: center;
            margin: 25px 0;
          }
          .qr-code {
            width: 180px;
            height: 180px;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 8px;
            background: white;
          }
          .qr-label {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .info-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #9C8466;
          }
          .info-box h3 {
            margin: 0 0 10px 0;
            color: #1E3A5F;
            font-size: 14px;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 13px;
          }
          .payment-summary {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .payment-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 16px;
            color: #1E3A5F;
            padding-top: 12px;
            border-top: 2px solid #9C8466;
            margin-top: 8px;
          }
          .next-steps {
            margin: 25px 0;
          }
          .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .step-number {
            width: 28px;
            height: 28px;
            background: #1E3A5F;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 12px;
            flex-shrink: 0;
          }
          .step-content h4 {
            margin: 0 0 3px 0;
            color: #1E3A5F;
            font-size: 14px;
          }
          .step-content p {
            margin: 0;
            color: #666;
            font-size: 13px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #888;
            font-size: 11px;
          }
          .highlight-box {
            background: #e8f4e8;
            border: 1px solid #4ade80;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .highlight-box p {
            margin: 0;
            color: #166534;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-logos">
            <img src="/logo-horizontal.png" alt="ChiRho Events" class="chirho-logo" onerror="this.style.display='none'" />
            ${registration.organizationLogoUrl ? `<img src="${registration.organizationLogoUrl}" alt="${registration.organizationName}" class="org-logo" onerror="this.style.display='none'" />` : ''}
          </div>
          <h1>Registration Confirmation</h1>
          <p class="event-name">${registration.eventName}</p>
        </div>

        <div class="welcome-box">
          <div class="group-name">${registration.groupName}</div>
          <p style="margin: 0; color: #666;">Thank you for registering ${registration.totalParticipants} participant${registration.totalParticipants !== 1 ? 's' : ''}!</p>
        </div>

        <div class="access-code-box">
          <div class="access-code-label">Your Group Access Code</div>
          <div class="access-code">${registration.accessCode}</div>
        </div>

        ${registration.qrCode ? `
          <div class="qr-section">
            <img src="${registration.qrCode}" alt="QR Code" class="qr-code" />
            <p class="qr-label">Scan this QR code at check-in</p>
          </div>
        ` : ''}

        <div class="info-grid">
          <div class="info-box">
            <h3>Group Information</h3>
            <p><strong>Group:</strong> ${registration.groupName}</p>
            <p><strong>Participants:</strong> ${registration.totalParticipants}</p>
            <p><strong>Access Code:</strong> ${registration.accessCode}</p>
          </div>
          <div class="info-box">
            <h3>Contact Information</h3>
            <p><strong>Email:</strong> ${registration.groupLeaderEmail}</p>
            <p><strong>Registration ID:</strong> ${registration.id.slice(0, 8)}...</p>
          </div>
        </div>

        <h2>Payment Summary</h2>
        <div class="payment-summary">
          <div class="payment-row">
            <span>Total Registration Cost:</span>
            <span>$${registration.totalAmount.toFixed(2)}</span>
          </div>
          <div class="payment-row" style="color: #16a34a;">
            <span>Deposit Paid:</span>
            <span>-$${registration.depositPaid.toFixed(2)}</span>
          </div>
          <div class="payment-row">
            <span>Balance Remaining:</span>
            <span>$${registration.balanceRemaining.toFixed(2)}</span>
          </div>
        </div>

        <h2>Next Steps</h2>
        <div class="next-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>Complete Liability Forms</h4>
              <p>Each participant must complete their liability form using your access code at the Poros portal.</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>Access Group Leader Portal</h4>
              <p>Sign in to manage your group, track form completion, and make payments.</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>Pay Remaining Balance</h4>
              <p>Your balance of $${registration.balanceRemaining.toFixed(2)} is due before the event.</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h4>Check-In at the Event</h4>
              <p>Bring this confirmation or your QR code for quick check-in!</p>
            </div>
          </div>
        </div>

        <div class="highlight-box">
          <p><strong>Confirmation Email Sent!</strong> We've sent all these details to ${registration.groupLeaderEmail}. Check your spam folder if you don't see it.</p>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Questions? Reply to your confirmation email or contact the event organizer.</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printHTML)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading confirmation..." />
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

          {/* QR Code & Access Code Card */}
          <Card className="mb-6 border-2 border-gold">
            <CardHeader className="bg-gold-50">
              <CardTitle className="text-center">Check-In Information</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center">
                {/* QR Code */}
                {registration.qrCode && (
                  <div className="mb-6">
                    <img
                      src={registration.qrCode}
                      alt="Registration QR Code"
                      className="w-48 h-48 mx-auto border-2 border-gray-200 rounded-lg p-2 bg-white"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Scan this QR code at check-in
                    </p>
                  </div>
                )}

                {/* Access Code */}
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
                    <p className="font-semibold text-navy">Mail Your Check</p>
                    <p className="text-sm text-gray-600">
                      Send your check using the instructions above.
                    </p>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Complete Liability Forms</p>
                    <p className="text-sm text-gray-600">
                      Each participant must complete their liability form using your access code. They can go to the Poros liability platform.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      size="sm"
                      onClick={() => window.open(`/poros?code=${registration.accessCode}`, '_blank')}
                    >
                      Go to Poros Liability
                    </Button>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Set Up Your Group Leader Dashboard</p>
                    <p className="text-sm text-gray-600">
                      Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!
                    </p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      size="sm"
                      onClick={() => window.open(`/sign-in?portal=group-leader&code=${encodeURIComponent(registration.accessCode)}`, '_blank')}
                    >
                      Go to Group Leader Portal
                    </Button>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Sent a Check?</p>
                    <p className="text-sm text-gray-600">
                      We&apos;ll email you once your check is received and processed.
                    </p>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    5
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Check-In Information Coming Soon</p>
                    <p className="text-sm text-gray-600">
                      You will receive an email with your QR code for check-in and further instructions closer to the Conference!
                    </p>
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    6
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Questions?</p>
                    <p className="text-sm text-gray-600">
                      Reply to the confirmation email or contact the event organizer.
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
