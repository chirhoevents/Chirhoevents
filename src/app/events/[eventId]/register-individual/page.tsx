'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { useRegistrationQueue } from '@/hooks/useRegistrationQueue'
import { useSessionDraft } from '@/hooks/useSessionDraft'
import LoadingScreen from '@/components/LoadingScreen'
import RegistrationTimer from '@/components/RegistrationTimer'
import CustomQuestionRenderer, {
  type CustomQuestion,
  type CustomAnswersMap,
} from '@/components/registration/CustomQuestionRenderer'
import {
  calculateIndividualPrice,
  individualAttendanceLines,
  individualHousingOptions,
  type IndividualHousingSettings,
  type IndividualPricing,
} from '@/lib/individual-registration'

interface EventPricing extends IndividualPricing {
  youthRegularPrice: number
  chaperoneRegularPrice: number
  onCampusYouthPrice?: number
  offCampusYouthPrice?: number
  dayPassYouthPrice?: number
  onCampusChaperonePrice?: number
  offCampusChaperonePrice?: number
  dayPassChaperonePrice?: number
}

interface EventSettings extends IndividualHousingSettings {
  couponsEnabled?: boolean
  individualMealsEnabled?: boolean
  individualRegistrationEnabled?: boolean
  liabilityFormsRequiredIndividual?: boolean
  allowDayPass?: boolean
  allowOnCampus?: boolean
  allowOffCampus?: boolean
  porosHousingEnabled?: boolean
  allowSingleRoom?: boolean
  allowDoubleRoom?: boolean
  allowTripleRoom?: boolean
  allowQuadRoom?: boolean
}

// Details a family shares, carried over when registering another family
// member in the same tab. The attendee's own details are never carried over.
const HOUSEHOLD_FIELDS = [
  'email',
  'phone',
  'street',
  'city',
  'state',
  'zip',
  'emergencyContact1Name',
  'emergencyContact1Phone',
  'emergencyContact1Relation',
  'emergencyContact2Name',
  'emergencyContact2Phone',
  'emergencyContact2Relation',
] as const

interface DayPassOption {
  id: string
  date: string
  name: string
  capacity: number
  remaining: number
  price: number
  isActive: boolean
}

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  isOneDayEvent?: boolean
  pricing: EventPricing
  settings?: EventSettings
  dayPassOptions?: DayPassOption[]
  registrationOpenDate?: string
  registrationCloseDate?: string
  isRegistrationOpen?: boolean
}

