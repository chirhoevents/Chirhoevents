'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, FileText, ArrowLeft, CheckCircle, User, Home, Mail } from 'lucide-react'
import { useRegistrationQueue } from '@/hooks/useRegistrationQueue'
import RegistrationTimer from '@/components/RegistrationTimer'
import LoadingScreen from '@/components/LoadingScreen'
import {
  calculateIndividualPrice,
  individualAttendanceLines,
  type IndividualHousingSettings,
  type IndividualPricing,
} from '@/lib/individual-registration'
import { CARD_PAYMENT_DISABLED_MESSAGE, CARD_PAYMENT_DISABLED_TITLE } from '@/lib/event-card-payment-disabled'

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  isOneDayEvent?: boolean
  pricing: IndividualPricing
  settings: IndividualHousingSettings & {
    individualMealsEnabled?: boolean
    registrationInstructions: string | null
    checkPaymentEnabled: boolean
    checkPaymentPayableTo: string | null
    checkPaymentAddress: string | null
    couponsEnabled?: boolean
    porosHousingEnabled?: boolean
    cardPaymentDisabled?: boolean
  }
  dayPassOptions?: Array<{ id: string; name: string; price: number }>
}

interface CouponData {
  id: string
  code: string
  name: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
}

interface RegistrationData {
  firstName: string
  lastName: string
  preferredName: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
  age: string
  gender: string
  ticketType: string
  dayPassOptionId: string
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
  couponCode: string
}

