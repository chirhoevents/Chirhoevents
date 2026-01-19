'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Printer, Mail, Loader2 } from 'lucide-react'
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

    // Generate a professional printable HTML document
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print your receipt')
      return
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Registration Confirmation - ${registration.groupName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0.5in; size: letter; }
    }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="p-8 max-w-3xl mx-auto bg-white">
  <!-- Header with Logos -->
  <div class="relative mb-8 pb-4 border-b-2 border-gray-200">
    <!-- ChirhoEvents Logo - Small, top left -->
    <div class="absolute top-0 left-0">
      <img src="/logo-horizontal.png" alt="ChiRho Events" class="h-8" onerror="this.style.display='none'" />
    </div>

    <!-- Org Logo - Centered -->
    <div class="flex flex-col items-center justify-center pt-4">
      ${registration.organizationLogoUrl
        ? `<img src="${registration.organizationLogoUrl}" alt="${registration.organizationName}" class="h-20 mb-3 object-contain" onerror="this.parentElement.innerHTML='<h2 class=\\'text-2xl font-bold text-gray-800\\'>${registration.organizationName}</h2>'" />`
        : `<h2 class="text-2xl font-bold text-gray-800">${registration.organizationName}</h2>`
      }
      <h1 class="text-3xl font-bold text-center text-[#1a365d] mt-2">${registration.eventName}</h1>
      <p class="text-lg text-gray-600 mt-1">Registration Confirmation</p>
    </div>
  </div>

  <!-- Group Info Banner -->
  <div class="mb-6 bg-gradient-to-r from-[#1a365d] to-[#2d4a6f] text-white p-6 rounded-xl">
    <div class="text-center">
      <p class="text-sm uppercase tracking-wider opacity-80 mb-1">Welcome</p>
      <h2 class="text-2xl font-bold">${registration.groupName}</h2>
      <p class="text-sm opacity-80 mt-1">${registration.totalParticipants} Participants</p>
    </div>
  </div>

  <!-- QR Code & Access Code -->
  <div class="mb-6 border-2 border-[#c9a227] rounded-xl overflow-hidden">
    <div class="bg-[#faf8f0] px-4 py-3 border-b border-[#c9a227]">
      <h3 class="text-lg font-bold text-center text-[#1a365d]">Check-In Information</h3>
    </div>
    <div class="p-8 text-center bg-white">
      ${registration.qrCode ? `
        <div class="mb-6">
          <img src="${registration.qrCode}" alt="QR Code" class="w-48 h-48 mx-auto border-2 border-gray-200 rounded-lg p-2 bg-white" />
          <p class="text-sm text-gray-500 mt-2">Scan this QR code at check-in</p>
        </div>
      ` : ''}

      <div class="inline-block bg-gradient-to-br from-gray-50 to-white px-10 py-6 rounded-xl border-3 border-[#c9a227] shadow-lg">
        <p class="text-sm text-gray-500 mb-2 uppercase tracking-wider">Group Access Code</p>
        <p class="text-4xl font-bold text-[#1a365d] font-mono tracking-[0.2em]">${registration.accessCode}</p>
      </div>
      <p class="text-gray-500 text-sm mt-4 max-w-md mx-auto">
        Save this code! You'll need it to complete liability forms and access your Group Leader Portal.
      </p>
    </div>
  </div>

  <!-- Payment Summary -->
  <div class="mb-6 border border-gray-200 rounded-xl overflow-hidden">
    <div class="bg-gray-50 px-4 py-3 border-b">
      <h3 class="text-lg font-bold text-[#1a365d]">Payment Summary</h3>
    </div>
    <div class="p-6 bg-white">
      <div class="space-y-3">
        <div class="flex justify-between text-gray-600">
          <span>Total Registration Cost:</span>
          <span class="font-semibold text-gray-800">$${registration.totalAmount.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-green-600">
          <span>Deposit Paid:</span>
          <span class="font-semibold">-$${registration.depositPaid.toFixed(2)}</span>
        </div>
        <div class="flex justify-between pt-3 border-t-2 border-gray-200">
          <span class="font-bold text-[#1a365d]">Balance Remaining:</span>
          <span class="text-2xl font-bold text-[#1a365d]">$${registration.balanceRemaining.toFixed(2)}</span>
        </div>
      </div>
      ${registration.balanceRemaining > 0 ? `
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            <strong>Payment Due:</strong> Your balance is due before the event. Make payments anytime in your Group Leader Portal.
          </p>
        </div>
      ` : `
        <div class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm text-green-800 font-medium">
            ✓ Paid in Full - Thank you!
          </p>
        </div>
      `}
    </div>
  </div>

  <!-- Next Steps -->
  <div class="mb-6 border border-gray-200 rounded-xl overflow-hidden">
    <div class="bg-gray-50 px-4 py-3 border-b">
      <h3 class="text-lg font-bold text-[#1a365d]">Next Steps</h3>
    </div>
    <div class="p-6 bg-white">
      <div class="space-y-4">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-8 h-8 bg-[#1a365d] text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
          <div>
            <p class="font-semibold text-[#1a365d]">Complete Liability Forms</p>
            <p class="text-sm text-gray-600">Each participant must complete their form at the Poros liability platform using your access code.</p>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-8 h-8 bg-[#1a365d] text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
          <div>
            <p class="font-semibold text-[#1a365d]">Access Your Group Leader Dashboard</p>
            <p class="text-sm text-gray-600">Sign in to manage your group, make payments, and track liability form completion.</p>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-8 h-8 bg-[#1a365d] text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
          <div>
            <p class="font-semibold text-[#1a365d]">Check-In at the Event</p>
            <p class="text-sm text-gray-600">Bring this QR code (on your phone or printed) for quick check-in at the conference!</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Contact Info -->
  <div class="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
    <div class="flex items-start gap-3">
      <div class="text-green-600 text-xl">✉</div>
      <div>
        <p class="font-semibold text-green-900">Confirmation Email Sent</p>
        <p class="text-sm text-green-800">
          We've sent a confirmation to <strong>${registration.groupLeaderEmail}</strong> with your access code and next steps.
        </p>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="text-center text-xs text-gray-400 pt-6 border-t border-gray-200">
    <p>Registration ID: ${registration.id}</p>
    <p class="mt-1">Generated on ${new Date().toLocaleString()}</p>
    <p class="mt-2 font-medium">Powered by ChiRho Events</p>
  </div>
</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    // Give it a moment to load Tailwind CSS, then print
    setTimeout(() => {
      printWindow.print()
    }, 500)
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
          {/* Organization Logo/Name */}
          <div className="text-center mb-6">
            {registration.organizationLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={registration.organizationLogoUrl}
                alt={registration.organizationName}
                className="h-20 mx-auto object-contain"
              />
            ) : (
              <h2 className="text-2xl font-bold text-navy">{registration.organizationName}</h2>
            )}
          </div>

          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 print:hidden">
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
              <Printer className="mr-2 h-4 w-4" />
              Print Confirmation
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
