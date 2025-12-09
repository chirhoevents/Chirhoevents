'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, FileText, ArrowLeft, CheckCircle } from 'lucide-react'

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  pricing: {
    youthEarlyBirdPrice: number
    youthRegularPrice: number
    youthLatePrice: number
    chaperoneEarlyBirdPrice: number
    chaperoneRegularPrice: number
    chaperoneLatePrice: number
    priestPrice: number
    onCampusYouthPrice?: number
    offCampusYouthPrice?: number
    dayPassYouthPrice?: number
    onCampusChaperonePrice?: number
    offCampusChaperonePrice?: number
    dayPassChaperonePrice?: number
    depositAmount: number | null
    depositPercentage: number | null
    requireFullPayment: boolean
    earlyBirdDeadline: string | null
    regularDeadline: string | null
    fullPaymentDeadline: string | null
  }
  settings: {
    registrationInstructions: string | null
    checkPaymentEnabled: boolean
    checkPaymentPayableTo: string | null
    checkPaymentAddress: string | null
  }
}

interface RegistrationData {
  groupName: string
  parishName: string
  dioceseName: string
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  groupLeaderStreet: string
  groupLeaderCity: string
  groupLeaderState: string
  groupLeaderZip: string
  alternativeContact1Name: string
  alternativeContact1Email: string
  alternativeContact1Phone: string
  alternativeContact2Name: string
  alternativeContact2Email: string
  alternativeContact2Phone: string
  youthCount: number
  chaperoneCount: number
  priestCount: number
  housingType: string
  specialRequests: string
}

