'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, QrCode, Loader2, FileText } from 'lucide-react'

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
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" />
              Print This Page
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