export default function IndividualRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string
  const waitlistToken = searchParams?.get('waitlist') || ''
  const registeringAnother = searchParams?.get('another') === '1'
  const householdKey = `chirho_household_${eventId}`

  // Queue management
  const {
    loading: queueLoading,
    queueActive,
    isBlocked,
    expiresAt,
    extensionAllowed,
    markComplete,
    checkQueue,
  } = useRegistrationQueue(eventId, 'individual', { skip: !!waitlistToken })

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Coupon verification state
  const [verifyingCoupon, setVerifyingCoupon] = useState(false)
  const [couponVerified, setCouponVerified] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponData, setCouponData] = useState<{
    name: string
    discountType: string
    discountValue: number
  } | null>(null)

  // Form state
  // Saved to sessionStorage so going Next → Back doesn't wipe what was typed
  const [formData, setFormData, draftRestored] = useSessionDraft(`chirho_registration_draft_individual_${eventId}`, {
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    ticketType: 'general_admission' as 'general_admission' | 'day_pass',
    dayPassOptionId: '',
    wantsHousing: true, // For general admission: do they want housing?
    housingType: 'on_campus',
    roomType: 'double',
    preferredRoommate: '',
    includeMealPackage: false,
    tShirtSize: '',
    dietaryRestrictions: '',
    adaAccommodations: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relation: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relation: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    couponCode: '',
  })

  // "Register another family member": start from the household details of
  // the registration just made in this tab, then drop the flag from the URL so
  // coming Back from the review page doesn't overwrite edits
  const [prefilledFromHousehold, setPrefilledFromHousehold] = useState(false)
  useEffect(() => {
    if (!draftRestored || !registeringAnother) return
    try {
      const saved = JSON.parse(sessionStorage.getItem(householdKey) || 'null')
      if (saved && typeof saved === 'object') {
        const household = Object.fromEntries(
          HOUSEHOLD_FIELDS.filter(field => typeof saved[field] === 'string').map(field => [field, saved[field]])
        )
        setFormData(prev => ({ ...prev, ...household }))
        setPrefilledFromHousehold(true)
      }
    } catch {
      // Nothing saved or storage unavailable: start blank
    }
    router.replace(`/events/${eventId}/register-individual`)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once, right after the draft is restored
  }, [draftRestored])

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [customAnswers, setCustomAnswers] = useSessionDraft<CustomAnswersMap>(
    `chirho_custom_answers_${eventId}`,
    {}
  )

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

  // Load custom questions for individual registration
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch(`/api/events/${eventId}/registration-questions?type=individual`)
        if (!res.ok) return
        const data = await res.json()
        setCustomQuestions(data.questions ?? [])
      } catch {
        // Non-fatal: custom questions are supplemental
      }
    }
    loadQuestions()
  }, [eventId])

  // Housing choices only show for multi-day events with housing turned on;
  // everyone else is registered as off-campus with no room.
  const housingOffered = !!event?.settings?.porosHousingEnabled && !event?.isOneDayEvent
  // Youth event: under-18 attendees need a parent-signed liability form
  const isYouthEvent = !!event?.settings?.liabilityFormsRequiredIndividual
  // What the organizer allows: on-campus and/or off-campus, which room types,
  // and which are already full
  const housingOptions = individualHousingOptions(event?.settings)
  const availableRooms = housingOptions.rooms.filter(room => !room.full)
  const onCampusAvailable =
    housingOptions.onCampusAllowed && !housingOptions.onCampusFull && availableRooms.length > 0
  // Off-campus not allowed: on-campus housing is required, not optional
  const housingRequired = !housingOptions.offCampusAllowed
  const effectiveHousingType =
    formData.ticketType === 'day_pass'
      ? 'day_pass'
      : housingOffered && onCampusAvailable && (formData.wantsHousing || housingRequired)
        ? 'on_campus'
        : 'off_campus'
  const chosenRoomAvailable = availableRooms.some(room => room.value === formData.roomType)
  const effectiveRoomType = effectiveHousingType === 'on_campus'
    ? (chosenRoomAvailable ? formData.roomType : availableRooms[0]?.value ?? '')
    : ''
  // Keep the room picker on a room type that's still open
  useEffect(() => {
    if (event && availableRooms.length > 0 && !chosenRoomAvailable) {
      setFormData(prev => ({ ...prev, roomType: availableRooms[0].value }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- availableRooms is derived from event
  }, [event, chosenRoomAvailable])

  // Optional meal package add-on, when the organizer offers one
  const mealPackageOffered =
    !!event?.settings?.individualMealsEnabled && event?.pricing?.individualMealPackagePrice != null
  const includeMealPackage = mealPackageOffered && !!formData.includeMealPackage
  const selectedDayPass = formData.ticketType === 'day_pass'
    ? event?.dayPassOptions?.find(opt => opt.id === formData.dayPassOptionId)
    : undefined

  // Same pricing rules as the registration API, so the price shown is the price charged
  const totalPrice = event
    ? calculateIndividualPrice(event.pricing, {
        housingType: effectiveHousingType,
        roomType: effectiveRoomType,
        dayPassOptionPrice: selectedDayPass?.price ?? null,
        includeMealPackage,
      })
    : 0

  // Verify coupon code
  const verifyCoupon = async () => {
    if (!formData.couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }

    setVerifyingCoupon(true)
    setCouponError(null)
    setCouponVerified(false)
    setCouponData(null)

    try {
      const response = await fetch(`/api/events/${eventId}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.couponCode,
          email: formData.email,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        setCouponVerified(true)
        setCouponData({
          name: data.coupon.name,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
        })
      } else {
        setCouponError(data.error || 'Invalid coupon code')
      }
    } catch {
      setCouponError('Failed to verify coupon. Please try again.')
    } finally {
      setVerifyingCoupon(false)
    }
  }

  // A restored draft keeps the coupon code but not its "verified" badge,
  // which made people think they had to apply it again. Re-check it once.
  useEffect(() => {
    if (draftRestored && formData.couponCode.trim()) verifyCoupon()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once, right after the draft is restored
  }, [draftRestored])

  // Handle form submission - navigate to review page
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Build URL with all form data as query parameters
    const params = new URLSearchParams({
      firstName: formData.firstName,
      lastName: formData.lastName,
      preferredName: formData.preferredName,
      email: formData.email,
      phone: formData.phone,
      street: formData.street,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      age: formData.age,
      gender: formData.gender,
      ticketType: formData.ticketType,
      dayPassOptionId: formData.dayPassOptionId,
      housingType: effectiveHousingType,
      roomType: effectiveRoomType,
      preferredRoommate: effectiveHousingType === 'on_campus' ? formData.preferredRoommate : '',
      ...(includeMealPackage ? { mealPackage: '1' } : {}),
      tShirtSize: formData.tShirtSize,
      dietaryRestrictions: formData.dietaryRestrictions,
      adaAccommodations: formData.adaAccommodations,
      emergencyContact1Name: formData.emergencyContact1Name,
      emergencyContact1Phone: formData.emergencyContact1Phone,
      emergencyContact1Relation: formData.emergencyContact1Relation,
      emergencyContact2Name: formData.emergencyContact2Name,
      emergencyContact2Phone: formData.emergencyContact2Phone,
      emergencyContact2Relation: formData.emergencyContact2Relation,
      couponCode: formData.couponCode,
      ...(waitlistToken ? { waitlist: waitlistToken } : {}),
    })

    // Remember the household details for "Register another family member"
    try {
      sessionStorage.setItem(
        householdKey,
        JSON.stringify(Object.fromEntries(HOUSEHOLD_FIELDS.map(field => [field, formData[field]])))
      )
    } catch {
      // Non-fatal: the next family member just starts from a blank form
    }

    // Persist custom answers in sessionStorage so the review page can include them
    sessionStorage.setItem(
      `chirho_custom_answers_${eventId}`,
      JSON.stringify(customAnswers)
    )

    router.push(`/events/${eventId}/register-individual/review?${params.toString()}`)
  }

  if (loading || queueLoading) {
    return <LoadingScreen message="Loading registration..." />
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

  if (event && event.settings?.individualRegistrationEnabled === false && !waitlistToken) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-navy mb-2">Individual Registration Not Available</h2>
            <p className="text-gray-600 mb-4">
              {event.name} doesn&apos;t accept individual registrations. Please contact the event organizer.
            </p>
            <Button onClick={() => router.push(`/events/${eventId}`)} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              Back to Event
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if registration is not open
  // Same waitlist-token bypass as the group page: a valid invitation is the
  // point of the whole waitlist mechanic — don't block it at the client gate.
  if (event && event.isRegistrationOpen === false && !waitlistToken) {
    const now = new Date()
    const openDate = event.registrationOpenDate ? new Date(event.registrationOpenDate) : null
    const closeDate = event.registrationCloseDate ? new Date(event.registrationCloseDate) : null
    const hasNotOpened = openDate && now < openDate
    const hasClosed = closeDate && now >= closeDate

    return (
      <div className="min-h-screen bg-beige flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-navy mb-2">
              {hasNotOpened ? 'Registration Not Yet Open' : 'Registration Closed'}
            </h2>
            <p className="text-gray-600 mb-4">
              {hasNotOpened && openDate
                ? `Registration for ${event.name} opens on ${openDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${openDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`
                : hasClosed
                  ? `Registration for ${event.name} has closed.`
                  : `Registration is not currently open for ${event.name}.`}
            </p>
            <Button onClick={() => router.push('/')} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Block access if user should be in the queue
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-navy mb-2">Registration at Capacity</h2>
            <p className="text-gray-600 mb-6">
              The registration system is currently at capacity. Please join the virtual queue to wait for an available spot.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push(`/events/${eventId}/queue?type=individual`)}
                className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
              >
                Join Virtual Queue
              </Button>
              <Button
                variant="outline"
                onClick={() => checkQueue()}
                className="w-full"
              >
                Check Again
              </Button>
            </div>
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
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-navy mb-2">{event?.name}</h1>
            <p className="text-gray-600">Individual Registration</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Attendee Information</CardTitle>
                    <CardDescription>
                      {isYouthEvent
                        ? "Enter the details of the person attending. Registering your child? Enter your child's name, age and details, and use your own email and phone so we can reach you."
                        : 'Enter the details of the person attending.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {prefilledFromHousehold && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
                        We filled in the email, phone, address and emergency contacts from your last registration.
                        Check them, then enter this attendee&apos;s own details.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="John"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Preferred Name (Optional)
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.preferredName}
                        onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                        placeholder="Johnny"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@example.com"
                        />
                        {isYouthEvent && (
                          <p className="text-xs text-gray-500 mt-1">
                            For a child, use a parent&apos;s email. The confirmation and the parent liability form link are sent here.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Springfield"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          State *
                        </label>
                        <select
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        >
                          <option value="">Select State</option>
                          <option value="AL">Alabama</option>
                          <option value="AK">Alaska</option>
                          <option value="AZ">Arizona</option>
                          <option value="AR">Arkansas</option>
                          <option value="CA">California</option>
                          <option value="CO">Colorado</option>
                          <option value="CT">Connecticut</option>
                          <option value="DE">Delaware</option>
                          <option value="FL">Florida</option>
                          <option value="GA">Georgia</option>
                          <option value="HI">Hawaii</option>
                          <option value="ID">Idaho</option>
                          <option value="IL">Illinois</option>
                          <option value="IN">Indiana</option>
                          <option value="IA">Iowa</option>
                          <option value="KS">Kansas</option>
                          <option value="KY">Kentucky</option>
                          <option value="LA">Louisiana</option>
                          <option value="ME">Maine</option>
                          <option value="MD">Maryland</option>
                          <option value="MA">Massachusetts</option>
                          <option value="MI">Michigan</option>
                          <option value="MN">Minnesota</option>
                          <option value="MS">Mississippi</option>
                          <option value="MO">Missouri</option>
                          <option value="MT">Montana</option>
                          <option value="NE">Nebraska</option>
                          <option value="NV">Nevada</option>
                          <option value="NH">New Hampshire</option>
                          <option value="NJ">New Jersey</option>
                          <option value="NM">New Mexico</option>
                          <option value="NY">New York</option>
                          <option value="NC">North Carolina</option>
                          <option value="ND">North Dakota</option>
                          <option value="OH">Ohio</option>
                          <option value="OK">Oklahoma</option>
                          <option value="OR">Oregon</option>
                          <option value="PA">Pennsylvania</option>
                          <option value="RI">Rhode Island</option>
                          <option value="SC">South Carolina</option>
                          <option value="SD">South Dakota</option>
                          <option value="TN">Tennessee</option>
                          <option value="TX">Texas</option>
                          <option value="UT">Utah</option>
                          <option value="VT">Vermont</option>
                          <option value="VA">Virginia</option>
                          <option value="WA">Washington</option>
                          <option value="WV">West Virginia</option>
                          <option value="WI">Wisconsin</option>
                          <option value="WY">Wyoming</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          required
                          pattern="[0-9]{5}"
                          title="Please enter a 5-digit ZIP code"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.zip}
                          onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                          placeholder="12345"
                          maxLength={5}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Age *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          placeholder={isYouthEvent ? "Attendee's age" : '25'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Gender *
                        </label>
                        <select
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          T-Shirt Size *
                        </label>
                        <select
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.tShirtSize}
                          onChange={(e) => setFormData({ ...formData, tShirtSize: e.target.value })}
                        >
                          <option value="">Select size</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="2XL">2XL</option>
                          <option value="3XL">3XL</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Type Selection */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Ticket Type</CardTitle>
                    <CardDescription>Select your registration type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ticket Type Selection */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-navy mb-2">
                        Select Ticket Type *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* General Admission Option */}
                        <div
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.ticketType === 'general_admission'
                              ? 'border-gold bg-gold/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setFormData({ ...formData, ticketType: 'general_admission', dayPassOptionId: '' })}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="ticketType"
                              value="general_admission"
                              checked={formData.ticketType === 'general_admission'}
                              onChange={() => setFormData({ ...formData, ticketType: 'general_admission', dayPassOptionId: '' })}
                              className="w-4 h-4 text-gold"
                            />
                            <div>
                              <p className="font-semibold text-navy">General Admission</p>
                              <p className="text-sm text-gray-600">Full event access</p>
                            </div>
                          </div>
                        </div>

                        {/* Day Pass Option - Only show if day pass is enabled */}
                        {event?.settings?.allowDayPass && event.dayPassOptions && event.dayPassOptions.length > 0 && (
                          <div
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              formData.ticketType === 'day_pass'
                                ? 'border-gold bg-gold/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setFormData({ ...formData, ticketType: 'day_pass', wantsHousing: false })}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="ticketType"
                                value="day_pass"
                                checked={formData.ticketType === 'day_pass'}
                                onChange={() => setFormData({ ...formData, ticketType: 'day_pass', wantsHousing: false })}
                                className="w-4 h-4 text-gold"
                              />
                              <div>
                                <p className="font-semibold text-navy">Day Pass</p>
                                <p className="text-sm text-gray-600">Single day attendance (no housing)</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Day Pass Option Selection */}
                    {formData.ticketType === 'day_pass' && event?.dayPassOptions && event.dayPassOptions.length > 0 && (
                      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <label className="block text-sm font-medium text-amber-900 mb-2">
                          Select Day Pass *
                        </label>
                        <select
                          required
                          className="w-full px-4 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold bg-white"
                          value={formData.dayPassOptionId}
                          onChange={(e) => setFormData({ ...formData, dayPassOptionId: e.target.value })}
                        >
                          <option value="">Select a day pass option</option>
                          {event.dayPassOptions
                            .filter(opt => opt.isActive && opt.remaining > 0)
                            .map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} - ${option.price} ({option.remaining} spots left)
                              </option>
                            ))}
                        </select>
                        <p className="text-sm text-amber-700 mt-2">
                          Day pass attendees do not require housing arrangements.
                        </p>
                      </div>
                    )}

                    {/* Housing Options - Only for General Admission on multi-day events */}
                    {formData.ticketType === 'general_admission' && housingOffered && (
                      <div className="border-t pt-4 mt-4">
                        <label className="block text-sm font-medium text-navy mb-3">
                          Housing Preference
                        </label>

                        {/* Housing toggle: hidden when on-campus isn't possible or is required */}
                        {onCampusAvailable && !housingRequired && (
                          <div className="flex items-center space-x-3 mb-4">
                            <input
                              type="checkbox"
                              id="wantsHousing"
                              checked={formData.wantsHousing}
                              onChange={(e) => setFormData({
                                ...formData,
                                wantsHousing: e.target.checked,
                                housingType: e.target.checked ? 'on_campus' : 'off_campus'
                              })}
                              className="w-4 h-4 text-gold border-gray-300 rounded"
                            />
                            <label htmlFor="wantsHousing" className="text-sm text-gray-700">
                              I need on-campus housing
                            </label>
                          </div>
                        )}
                        {onCampusAvailable && housingRequired && (
                          <p className="text-sm text-gray-700 mb-4">
                            On-campus housing is required for this event. Choose your room type:
                          </p>
                        )}

                        {/* Room Type Selection - Only if staying on campus */}
                        {effectiveHousingType === 'on_campus' && (
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-navy mb-2">
                                Room Type *
                              </label>
                              <select
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                                value={effectiveRoomType}
                                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                              >
                                {housingOptions.rooms.map(room => {
                                  const price = event?.pricing?.[`${room.value}RoomPrice` as 'singleRoomPrice']
                                  return (
                                    <option key={room.value} value={room.value} disabled={room.full}>
                                      {room.label}{price ? ` (+$${price})` : ''}{room.full ? ' — Full' : ''}
                                    </option>
                                  )
                                })}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-navy mb-2">
                                Preferred Roommate (Optional)
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                                value={formData.preferredRoommate}
                                onChange={(e) => setFormData({ ...formData, preferredRoommate: e.target.value })}
                                placeholder="Jane Smith"
                              />
                              <p className="text-sm text-gray-500 mt-1">
                                Enter the name of someone you&apos;d like to room with (they must also register individually)
                              </p>
                            </div>
                          </div>
                        )}

                        {effectiveHousingType !== 'on_campus' && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {!onCampusAvailable && housingOptions.onCampusAllowed
                              ? 'On-campus housing is full. '
                              : ''}
                            {housingRequired && !onCampusAvailable
                              ? 'Please contact the event organizer about housing before registering.'
                              : 'You will arrange your own accommodations off-campus.'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meal package add-on */}
                    {mealPackageOffered && (
                      <div className="border-t pt-4 mt-4 flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="includeMealPackage"
                          checked={!!formData.includeMealPackage}
                          onChange={(e) => setFormData({ ...formData, includeMealPackage: e.target.checked })}
                          className="w-4 h-4 mt-1 text-gold border-gray-300 rounded"
                        />
                        <label htmlFor="includeMealPackage" className="text-sm text-gray-700">
                          <span className="font-medium text-navy">Add the meal package</span>{' '}
                          (+${Number(event?.pricing?.individualMealPackagePrice ?? 0).toFixed(2)}) — all event meals
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dietary & Accommodations */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Dietary Restrictions & Accommodations</CardTitle>
                    <CardDescription>Help us serve you better</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Dietary Restrictions (Optional)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.dietaryRestrictions}
                        onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                        placeholder="Vegetarian, gluten-free, peanut allergy, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        ADA Accommodations (Optional)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.adaAccommodations}
                        onChange={(e) => setFormData({ ...formData, adaAccommodations: e.target.value })}
                        placeholder="Wheelchair accessible room, hearing assistance, etc."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contacts */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Emergency Contacts</CardTitle>
                    <CardDescription>Who should we contact in case of emergency?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Emergency Contact 1 */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-navy">Primary Contact *</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.emergencyContact1Name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact1Name: e.target.value })}
                            placeholder="Jane Doe"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.emergencyContact1Phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact1Phone: e.target.value })}
                            placeholder="(555) 987-6543"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Relationship *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.emergencyContact1Relation}
                            onChange={(e) => setFormData({ ...formData, emergencyContact1Relation: e.target.value })}
                            placeholder="Mother"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact 2 */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-navy">Secondary Contact (Optional)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.emergencyContact2Name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact2Name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.emergencyContact2Phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact2Phone: e.target.value })}
                            placeholder="(555) 123-9876"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Relationship
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.emergencyContact2Relation}
                            onChange={(e) => setFormData({ ...formData, emergencyContact2Relation: e.target.value })}
                            placeholder="Father"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Coupon Code - only show if enabled */}
                {event?.settings?.couponsEnabled && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg text-navy">Coupon Code</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Coupon Code (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className={`flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-gold focus:border-gold ${
                              couponVerified
                                ? 'border-green-500 bg-green-50'
                                : couponError
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                            value={formData.couponCode}
                            onChange={(e) => {
                              setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })
                              setCouponVerified(false)
                              setCouponError(null)
                              setCouponData(null)
                            }}
                            placeholder="Enter coupon code"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={verifyCoupon}
                            disabled={verifyingCoupon || !formData.couponCode.trim()}
                            className="whitespace-nowrap"
                          >
                            {verifyingCoupon ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              'Verify Code'
                            )}
                          </Button>
                        </div>
                        {couponError && (
                          <p className="mt-2 text-sm text-red-600">{couponError}</p>
                        )}
                        {couponVerified && couponData && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-700 font-medium">
                              ✓ Coupon &quot;{couponData.name}&quot; applied!
                            </p>
                            <p className="text-sm text-green-600">
                              {couponData.discountType === 'percentage'
                                ? `${couponData.discountValue}% off`
                                : `$${couponData.discountValue.toFixed(2)} off`}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Questions (catalog / custom) */}
                {customQuestions.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Additional Questions</CardTitle>
                      <CardDescription>Please answer the following questions from the event organizer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {customQuestions.map((q) => (
                        <CustomQuestionRenderer
                          key={q.id}
                          question={q}
                          answers={customAnswers}
                          onChange={(id, val) =>
                            setCustomAnswers((prev) => ({ ...prev, [id]: val }))
                          }
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Terms and Privacy Agreement */}
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms-agreement"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                        required
                      />
                      <label htmlFor="terms-agreement" className="text-sm text-gray-700">
                        I agree to the{' '}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="text-gold hover:underline font-medium"
                        >
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="text-gold hover:underline font-medium"
                        >
                          Privacy Policy
                        </Link>
                        . I understand that my registration information will be shared with the event
                        organizer.
                        <span className="text-red-500"> *</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="bg-navy hover:bg-navy/90 !text-white"
                    disabled={!agreedToTerms}
                  >
                    Continue to Review
                  </Button>
                </div>
              </form>
            </div>

            {/* Pricing Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Registration Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {individualAttendanceLines({
                      ticketType: formData.ticketType,
                      housingType: effectiveHousingType,
                      roomType: effectiveRoomType,
                      housingOffered,
                      dayPassName: selectedDayPass?.name,
                      settings: event?.settings,
                      includesMealPackage: includeMealPackage,
                    }).map(line => (
                      <div key={line.label} className="flex justify-between text-sm">
                        <span className="text-gray-600">{line.label}:</span>
                        <span className="font-medium text-navy text-right">{line.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Registration Price:</span>
                      <span className="font-semibold text-navy">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-navy border-t border-gray-200 pt-2">
                      <span>Total Due:</span>
                      <span className="text-gold">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-beige p-4 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong className="text-navy">Note:</strong> Full payment is required for individual registrations at checkout.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