export default function InvoiceReviewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCheckModal, setShowCheckModal] = useState(false)
  const [checkAcknowledged, setCheckAcknowledged] = useState(false)

  // Get registration data from URL params
  const registrationData: RegistrationData = {
    groupName: searchParams.get('groupName') || '',
    parishName: searchParams.get('parishName') || '',
    dioceseName: searchParams.get('dioceseName') || '',
    groupLeaderName: searchParams.get('groupLeaderName') || '',
    groupLeaderEmail: searchParams.get('groupLeaderEmail') || '',
    groupLeaderPhone: searchParams.get('groupLeaderPhone') || '',
    groupLeaderStreet: searchParams.get('groupLeaderStreet') || '',
    groupLeaderCity: searchParams.get('groupLeaderCity') || '',
    groupLeaderState: searchParams.get('groupLeaderState') || '',
    groupLeaderZip: searchParams.get('groupLeaderZip') || '',
    alternativeContact1Name: searchParams.get('alternativeContact1Name') || '',
    alternativeContact1Email: searchParams.get('alternativeContact1Email') || '',
    alternativeContact1Phone: searchParams.get('alternativeContact1Phone') || '',
    alternativeContact2Name: searchParams.get('alternativeContact2Name') || '',
    alternativeContact2Email: searchParams.get('alternativeContact2Email') || '',
    alternativeContact2Phone: searchParams.get('alternativeContact2Phone') || '',
    youthCount: parseInt(searchParams.get('youthCount') || '0'),
    chaperoneCount: parseInt(searchParams.get('chaperoneCount') || '0'),
    priestCount: parseInt(searchParams.get('priestCount') || '0'),
    housingType: searchParams.get('housingType') || 'on_campus',
    specialRequests: searchParams.get('specialRequests') || '',
  }

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) throw new Error('Event not found')
        const data = await response.json()
        setEvent(data)
      } catch (err) {
        setError('Failed to load event. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [eventId])

  // Calculate pricing with early bird discount
  const calculatePricing = () => {
    if (!event) return { breakdown: [], subtotal: 0, discount: 0, total: 0, deposit: 0, balance: 0, isEarlyBird: false }

    const now = new Date()
    const earlyBirdDeadline = event.pricing.earlyBirdDeadline ? new Date(event.pricing.earlyBirdDeadline) : null
    const isEarlyBird = earlyBirdDeadline && now <= earlyBirdDeadline

    // Determine youth price - housing-specific pricing overrides early bird
    let youthPrice = isEarlyBird ? Number(event.pricing.youthEarlyBirdPrice) : Number(event.pricing.youthRegularPrice)
    if (registrationData.housingType === 'on_campus' && event.pricing.onCampusYouthPrice) {
      youthPrice = Number(event.pricing.onCampusYouthPrice)
    } else if (registrationData.housingType === 'off_campus' && event.pricing.offCampusYouthPrice) {
      youthPrice = Number(event.pricing.offCampusYouthPrice)
    } else if (registrationData.housingType === 'day_pass' && event.pricing.dayPassYouthPrice) {
      youthPrice = Number(event.pricing.dayPassYouthPrice)
    }

    // Determine chaperone price - housing-specific pricing overrides early bird
    let chaperonePrice = isEarlyBird ? Number(event.pricing.chaperoneEarlyBirdPrice) : Number(event.pricing.chaperoneRegularPrice)
    if (registrationData.housingType === 'on_campus' && event.pricing.onCampusChaperonePrice) {
      chaperonePrice = Number(event.pricing.onCampusChaperonePrice)
    } else if (registrationData.housingType === 'off_campus' && event.pricing.offCampusChaperonePrice) {
      chaperonePrice = Number(event.pricing.offCampusChaperonePrice)
    } else if (registrationData.housingType === 'day_pass' && event.pricing.dayPassChaperonePrice) {
      chaperonePrice = Number(event.pricing.dayPassChaperonePrice)
    }

    const breakdown: { label: string; count: number; price: number; subtotal: number }[] = []

    // Youth
    if (registrationData.youthCount > 0) {
      breakdown.push({
        label: 'Youth',
        count: registrationData.youthCount,
        price: youthPrice,
        subtotal: registrationData.youthCount * youthPrice,
      })
    }

    // Chaperones
    if (registrationData.chaperoneCount > 0) {
      breakdown.push({
        label: 'Chaperones',
        count: registrationData.chaperoneCount,
        price: chaperonePrice,
        subtotal: registrationData.chaperoneCount * chaperonePrice,
      })
    }

    // Priests
    if (registrationData.priestCount > 0) {
      breakdown.push({
        label: 'Priests',
        count: registrationData.priestCount,
        price: Number(event.pricing.priestPrice),
        subtotal: registrationData.priestCount * Number(event.pricing.priestPrice),
      })
    }

    const subtotal = breakdown.reduce((sum, item) => sum + item.subtotal, 0)

    // Calculate discount if early bird
    const regularSubtotal = breakdown.reduce((sum, item) => {
      const regularPrice = item.label.includes('Youth')
        ? Number(event.pricing.youthRegularPrice)
        : item.label.includes('Chaperone')
        ? Number(event.pricing.chaperoneRegularPrice)
        : Number(event.pricing.priestPrice)
      return sum + (item.count * regularPrice)
    }, 0)

    const discount = isEarlyBird ? regularSubtotal - subtotal : 0
    const total = subtotal

    // Calculate deposit based on settings
    let deposit = 0
    if (event.pricing.requireFullPayment) {
      deposit = total
    } else if (event.pricing.depositPercentage != null) {
      deposit = (total * Number(event.pricing.depositPercentage)) / 100
    } else if (event.pricing.depositAmount != null) {
      const baseDepositAmount = Number(event.pricing.depositAmount)
      const totalParticipants = registrationData.youthCount + registrationData.chaperoneCount + registrationData.priestCount
      // Access depositPerPerson field (may not be in generated types yet)
      const depositPerPerson = (event.pricing as any).depositPerPerson ?? true
      deposit = depositPerPerson ? baseDepositAmount * totalParticipants : baseDepositAmount
    }

    const balance = total - deposit

    return { breakdown, subtotal, discount, total, deposit, balance, isEarlyBird }
  }

  const pricing = calculatePricing()
  const totalParticipants =
    registrationData.youthCount +
    registrationData.chaperoneCount +
    registrationData.priestCount

  // Handle credit card payment
  const handleCreditCardPayment = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registration/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...registrationData,
          totalParticipants,
          paymentMethod: 'card',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }

      const result = await response.json()

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        router.push(`/registration/confirmation/${result.registrationId}`)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle check payment
  const handleCheckPayment = async () => {
    if (!checkAcknowledged) {
      setError('Please acknowledge that you understand your registration is pending payment.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registration/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...registrationData,
          totalParticipants,
          paymentMethod: 'check',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }

      const result = await response.json()
      router.push(`/registration/confirmation/${result.registrationId}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-beige py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-navy mb-2">Review Your Registration</h1>
            <p className="text-gray-600">{event?.name}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Invoice Section */}
            <div className="lg:col-span-2">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Registration Invoice</CardTitle>
                  <CardDescription>
                    {registrationData.groupName} • {totalParticipants} participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Event Details */}
                    <div className="bg-beige p-4 rounded-md">
                      <h3 className="font-semibold text-navy mb-2">{event?.name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(event?.startDate || '').toLocaleDateString()} -{' '}
                        {new Date(event?.endDate || '').toLocaleDateString()}
                      </p>
                    </div>

                    {/* Itemized Breakdown */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-navy mb-3">Itemized Breakdown</h4>
                      {pricing.breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm mb-2">
                          <span className="text-gray-700">
                            {item.label} ({item.count}) @ ${item.price.toFixed(2)}
                          </span>
                          <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${pricing.subtotal.toFixed(2)}</span>
                      </div>

                      {pricing.isEarlyBird && pricing.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Early Bird Discount:</span>
                          <span className="font-medium">-${pricing.discount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between border-t pt-2">
                        <span className="font-bold text-navy text-lg">Total Due:</span>
                        <span className="font-bold text-navy text-lg">${pricing.total.toFixed(2)}</span>
                      </div>

                      {!event?.pricing.requireFullPayment && (
                        <>
                          <div className="flex justify-between text-gold">
                            <span className="font-semibold">
                              {event?.pricing.depositPercentage
                                ? `Deposit (${event.pricing.depositPercentage}%):`
                                : 'Deposit:'}
                            </span>
                            <span className="font-semibold">${pricing.deposit.toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance Remaining:</span>
                            <span className="font-medium">${pricing.balance.toFixed(2)}</span>
                          </div>

                          {event?.pricing.fullPaymentDeadline && (
                            <p className="text-sm text-gray-600">
                              Balance due by:{' '}
                              {new Date(event.pricing.fullPaymentDeadline).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full mb-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Edit Registration Details
              </Button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Payment Options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-navy text-lg">Choose Payment Method</h3>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCreditCardPayment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Pay by Credit Card (${pricing.deposit.toFixed(2)})
                    </>
                  )}
                </Button>

                {event?.settings.checkPaymentEnabled && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCheckModal(true)}
                    disabled={submitting}
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Pay Later
                  </Button>
                )}
              </div>
            </div>

            {/* Custom Instructions Section */}
            <div className="lg:col-span-1">
              {event?.settings.registrationInstructions && (
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Registration Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {event.settings.registrationInstructions}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Check Payment Modal */}
      {showCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Pay Later Options</CardTitle>
              <CardDescription>Choose how you&apos;d like to complete payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Option 1: Mail a Check */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-navy mb-3 flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Option 1: Mail a Check
                </h4>
                <div className="space-y-2 text-sm ml-7">
                  <p>
                    <strong>Make check payable to:</strong>{' '}
                    {event?.settings.checkPaymentPayableTo || 'Event Organizer'}
                  </p>
                  <p>
                    <strong>Check amount:</strong> ${pricing.deposit.toFixed(2)} (deposit) or $
                    {pricing.total.toFixed(2)} (full payment)
                  </p>
                  {event?.settings.checkPaymentAddress && (
                    <p>
                      <strong>Mail to:</strong>
                      <br />
                      <span className="whitespace-pre-wrap">
                        {event.settings.checkPaymentAddress}
                      </span>
                    </p>
                  )}
                  <p>
                    <strong>Include on check:</strong> {registrationData.groupName}
                  </p>
                </div>
              </div>

              {/* Option 2: Pay Later via Portal */}
              <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-navy mb-3 flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Option 2: Pay Later via Payment Portal
                </h4>
                <div className="space-y-2 text-sm ml-7">
                  <p>
                    You&apos;ll receive an email with your unique access code and a link to the payment portal.
                  </p>
                  <p>
                    You can pay anytime before the event using the portal link. We accept credit cards, ACH, and other payment methods.
                  </p>
                  <p className="text-green-800 font-medium">
                    ✓ More flexible payment options
                    <br />
                    ✓ Pay at your convenience
                    <br />
                    ✓ Easy online payment
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-900">
                  <strong>Important:</strong> Your registration will be marked as &quot;Pending Payment&quot;
                  until your check is received and processed. You will receive an access code, but
                  your registration is not confirmed until payment is received.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="checkAcknowledge"
                  checked={checkAcknowledged}
                  onChange={(e) => setCheckAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="checkAcknowledge" className="text-sm text-gray-700">
                  I understand my registration is not confirmed until payment is received
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCheckModal(false)
                    setCheckAcknowledged(false)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCheckPayment}
                  disabled={!checkAcknowledged || submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Registration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
