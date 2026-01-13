'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useRegistrationQueue } from '@/hooks/useRegistrationQueue'
import RegistrationTimer from '@/components/RegistrationTimer'
import LoadingScreen from '@/components/LoadingScreen'

interface EventPricing {
  youthRegularPrice: number
  chaperoneRegularPrice: number
  priestPrice: number
  depositAmount: number
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

export default function GroupRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  // Queue management
  const {
    loading: queueLoading,
    queueActive,
    isBlocked,
    queueStatus,
    expiresAt,
    extensionAllowed,
    markComplete,
    checkQueue,
  } = useRegistrationQueue(eventId, 'group')

  // Debug mode - add ?debug=queue to URL to see queue status
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'queue'

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
    groupName: '',
    parishName: '',
    dioceseName: '',
    groupLeaderName: '',
    groupLeaderEmail: '',
    groupLeaderPhone: '',
    groupLeaderStreet: '',
    groupLeaderCity: '',
    groupLeaderState: '',
    groupLeaderZip: '',
    alternativeContact1Name: '',
    alternativeContact1Email: '',
    alternativeContact1Phone: '',
    alternativeContact2Name: '',
    alternativeContact2Email: '',
    alternativeContact2Phone: '',
    youthCount: 0,
    chaperoneCount: 0,
    priestCount: 0,
    housingType: 'on_campus',
    specialRequests: '',
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

  // Calculate pricing
  const calculatePricing = () => {
    if (!event) return { total: 0, deposit: 0, balance: 0, breakdown: [] }

    const { pricing } = event
    const breakdown: { label: string; count: number; price: number; subtotal: number }[] = []

    // Determine youth price based on housing type (if available)
    let youthPrice = pricing.youthRegularPrice
    if (formData.housingType === 'on_campus' && pricing.onCampusYouthPrice) {
      youthPrice = pricing.onCampusYouthPrice
    } else if (formData.housingType === 'off_campus' && pricing.offCampusYouthPrice) {
      youthPrice = pricing.offCampusYouthPrice
    } else if (formData.housingType === 'day_pass' && pricing.dayPassYouthPrice) {
      youthPrice = pricing.dayPassYouthPrice
    }

    // Determine chaperone price based on housing type (if available)
    let chaperonePrice = pricing.chaperoneRegularPrice
    if (formData.housingType === 'on_campus' && pricing.onCampusChaperonePrice) {
      chaperonePrice = pricing.onCampusChaperonePrice
    } else if (formData.housingType === 'off_campus' && pricing.offCampusChaperonePrice) {
      chaperonePrice = pricing.offCampusChaperonePrice
    } else if (formData.housingType === 'day_pass' && pricing.dayPassChaperonePrice) {
      chaperonePrice = pricing.dayPassChaperonePrice
    }

    if (formData.youthCount > 0) {
      breakdown.push({
        label: 'Youth',
        count: formData.youthCount,
        price: youthPrice,
        subtotal: formData.youthCount * youthPrice,
      })
    }

    if (formData.chaperoneCount > 0) {
      breakdown.push({
        label: 'Chaperones',
        count: formData.chaperoneCount,
        price: chaperonePrice,
        subtotal: formData.chaperoneCount * chaperonePrice,
      })
    }

    if (formData.priestCount > 0) {
      breakdown.push({
        label: 'Priests',
        count: formData.priestCount,
        price: pricing.priestPrice,
        subtotal: formData.priestCount * pricing.priestPrice,
      })
    }

    const total = breakdown.reduce((sum, item) => sum + item.subtotal, 0)
    const deposit = total * (pricing.depositAmount / 100) // 25% deposit
    const balance = total - deposit

    return { total, deposit, balance, breakdown }
  }

