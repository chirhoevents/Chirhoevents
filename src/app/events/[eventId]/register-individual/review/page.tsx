'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, FileText, ArrowLeft, CheckCircle, User, Home, Mail } from 'lucide-react'

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  pricing: {
    youthRegularPrice: number
    onCampusYouthPrice?: number
    offCampusYouthPrice?: number
    dayPassYouthPrice?: number
  }
  settings: {
    registrationInstructions: string | null
    checkPaymentEnabled: boolean
    checkPaymentPayableTo: string | null
    checkPaymentAddress: string | null
  }
}

interface RegistrationData {
  firstName: string
  lastName: string
  preferredName: string
  email: string
  phone: string
  age: string
  gender: string
  housingType: string
  roomType: string
  preferredRoommate: string
  tShirtSize: string
  dietaryRestrictions: string
  adaAccommodations: string
  emergencyContact1Name: string
  emergencyContact1Phone: string
  emergencyContact1Relation: string
  emergencyContact2Name: string
  emergencyContact2Phone: string
  emergencyContact2Relation: string
}

export default function IndividualInvoiceReviewPage() {
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
    firstName: searchParams.get('firstName') || '',
    lastName: searchParams.get('lastName') || '',
    preferredName: searchParams.get('preferredName') || '',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
    age: searchParams.get('age') || '',
    gender: searchParams.get('gender') || '',
    housingType: searchParams.get('housingType') || 'on_campus',
    roomType: searchParams.get('roomType') || 'double',
    preferredRoommate: searchParams.get('preferredRoommate') || '',
    tShirtSize: searchParams.get('tShirtSize') || '',
    dietaryRestrictions: searchParams.get('dietaryRestrictions') || '',
    adaAccommodations: searchParams.get('adaAccommodations') || '',
    emergencyContact1Name: searchParams.get('emergencyContact1Name') || '',
    emergencyContact1Phone: searchParams.get('emergencyContact1Phone') || '',
    emergencyContact1Relation: searchParams.get('emergencyContact1Relation') || '',
    emergencyContact2Name: searchParams.get('emergencyContact2Name') || '',
    emergencyContact2Phone: searchParams.get('emergencyContact2Phone') || '',
    emergencyContact2Relation: searchParams.get('emergencyContact2Relation') || '',
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

  // Calculate pricing based on housing type
  const calculatePrice = () => {
    if (!event) return 0

    const { pricing } = event

    // Default to youth regular price
    let basePrice = pricing.youthRegularPrice

    // Adjust based on housing type
    if (registrationData.housingType === 'on_campus' && pricing.onCampusYouthPrice) {
      basePrice = pricing.onCampusYouthPrice
    } else if (registrationData.housingType === 'off_campus' && pricing.offCampusYouthPrice) {
      basePrice = pricing.offCampusYouthPrice
    } else if (registrationData.housingType === 'day_pass' && pricing.dayPassYouthPrice) {
      basePrice = pricing.dayPassYouthPrice
    }

    return basePrice
  }

  const totalPrice = calculatePrice()

  // Handle credit card payment
  const handleCreditCardPayment = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registration/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...registrationData,
          age: registrationData.age ? parseInt(registrationData.age) : null,
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
        router.push(`/registration/confirmation/individual/${result.registrationId}`)
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
      const response = await fetch('/api/registration/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...registrationData,
          age: registrationData.age ? parseInt(registrationData.age) : null,
          paymentMethod: 'check',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }

      const result = await response.json()
      router.push(`/registration/confirmation/individual/${result.registrationId}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
      setShowCheckModal(false)
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-navy mb-2">{event?.name}</h1>
            <p className="text-gray-600">Review Your Registration</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium text-navy">
                        {registrationData.firstName} {registrationData.lastName}
                        {registrationData.preferredName && ` (${registrationData.preferredName})`}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-navy">{registrationData.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-medium text-navy">{registrationData.phone}</p>
                    </div>
                    {registrationData.age && (
                      <div>
                        <span className="text-gray-600">Age:</span>
                        <p className="font-medium text-navy">{registrationData.age}</p>
                      </div>
                    )}
                    {registrationData.gender !== 'prefer_not_to_say' && (
                      <div>
                        <span className="text-gray-600">Gender:</span>
                        <p className="font-medium text-navy capitalize">{registrationData.gender}</p>
                      </div>
                    )}
                    {registrationData.tShirtSize && (
                      <div>
                        <span className="text-gray-600">T-Shirt Size:</span>
                        <p className="font-medium text-navy">{registrationData.tShirtSize}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Housing Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Housing & Room
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Housing Type:</span>
                      <p className="font-medium text-navy capitalize">
                        {registrationData.housingType.replace('_', ' ')}
                      </p>
                    </div>
                    {registrationData.housingType === 'on_campus' && (
                      <>
                        <div>
                          <span className="text-gray-600">Room Type:</span>
                          <p className="font-medium text-navy capitalize">{registrationData.roomType}</p>
                        </div>
                        {registrationData.preferredRoommate && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Preferred Roommate:</span>
                            <p className="font-medium text-navy">{registrationData.preferredRoommate}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {registrationData.dietaryRestrictions && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-gray-600 text-sm">Dietary Restrictions:</span>
                      <p className="font-medium text-navy">{registrationData.dietaryRestrictions}</p>
                    </div>
                  )}

                  {registrationData.adaAccommodations && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-gray-600 text-sm">ADA Accommodations:</span>
                      <p className="font-medium text-navy">{registrationData.adaAccommodations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Emergency Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Primary Contact */}
                  <div>
                    <h4 className="font-semibold text-navy mb-2">Primary Contact</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <p className="font-medium text-navy">{registrationData.emergencyContact1Name}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <p className="font-medium text-navy">{registrationData.emergencyContact1Phone}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Relationship:</span>
                        <p className="font-medium text-navy">{registrationData.emergencyContact1Relation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Contact */}
                  {registrationData.emergencyContact2Name && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-navy mb-2">Secondary Contact</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium text-navy">{registrationData.emergencyContact2Name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium text-navy">{registrationData.emergencyContact2Phone}</p>
                        </div>
                        {registrationData.emergencyContact2Relation && (
                          <div>
                            <span className="text-gray-600">Relationship:</span>
                            <p className="font-medium text-navy">{registrationData.emergencyContact2Relation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Instructions */}
              {event?.settings.registrationInstructions && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Important Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-800 whitespace-pre-wrap">
                      {event.settings.registrationInstructions}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Error Display */}
              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-red-800">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="!text-navy"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Form
                </Button>
              </div>
            </div>

            {/* Payment Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Individual Registration:</span>
                      <span className="font-medium text-navy">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Housing Type:</span>
                      <span className="text-navy capitalize">{registrationData.housingType.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-bold text-navy">
                      <span>Total Due Today:</span>
                      <span className="text-gold">${totalPrice.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Full payment required for individual registrations
                    </p>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleCreditCardPayment}
                      disabled={submitting}
                      className="w-full bg-navy hover:bg-navy/90 !text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay with Credit Card
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-beige p-4 rounded-md text-xs text-gray-600">
                    <p className="font-semibold mb-1">Secure Payment</p>
                    <p>Your payment is processed securely through Stripe. We never store your credit card information.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Check Payment Modal */}
      {showCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Pay Later with Check or Cash</CardTitle>
              <CardDescription>Your registration will be marked as pending payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event?.settings.checkPaymentPayableTo && (
                <div className="bg-beige p-4 rounded-md space-y-2 text-sm">
                  <p><strong>Make checks payable to:</strong></p>
                  <p className="font-medium">{event.settings.checkPaymentPayableTo}</p>

                  {event.settings.checkPaymentAddress && (
                    <>
                      <p className="mt-3"><strong>Mail to:</strong></p>
                      <p className="whitespace-pre-wrap font-medium">{event.settings.checkPaymentAddress}</p>
                    </>
                  )}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="check-acknowledge"
                    checked={checkAcknowledged}
                    onChange={(e) => setCheckAcknowledged(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="check-acknowledge" className="text-sm text-gray-700 cursor-pointer">
                    I understand that my registration is <strong>pending until payment is received</strong>.
                    I will mail my check or bring cash payment as instructed.
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowCheckModal(false)
                    setCheckAcknowledged(false)
                    setError(null)
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCheckPayment}
                  disabled={!checkAcknowledged || submitting}
                  className="flex-1 bg-navy hover:bg-navy/90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Registration
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
