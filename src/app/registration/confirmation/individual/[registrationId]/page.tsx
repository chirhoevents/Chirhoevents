'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, QrCode, Loader2, FileText } from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'

interface RegistrationData {
  id: string
  firstName: string
  lastName: string
  email: string
  qrCode: string
  housingType: string
  roomType?: string
  eventName: string
  totalAmount: number
  paymentStatus: string
  registrationStatus: string
  liabilityFormRequired: boolean
  organizationName: string
  organizationLogoUrl: string | null
}

export default function IndividualConfirmationPage() {
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
        const response = await fetch(`/api/registration/individual/${registrationId}`)
        if (!response.ok) throw new Error('Registration not found')
        const data = await response.json()

        // Convert totalAmount to number (comes from database as string/Decimal)
        if (data.totalAmount) {
          data.totalAmount = Number(data.totalAmount)
        }

        setRegistration(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load registration')
      } finally {
        setLoading(false)
      }
    }
    loadRegistration()
  }, [registrationId, sessionId])

  const handleDownloadQR = () => {
    if (!registration?.qrCode) return

    // Create a download link for the QR code
    const link = document.createElement('a')
    link.href = registration.qrCode
    link.download = `${registration.firstName}-${registration.lastName}-QR-Code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintConfirmation = () => {
    if (!registration) return

    const isPendingPayment = registration.paymentStatus === 'pending_check_payment' ||
                             registration.registrationStatus === 'pending_payment'

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Registration Confirmation - ${registration.firstName} ${registration.lastName}</title>
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
          .participant-name {
            font-size: 28px;
            font-weight: bold;
            color: #1E3A5F;
            margin-bottom: 5px;
          }
          .qr-section {
            text-align: center;
            margin: 25px 0;
            padding: 20px;
            background: white;
            border: 2px solid #1E3A5F;
            border-radius: 12px;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
          }
          .qr-title {
            font-size: 16px;
            font-weight: bold;
            color: #1E3A5F;
            margin-bottom: 15px;
          }
          .qr-code {
            width: 200px;
            height: 200px;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 8px;
            background: white;
          }
          .qr-label {
            font-size: 12px;
            color: #666;
            margin-top: 12px;
          }
          .qr-tip {
            font-size: 11px;
            color: #888;
            margin-top: 8px;
            font-style: italic;
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
          }
          .payment-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-paid {
            background: #dcfce7;
            color: #166534;
          }
          .status-pending {
            background: #fef3c7;
            color: #92400e;
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
          .warning-box {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .warning-box p {
            margin: 0;
            color: #92400e;
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
          <div class="participant-name">${registration.firstName} ${registration.lastName}</div>
          <p style="margin: 0; color: #666;">Welcome to ${registration.eventName}!</p>
        </div>

        ${isPendingPayment ? `
          <div class="warning-box">
            <p><strong>⚠️ Payment Pending:</strong> Your registration is received, but payment is still pending. Please mail your check as instructed in your confirmation email.</p>
          </div>
        ` : ''}

        ${registration.qrCode ? `
          <div class="qr-section">
            <div class="qr-title">Your Check-In QR Code</div>
            <img src="${registration.qrCode}" alt="QR Code" class="qr-code" />
            <p class="qr-label">Scan this QR code at event check-in</p>
            <p class="qr-tip">Save this to your phone or print it for quick check-in!</p>
          </div>
        ` : ''}

        <div class="info-grid">
          <div class="info-box">
            <h3>Personal Information</h3>
            <p><strong>Name:</strong> ${registration.firstName} ${registration.lastName}</p>
            <p><strong>Email:</strong> ${registration.email}</p>
          </div>
          <div class="info-box">
            <h3>Registration Details</h3>
            <p><strong>Housing:</strong> ${registration.housingType.replace('_', ' ')}</p>
            ${registration.roomType ? `<p><strong>Room Type:</strong> ${registration.roomType}</p>` : ''}
          </div>
        </div>

        <h2>Payment Summary</h2>
        <div class="payment-summary">
          <div class="payment-row">
            <span>Total Amount:</span>
            <span>$${registration.totalAmount.toFixed(2)}</span>
          </div>
          <div class="payment-row">
            <span>Payment Status:</span>
            <span class="payment-status ${isPendingPayment ? 'status-pending' : 'status-paid'}">
              ${isPendingPayment ? 'Pending (Check)' : 'Paid'}
            </span>
          </div>
        </div>

        <h2>Next Steps</h2>
        <div class="next-steps">
          ${isPendingPayment ? `
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Mail Your Check</h4>
                <p>Send your payment using the instructions in your confirmation email.</p>
              </div>
            </div>
          ` : ''}
          <div class="step">
            <div class="step-number">${isPendingPayment ? '2' : '1'}</div>
            <div class="step-content">
              <h4>Check Your Email</h4>
              <p>We've sent a confirmation email to ${registration.email} with your QR code and event details.</p>
            </div>
          </div>
          ${registration.liabilityFormRequired ? `
            <div class="step">
              <div class="step-number">${isPendingPayment ? '3' : '2'}</div>
              <div class="step-content">
                <h4>Complete Your Liability Form</h4>
                <p>You'll receive a separate email with instructions to complete your required liability form.</p>
              </div>
            </div>
          ` : ''}
          <div class="step">
            <div class="step-number">${isPendingPayment ? (registration.liabilityFormRequired ? '4' : '3') : (registration.liabilityFormRequired ? '3' : '2')}</div>
            <div class="step-content">
              <h4>Check-In at the Event</h4>
              <p>Bring your QR code (on your phone or printed) for quick check-in at the event!</p>
            </div>
          </div>
        </div>

        <div class="highlight-box">
          <p><strong>Confirmation Email Sent!</strong> We've sent all these details to ${registration.email}. Check your spam folder if you don't see it.</p>
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
            <Button onClick={() => window.location.href = '/'} className="bg-navy hover:bg-navy/90 !text-white">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPending = registration.paymentStatus === 'pending_check_payment' ||
                    registration.registrationStatus === 'pending_payment'

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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-navy mb-2">
              Registration {isPending ? 'Received' : 'Complete'}!
            </h1>
            <p className="text-xl text-gray-600">
              Thank you for registering for {registration.eventName}
            </p>
          </div>

          {/* Pending Payment Warning */}
          {isPending && (
            <Card className="mb-6 bg-yellow-50 border-2 border-yellow-400">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="text-yellow-600 text-xl">⚠️</div>
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      Payment Pending
                    </h3>
                    <p className="text-yellow-800 text-sm">
                      Your registration is complete, but your payment is still pending.
                      Please mail your check as instructed in your confirmation email.
                      Your registration will be confirmed once payment is received.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Card */}
          <Card className="mb-6 border-2 border-gold">
            <CardHeader className="bg-gold-50">
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <QrCode className="h-6 w-6" />
                Your Check-In QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="inline-block bg-white p-4 rounded-lg shadow-sm mb-4">
                  {registration.qrCode && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={registration.qrCode}
                      alt="Registration QR Code"
                      className="max-w-xs mx-auto"
                      style={{ width: '250px', height: '250px' }}
                    />
                  )}
                </div>
                <p className="text-gray-600 mb-4">
                  <strong>Save this QR code!</strong> You&apos;ll need it for check-in at the event.
                </p>
                <Button onClick={handleDownloadQR} className="bg-navy hover:bg-navy/90 !text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  Pro tip: Save this QR code to your phone or print it out for quick check-in!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Registration Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Registration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium text-navy">
                    {registration.firstName} {registration.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium text-navy">{registration.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Housing Type:</span>
                  <p className="font-medium text-navy capitalize">
                    {registration.housingType.replace('_', ' ')}
                  </p>
                </div>
                {registration.roomType && (
                  <div>
                    <span className="text-gray-600">Room Type:</span>
                    <p className="font-medium text-navy capitalize">
                      {registration.roomType}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="text-xl font-bold text-navy">
                    ${registration.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`font-medium ${
                    isPending ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {isPending ? 'Pending (Check)' : 'Paid'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {isPending && (
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-navy text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-navy">Mail Your Check</p>
                      <p className="text-gray-600">
                        Send your payment using the instructions in your confirmation email.
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-navy text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {isPending ? '2' : '1'}
                  </span>
                  <div>
                    <p className="font-semibold text-navy">Check Your Email</p>
                    <p className="text-gray-600">
                      We&apos;ve sent a confirmation email to <strong>{registration.email}</strong> with your QR code and event details.
                    </p>
                  </div>
                </li>
                {registration.liabilityFormRequired && (
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-navy text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {isPending ? '3' : '2'}
                    </span>
                    <div>
                      <p className="font-semibold text-navy">Complete Your Liability Form</p>
                      <p className="text-gray-600">
                        You&apos;ll receive a separate email with instructions to complete your liability form.
                        This is required before the event.
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-navy text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {isPending ? (registration.liabilityFormRequired ? '4' : '3') : (registration.liabilityFormRequired ? '3' : '2')}
                  </span>
                  <div>
                    <p className="font-semibold text-navy">Check-In at the Event</p>
                    <p className="text-gray-600">
                      Bring your QR code (on your phone or printed) for quick check-in at the event.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Questions?</h3>
              <p className="text-blue-800 text-sm">
                If you have any questions about your registration, please reply to your confirmation email
                or contact the event organizer. We&apos;re here to help!
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={handlePrintConfirmation}>
              <Download className="h-4 w-4 mr-2" />
              Print Confirmation
            </Button>
            <Button onClick={() => window.location.href = '/'} className="bg-navy hover:bg-navy/90 !text-white">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
