'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { useRegistrationQueue } from '@/hooks/useRegistrationQueue'
import RegistrationTimer from '@/components/RegistrationTimer'

interface EventPricing {
  youthRegularPrice: number
  chaperoneRegularPrice: number
  onCampusYouthPrice?: number
  offCampusYouthPrice?: number
  dayPassYouthPrice?: number
  onCampusChaperonePrice?: number
  offCampusChaperonePrice?: number
  dayPassChaperonePrice?: number
}

interface EventSettings {
  couponsEnabled?: boolean
}

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  pricing: EventPricing
  settings?: EventSettings
}

export default function IndividualRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  // Queue management
  const {
    loading: queueLoading,
    queueActive,
    isBlocked,
    expiresAt,
    extensionAllowed,
    markComplete,
  } = useRegistrationQueue(eventId, 'individual')

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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    housingType: 'on_campus',
    roomType: 'double',
    preferredRoommate: '',
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
    if (formData.housingType === 'on_campus' && pricing.onCampusYouthPrice) {
      basePrice = pricing.onCampusYouthPrice
    } else if (formData.housingType === 'off_campus' && pricing.offCampusYouthPrice) {
      basePrice = pricing.offCampusYouthPrice
    } else if (formData.housingType === 'day_pass' && pricing.dayPassYouthPrice) {
      basePrice = pricing.dayPassYouthPrice
    }

    return basePrice
  }

  const totalPrice = calculatePrice()

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
      housingType: formData.housingType,
      roomType: formData.roomType,
      preferredRoommate: formData.preferredRoommate,
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
    })

    router.push(`/events/${eventId}/register-individual/review?${params.toString()}`)
  }

  if (loading || queueLoading) {
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

  // Block access if user should be in the queue
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-navy mb-2">Registration at Capacity</h2>
            <p className="text-gray-600 mb-6">
              The registration system is currently at capacity. You are being redirected to the virtual queue.
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-navy mx-auto" />
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
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Tell us about yourself</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          placeholder="Tulsa"
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
                          placeholder="74105"
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
                          placeholder="25"
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

                {/* Housing & Room Preferences */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Housing & Room Preferences</CardTitle>
                    <CardDescription>Select your housing options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Housing Type *
                        </label>
                        <select
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.housingType}
                          onChange={(e) => setFormData({ ...formData, housingType: e.target.value })}
                        >
                          <option value="on_campus">On-Campus Housing</option>
                          <option value="off_campus">Off-Campus (Self-Arranged)</option>
                          <option value="day_pass">Day Pass (No Housing)</option>
                        </select>
                      </div>

                      {formData.housingType === 'on_campus' && (
                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Room Type *
                          </label>
                          <select
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.roomType}
                            onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                          >
                            <option value="single">Single Room</option>
                            <option value="double">Double Room</option>
                            <option value="triple">Triple Room</option>
                            <option value="quad">Quad Room</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {formData.housingType === 'on_campus' && (
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Housing Type:</span>
                      <span className="font-medium text-navy capitalize">
                        {formData.housingType.replace('_', ' ')}
                      </span>
                    </div>
                    {formData.housingType === 'on_campus' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Room Type:</span>
                        <span className="font-medium text-navy capitalize">
                          {formData.roomType}
                        </span>
                      </div>
                    )}
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
