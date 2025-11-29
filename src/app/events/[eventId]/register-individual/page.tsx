'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

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

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  pricing: EventPricing
}

export default function IndividualRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    age: '',
    gender: 'prefer_not_to_say',
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
    })

    router.push(`/events/${eventId}/register-individual/review?${params.toString()}`)
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Age
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          placeholder="25"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Gender
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                          <option value="prefer_not_to_say">Prefer not to say</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          T-Shirt Size
                        </label>
                        <select
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

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 !text-white">
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