  const pricing = calculatePricing()
  const totalParticipants =
    formData.youthCount +
    formData.chaperoneCount +
    formData.priestCount

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
          email: formData.groupLeaderEmail,
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
      groupName: formData.groupName,
      parishName: formData.parishName,
      dioceseName: formData.dioceseName,
      groupLeaderName: formData.groupLeaderName,
      groupLeaderEmail: formData.groupLeaderEmail,
      groupLeaderPhone: formData.groupLeaderPhone,
      groupLeaderStreet: formData.groupLeaderStreet,
      groupLeaderCity: formData.groupLeaderCity,
      groupLeaderState: formData.groupLeaderState,
      groupLeaderZip: formData.groupLeaderZip,
      alternativeContact1Name: formData.alternativeContact1Name,
      alternativeContact1Email: formData.alternativeContact1Email,
      alternativeContact1Phone: formData.alternativeContact1Phone,
      alternativeContact2Name: formData.alternativeContact2Name,
      alternativeContact2Email: formData.alternativeContact2Email,
      alternativeContact2Phone: formData.alternativeContact2Phone,
      youthCount: formData.youthCount.toString(),
      chaperoneCount: formData.chaperoneCount.toString(),
      priestCount: formData.priestCount.toString(),
      housingType: formData.housingType,
      specialRequests: formData.specialRequests,
      couponCode: formData.couponCode,
    })

    router.push(`/events/${eventId}/register-group/review?${params.toString()}`)
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
                onClick={() => router.push(`/events/${eventId}/queue?type=group`)}
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
          registrationType="group"
          extensionAllowed={extensionAllowed}
        />
      )}

      {/* Debug Panel - add ?debug=queue to URL to see this */}
      {showDebug && (
        <div className="fixed bottom-4 left-4 z-50 bg-black text-white p-4 rounded-lg text-xs max-w-sm overflow-auto max-h-64">
          <p className="font-bold mb-2">Queue Debug Info:</p>
          <p>queueLoading: {String(queueLoading)}</p>
          <p>queueActive: {String(queueActive)}</p>
          <p>isBlocked: {String(isBlocked)}</p>
          <p>expiresAt: {expiresAt || 'null'}</p>
          <p>queueStatus: {JSON.stringify(queueStatus, null, 2)}</p>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-navy mb-2">{event?.name}</h1>
            <p className="text-gray-600">Group Registration</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Parish & Group Leader Information</CardTitle>
                    <CardDescription>Tell us about your parish and group leader</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.groupName}
                        onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                        placeholder="St. Mary's Youth Group"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Parish Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.parishName}
                          onChange={(e) => setFormData({ ...formData, parishName: e.target.value })}
                          placeholder="St. Mary's Catholic Church"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">
                          Diocese Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                          value={formData.dioceseName}
                          onChange={(e) => setFormData({ ...formData, dioceseName: e.target.value })}
                          placeholder="Diocese of Tulsa"
                        />
                      </div>
                    </div>

                    <hr className="my-4 border-gray-200" />
                    <h3 className="font-semibold text-navy mb-3">Group Leader Contact</h3>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.groupLeaderName}
                        onChange={(e) => setFormData({ ...formData, groupLeaderName: e.target.value })}
                        placeholder="Mike Johnson"
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
                          value={formData.groupLeaderEmail}
                          onChange={(e) => setFormData({ ...formData, groupLeaderEmail: e.target.value })}
                          placeholder="mike@stmarystulsa.org"
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
                          value={formData.groupLeaderPhone}
                          onChange={(e) => setFormData({ ...formData, groupLeaderPhone: e.target.value })}
                          placeholder="(918) 555-1234"
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
                        value={formData.groupLeaderStreet}
                        onChange={(e) => setFormData({ ...formData, groupLeaderStreet: e.target.value })}
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
                          value={formData.groupLeaderCity}
                          onChange={(e) => setFormData({ ...formData, groupLeaderCity: e.target.value })}
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
                          value={formData.groupLeaderState}
                          onChange={(e) => setFormData({ ...formData, groupLeaderState: e.target.value })}
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
                          value={formData.groupLeaderZip}
                          onChange={(e) => setFormData({ ...formData, groupLeaderZip: e.target.value })}
                          placeholder="74105"
                          maxLength={5}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Alternative Contacts</CardTitle>
                    <CardDescription>Who can we contact if we can&apos;t reach the group leader?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Alternative Contact 1 */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-navy">Primary Alternative Contact</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact1Name}
                            onChange={(e) => setFormData({ ...formData, alternativeContact1Name: e.target.value })}
                            placeholder="Sarah Williams"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact1Email}
                            onChange={(e) => setFormData({ ...formData, alternativeContact1Email: e.target.value })}
                            placeholder="sarah@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact1Phone}
                            onChange={(e) => setFormData({ ...formData, alternativeContact1Phone: e.target.value })}
                            placeholder="(918) 555-9876"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alternative Contact 2 */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-navy">Secondary Alternative Contact (Optional)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact2Name}
                            onChange={(e) => setFormData({ ...formData, alternativeContact2Name: e.target.value })}
                            placeholder="Tom Anderson"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact2Email}
                            onChange={(e) => setFormData({ ...formData, alternativeContact2Email: e.target.value })}
                            placeholder="tom@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact2Phone}
                            onChange={(e) => setFormData({ ...formData, alternativeContact2Phone: e.target.value })}
                            placeholder="(918) 555-5432"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Participant Counts</CardTitle>
                    <CardDescription>How many people are coming? (We&apos;ll collect specific details in liability forms later)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Youth Count *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.youthCount}
                        onChange={(e) =>
                          setFormData({ ...formData, youthCount: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Total number of youth participants"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Chaperone Count *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.chaperoneCount}
                        onChange={(e) =>
                          setFormData({ ...formData, chaperoneCount: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Total number of chaperones"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Priest Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.priestCount}
                        onChange={(e) =>
                          setFormData({ ...formData, priestCount: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Number of priests (optional)"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        <option value="on_campus">
                          On-Campus Housing
                          {event?.pricing.onCampusYouthPrice && ` - Youth: $${event.pricing.onCampusYouthPrice.toFixed(2)}, Chaperones: $${event.pricing.onCampusChaperonePrice?.toFixed(2)}`}
                        </option>
                        <option value="off_campus">
                          Off-Campus (Self-Arranged)
                          {event?.pricing.offCampusYouthPrice && ` - Youth: $${event.pricing.offCampusYouthPrice.toFixed(2)}, Chaperones: $${event.pricing.offCampusChaperonePrice?.toFixed(2)}`}
                        </option>
                        <option value="day_pass">
                          Day Pass Only
                          {event?.pricing.dayPassYouthPrice && ` - Youth: $${event.pricing.dayPassYouthPrice.toFixed(2)}, Chaperones: $${event.pricing.dayPassChaperonePrice?.toFixed(2)}`}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Special Requests
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.specialRequests}
                        onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                        placeholder="Any special requests or needs for your group?"
                      />
                    </div>

                    {event?.settings?.couponsEnabled && (
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
                    )}
                  </CardContent>
                </Card>

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
                        . I understand that registration information will be shared with the event
                        organizer and that liability forms must be completed for all participants.
                        <span className="text-red-500"> *</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={totalParticipants === 0 || !agreedToTerms}
                >
                  Continue to Review & Payment
                </Button>
              </form>
            </div>

            {/* Price Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Registration Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Participants:</span>
                      <span className="font-semibold text-navy">{totalParticipants}</span>
                    </div>

                    {pricing.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-600">
                          {item.label} ({item.count})
                        </span>
                        <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-navy">Total:</span>
                      <span className="font-bold text-navy text-xl">${pricing.total.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Deposit Due Now:</span>
                      <span className="font-semibold text-gold">${pricing.deposit.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Balance Remaining:</span>
                      <span className="text-gray-900">${pricing.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-beige p-4 rounded-md text-sm">
                    <p className="text-gray-600">
                      ✓ Pay 25% deposit now<br />
                      ✓ Balance due before event<br />
                      ✓ Secure payment via Stripe
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