export default function IndividualInvoiceReviewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string

  // Queue management. A waitlist invitation skips the queue, same as on the
  // form page; otherwise invitees get sent back to the waiting room here.
  const {
    loading: queueLoading,
    queueActive,
    expiresAt,
    extensionAllowed,
    markComplete,
  } = useRegistrationQueue(eventId, 'individual', { skip: !!searchParams.get('waitlist') })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCheckModal, setShowCheckModal] = useState(false)
  const [checkAcknowledged, setCheckAcknowledged] = useState(false)

  // Coupon state
  const [validatedCoupon, setValidatedCoupon] = useState<CouponData | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Read custom answers saved by the form page via sessionStorage
  const customAnswers: Array<{ questionId: string; answerText: string }> = (() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = sessionStorage.getItem(`chirho_custom_answers_${eventId}`)
      if (!raw) return []
      const map: Record<string, string> = JSON.parse(raw)
      return Object.entries(map)
        .filter(([, v]) => v && v.trim() !== '')
        .map(([questionId, answerText]) => ({ questionId, answerText }))
    } catch {
      return []
    }
  })()

  function clearCustomAnswers() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`chirho_custom_answers_${eventId}`)
      sessionStorage.removeItem(`chirho_registration_draft_individual_${eventId}`)
    }
  }

  // A card registration is created before the person is sent to Stripe. If
  // they come back without paying and submit again (by check, or card again),
  // release that unpaid one first so they aren't registered twice.
  const pendingCheckoutKey = `chirho_pending_checkout_${eventId}`

  // Returns false if the earlier checkout was in fact paid; in that case the
  // person is sent to its confirmation page instead of registering again.
  async function releasePendingCheckout(): Promise<boolean> {
    let pending: { registrationId?: string } | null = null
    try {
      pending = JSON.parse(sessionStorage.getItem(pendingCheckoutKey) || 'null')
    } catch {
      pending = null
    }
    if (!pending?.registrationId) return true

    try {
      const res = await fetch('/api/registration/abandon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: pending.registrationId, type: 'individual' }),
      })
      if (!res.ok) return true
      const result = await res.json()
      sessionStorage.removeItem(pendingCheckoutKey)
      if (result.status === 'paid') {
        clearCustomAnswers()
        router.push(`/registration/confirmation/individual/${pending.registrationId}`)
        return false
      }
    } catch {
      // Network error: carry on; the old checkout still expires on its own
    }
    return true
  }

  // Get registration data from URL params
  const registrationData: RegistrationData = {
    firstName: searchParams.get('firstName') || '',
    lastName: searchParams.get('lastName') || '',
    preferredName: searchParams.get('preferredName') || '',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
    street: searchParams.get('street') || '',
    city: searchParams.get('city') || '',
    state: searchParams.get('state') || '',
    zip: searchParams.get('zip') || '',
    age: searchParams.get('age') || '',
    gender: searchParams.get('gender') || '',
    ticketType: searchParams.get('ticketType') || 'general_admission',
    dayPassOptionId: searchParams.get('dayPassOptionId') || '',
    housingType: searchParams.get('housingType') || 'on_campus',
    roomType: searchParams.get('roomType') || '',
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
    couponCode: searchParams.get('couponCode') || '',
  }

  const waitlistToken = searchParams.get('waitlist') || ''

  // Stripe's cancel_url lands here with only ?cancelled=true and none of the
  // form fields, so send them back to the form, which restores their saved
  // answers, instead of showing an empty review page.
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      releasePendingCheckout().then(ok => {
        if (ok) router.replace(`/events/${eventId}/register-individual`)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- releasePendingCheckout is recreated every render
  }, [searchParams, router, eventId])

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

  // Validate coupon code if provided
  useEffect(() => {
    async function validateCoupon() {
      if (!registrationData.couponCode || !event?.settings?.couponsEnabled) {
        return
      }

      try {
        const response = await fetch(`/api/events/${eventId}/coupons/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: registrationData.couponCode,
            email: registrationData.email,
          }),
        })

        const data = await response.json()

        if (data.valid) {
          setValidatedCoupon({
            id: data.coupon.id,
            code: data.coupon.code,
            name: data.coupon.name,
            discountType: data.coupon.discountType,
            discountValue: data.coupon.discountValue,
          })
        } else {
          setCouponError(data.error || 'Invalid coupon code')
        }
      } catch {
        setCouponError('Failed to validate coupon')
      }
    }

    if (event) {
      validateCoupon()
    }
  }, [event, eventId, registrationData.couponCode, registrationData.email])

  const selectedDayPass = event?.dayPassOptions?.find(opt => opt.id === registrationData.dayPassOptionId)
  // Meal package add-on chosen on the form (only if the event still offers it)
  const includeMealPackage =
    searchParams.get('mealPackage') === '1' &&
    !!event?.settings.individualMealsEnabled &&
    event?.pricing.individualMealPackagePrice != null

  // Same pricing rules as the registration API, so the total shown is the amount charged
  const calculatePricing = () => {
    if (!event) return { subtotal: 0, couponDiscount: 0, total: 0 }

    const subtotal = calculateIndividualPrice(event.pricing, {
      housingType: registrationData.housingType,
      roomType: registrationData.roomType,
      dayPassOptionPrice: selectedDayPass?.price ?? null,
      includeMealPackage,
    })

    // Calculate coupon discount
    let couponDiscount = 0
    if (validatedCoupon) {
      if (validatedCoupon.discountType === 'percentage') {
        couponDiscount = (subtotal * validatedCoupon.discountValue) / 100
      } else {
        couponDiscount = Math.min(validatedCoupon.discountValue, subtotal)
      }
    }

    const total = Math.max(0, subtotal - couponDiscount)

    return { subtotal, couponDiscount, total }
  }

  const pricing = calculatePricing()
  const attendanceLines = individualAttendanceLines({
    ticketType: registrationData.ticketType,
    housingType: registrationData.housingType,
    roomType: registrationData.roomType,
    housingOffered: !!event?.settings.porosHousingEnabled && !event?.isOneDayEvent,
    dayPassName: selectedDayPass?.name,
    settings: event?.settings,
    includesMealPackage: includeMealPackage,
  })
  // e.g. "123 Main St, Springfield, IL 12345"
  const address = [
    registrationData.street,
    registrationData.city,
    [registrationData.state, registrationData.zip].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
  // Nothing to pay (free event or a full coupon): no card or check needed
  const isFree = !!event && pricing.total <= 0
  // Events with card payments turned off take check payments only
  const cardBlocked = !isFree && !!event?.settings.cardPaymentDisabled

  // Handle credit card payment
  const handleCreditCardPayment = async () => {
    setSubmitting(true)
    setError(null)

    try {
      if (!(await releasePendingCheckout())) return

      const response = await fetch('/api/registration/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...registrationData,
          ...(waitlistToken ? { waitlistToken } : {}),
          age: registrationData.age ? parseInt(registrationData.age) : null,
          paymentMethod: 'card',
          includeMealPackage,
          customAnswers,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Registration failed')
      }

      const result = await response.json()

      // Mark queue session as complete
      await markComplete()

      // Redirect to Stripe checkout. The saved answers are kept until the
      // confirmation page, so cancelling out of Stripe doesn't wipe them.
      if (result.checkoutUrl) {
        if (!waitlistToken) {
          sessionStorage.setItem(
            pendingCheckoutKey,
            JSON.stringify({ registrationId: result.registrationId })
          )
        }
        window.location.href = result.checkoutUrl
      } else {
        clearCustomAnswers()
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
      if (!(await releasePendingCheckout())) return

      const response = await fetch('/api/registration/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...registrationData,
          ...(waitlistToken ? { waitlistToken } : {}),
          age: registrationData.age ? parseInt(registrationData.age) : null,
          paymentMethod: 'check',
          includeMealPackage,
          customAnswers,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Registration failed')
      }

      const result = await response.json()

      // Mark queue session as complete and clear transient answers
      await markComplete()
      clearCustomAnswers()

      router.push(`/registration/confirmation/individual/${result.registrationId}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
      setShowCheckModal(false)
    }
  }

  if (loading || queueLoading) {
    return <LoadingScreen message="Loading registration review..." />
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
      {/* Queue Timer - shows when queue is active */}
      {queueActive && expiresAt && (
        <RegistrationTimer
          expiresAt={expiresAt}
          eventId={eventId}
          registrationType="individual"
          extensionAllowed={extensionAllowed}
        />
      )}

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
                    Attendee Information
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
                    {address && (
                      <div>
                        <span className="text-gray-600">Address:</span>
                        <p className="font-medium text-navy">{address}</p>
                      </div>
                    )}
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
                    Ticket & Accommodations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {attendanceLines.map(line => (
                      <div key={line.label}>
                        <span className="text-gray-600">{line.label}:</span>
                        <p className="font-medium text-navy">{line.value}</p>
                      </div>
                    ))}
                    {registrationData.housingType === 'on_campus' && registrationData.preferredRoommate && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Preferred Roommate:</span>
                        <p className="font-medium text-navy">{registrationData.preferredRoommate}</p>
                      </div>
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
                      <span className="font-medium text-navy">${pricing.subtotal.toFixed(2)}</span>
                    </div>

                    {validatedCoupon && pricing.couponDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Coupon ({validatedCoupon.code}):</span>
                        <span className="font-medium">-${pricing.couponDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {couponError && registrationData.couponCode && (
                      <div className="text-sm text-red-600">
                        Coupon &quot;{registrationData.couponCode}&quot;: {couponError}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-bold text-navy">
                      <span>{cardBlocked ? 'Total Due:' : 'Total Due Today:'}</span>
                      <span className="text-gold">${pricing.total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {isFree ? 'No payment required' : 'Full payment required for individual registrations'}
                    </p>
                  </div>

                  {cardBlocked && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-900">
                      <p className="font-semibold mb-1">{CARD_PAYMENT_DISABLED_TITLE}</p>
                      <p>{CARD_PAYMENT_DISABLED_MESSAGE}</p>
                    </div>
                  )}

                  {/* Payment Buttons */}
                  <div className="space-y-3">
                    {isFree ? (
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
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete Registration
                          </>
                        )}
                      </Button>
                    ) : cardBlocked ? (
                      <Button
                        onClick={() => setShowCheckModal(true)}
                        disabled={submitting}
                        className="w-full bg-navy hover:bg-navy/90 !text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Register &amp; Pay by Check
                      </Button>
                    ) : (
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
                    )}
                  </div>

                  {!cardBlocked && !isFree && (
                    <div className="bg-beige p-4 rounded-md text-xs text-gray-600">
                      <p className="font-semibold mb-1">Secure Payment</p>
                      <p>Your payment is processed securely through Stripe. We never store your credit card information.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Check Payment Modal */}
      {showCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start sm:items-center justify-center p-4">
          <Card className="max-w-md w-full my-4">
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
                  className="flex-1 bg-navy text-white hover:bg-navy/90"
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
        </div>
      )}
    </div>
  )
}
