'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Printer, Mail, Loader2, AlertTriangle, Copy, Check } from 'lucide-react'
import '@/styles/print-receipt.css'
import LoadingScreen from '@/components/LoadingScreen'

interface RegistrationData {
  id: string
  groupName: string
  accessCode?: string
  qrCode?: string | null
  groupLeaderEmail?: string
  totalParticipants: number
  eventName: string
  eventId: string
  depositPaid?: number
  totalAmount?: number
  balanceRemaining?: number
  registrationStatus: string
  organizationName: string
  organizationLogoUrl?: string | null
  organizationContactEmail?: string | null
  organizationContactPhone?: string | null
  housingType?: string | null
}

export default function ConfirmationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const registrationId = params.registrationId as string
  const sessionId = searchParams.get('session_id')

  // Essential data passed via Stripe success_url query params (available without auth)
  const urlAccessCode = searchParams.get('access_code') || undefined
  const urlGroupName = searchParams.get('group_name') || undefined
  const urlParticipants = searchParams.get('participants') ? Number(searchParams.get('participants')) : undefined
  const urlAmountPaid = searchParams.get('amount_paid') ? Number(searchParams.get('amount_paid')) : undefined
  const urlHousing = searchParams.get('housing') || undefined

  const [loading, setLoading] = useState(true)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messageCopied, setMessageCopied] = useState(false)

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

  // Merge URL params with API data — URL params are always available even for unauthenticated users
  const accessCode = registration?.accessCode ?? urlAccessCode
  const groupName = registration?.groupName ?? urlGroupName ?? 'Your Group'
  const totalParticipants = registration?.totalParticipants ?? urlParticipants ?? 0
  const depositPaid = registration?.depositPaid ?? urlAmountPaid ?? 0
  const totalAmount = registration?.totalAmount ?? urlAmountPaid ?? 0
  const balanceRemaining = registration?.balanceRemaining ?? (totalAmount - depositPaid)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

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
        <p class="text-4xl font-bold text-[#1a365d] font-mono tracking-[0.2em]">${accessCode || 'See confirmation email'}</p>
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
          <span class="font-semibold text-gray-800">$${totalAmount.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-green-600">
          <span>Deposit Paid:</span>
          <span class="font-semibold">-$${depositPaid.toFixed(2)}</span>
        </div>
        <div class="flex justify-between pt-3 border-t-2 border-gray-200">
          <span class="font-bold text-[#1a365d]">Balance Remaining:</span>
          <span class="text-2xl font-bold text-[#1a365d]">$${balanceRemaining.toFixed(2)}</span>
        </div>
      </div>
      ${balanceRemaining > 0 ? `
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

                {/* Access Code — always shown, sourced from URL params if API response is stripped */}
                {accessCode ? (
                  <>
                    <div className="inline-block bg-white px-8 py-6 rounded-lg border-4 border-gold mb-4 shadow-md">
                      <p className="text-sm text-gray-600 mb-1 uppercase tracking-wider">Your Group Access Code</p>
                      <p className="text-4xl font-bold text-navy font-mono tracking-wider">
                        {accessCode}
                      </p>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      Save this code! You&apos;ll need it to complete liability forms and access your group portal.
                    </p>
                  </>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                    <p className="text-amber-800 text-sm font-medium">
                      Your access code was sent to your confirmation email. Check your inbox (and spam folder).
                    </p>
                  </div>
                )}
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
                  <p className="font-semibold text-navy">{groupName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Participants</p>
                  <p className="font-semibold text-navy">{totalParticipants}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Registration Cost:</span>
                  <span className="font-semibold">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Deposit Paid:</span>
                  <span className="font-semibold">-${depositPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-navy">Balance Remaining:</span>
                  <span className="font-bold text-navy text-xl">
                    ${balanceRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              {balanceRemaining > 0 && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Payment Due:</strong> Your balance of ${balanceRemaining.toFixed(2)} is due before the event.
                    You can make payments anytime using your access code in the Group Leader Portal.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liability Forms — High-Priority Callout */}
          {accessCode && (
            <Card className="mb-6 border-2 border-red-500 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-6 w-6" />
                  Liability Forms — Required for EVERY Participant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 mb-3">
                  <strong>Every single person in your group must complete a liability form before the event.</strong>{' '}
                  Use Step 2 below to share the link with all your participants — they&apos;ll enter your group code{' '}
                  <strong className="font-mono">{accessCode}</strong> to fill out their form.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Your registration will not be fully confirmed until all participants have submitted their liability forms.
                </p>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => window.open(`/poros?code=${accessCode}`, '_blank')}
                >
                  Open Liability Form Page
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Share With Your Group — Message Template */}
          {accessCode && (() => {
            const porosUrl = `${appUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/poros?code=${accessCode}`
            const messageTemplate = `Hey! You're signed up for ${registration.eventName} with our group ${groupName}. Please fill out your liability form before the event (takes ~5 min, required for everyone): ${porosUrl}`

            const handleCopyMessage = async () => {
              try {
                await navigator.clipboard.writeText(messageTemplate)
                setMessageCopied(true)
                setTimeout(() => setMessageCopied(false), 2500)
              } catch {
                // Clipboard API can fail in non-secure contexts — fall back to a manual prompt
                window.prompt('Copy this message:', messageTemplate)
              }
            }

            return (
              <Card className="mb-6 border-2 border-navy">
                <CardHeader>
                  <CardTitle className="text-navy">Share With Your Group</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">
                    Copy this message and send it to every participant by text, email, or group chat:
                  </p>
                  <div className="bg-gray-50 border border-dashed border-gray-400 rounded-md p-4 text-sm text-gray-900 whitespace-pre-wrap break-words mb-3">
                    {messageTemplate}
                  </div>
                  <Button
                    onClick={handleCopyMessage}
                    className={messageCopied ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-navy hover:bg-navy/90 text-white'}
                  >
                    {messageCopied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Message to Clipboard
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-3">
                    Tip: Each participant only needs the link — your group code is already included in it.
                  </p>
                </CardContent>
              </Card>
            )
          })()}

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
                    <p className="font-semibold text-navy">Link Your Group Leader Account</p>
                    <ol className="text-sm text-gray-600 mt-1 space-y-1 list-none">
                      <li>Go to <strong>{appUrl || window?.location?.origin}/sign-in</strong></li>
                      <li>Create your account or sign in</li>
                      <li>Enter your access code: <strong className="font-mono text-navy">{accessCode || '(see confirmation email)'}</strong></li>
                      <li>You&apos;ll now have full access to manage your group</li>
                    </ol>
                    {accessCode && (
                      <Button
                        variant="outline"
                        className="mt-2"
                        size="sm"
                        onClick={() => window.open(`/sign-in?portal=group-leader&code=${encodeURIComponent(accessCode)}`, '_blank')}
                      >
                        Go to Group Leader Portal
                      </Button>
                    )}
                  </div>
                </li>

                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Check-In Information Coming Soon</p>
                    <p className="text-sm text-gray-600">
                      You will receive an email with your QR code for check-in and further instructions closer to the event.
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
                  {registration?.groupLeaderEmail
                    ? <>We&apos;ve sent a confirmation email to <strong>{registration.groupLeaderEmail}</strong> with your access code, payment receipt, and next steps. Check your spam folder if you don&apos;t see it.</>
                    : <>A confirmation email with your access code and next steps has been sent to your registration email address. Check your spam folder if you don&apos;t see it.</>
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Organization Contact Info */}
          {(registration?.organizationContactEmail || registration?.organizationContactPhone) && (
            <Card className="mt-4 bg-gray-50 border-gray-200">
              <CardContent className="p-6">
                <p className="font-semibold text-gray-800 mb-2">Need Help?</p>
                <p className="text-sm text-gray-600">
                  Contact <strong>{registration.organizationName}</strong>:
                  {registration.organizationContactEmail && (
                    <> <a href={`mailto:${registration.organizationContactEmail}`} className="text-navy underline">{registration.organizationContactEmail}</a></>
                  )}
                  {registration.organizationContactPhone && (
                    <> · {registration.organizationContactPhone}</>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center print:hidden">
            <Button size="lg" variant="outline" onClick={handleDownloadReceipt}>
              <Printer className="mr-2 h-4 w-4" />
              Print Confirmation
            </Button>
            {accessCode && (
              <Button
                size="lg"
                onClick={() => window.open(`/sign-in?portal=group-leader&code=${encodeURIComponent(accessCode)}`, '_blank')}
              >
                Access Group Portal
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
