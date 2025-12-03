'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

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

interface EventData {
  id: string
  name: string
  startDate: string
  endDate: string
  pricing: EventPricing
}

export default function GroupRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    groupName: '',
    parishName: '',
    dioceseName: '',
    groupLeaderName: '',
    groupLeaderEmail: '',
    groupLeaderPhone: '',
    groupLeaderAddress: '',
    alternativeContact1Name: '',
    alternativeContact1Email: '',
    alternativeContact1Phone: '',
    alternativeContact2Name: '',
    alternativeContact2Email: '',
    alternativeContact2Phone: '',
    youthCountMaleU18: 0,
    youthCountFemaleU18: 0,
    youthCountMaleO18: 0,
    youthCountFemaleO18: 0,
    chaperoneCountMale: 0,
    chaperoneCountFemale: 0,
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

    const youthTotal =
      formData.youthCountMaleU18 +
      formData.youthCountFemaleU18 +
      formData.youthCountMaleO18 +
      formData.youthCountFemaleO18

    if (youthTotal > 0) {
      breakdown.push({
        label: 'Youth',
        count: youthTotal,
        price: youthPrice,
        subtotal: youthTotal * youthPrice,
      })
    }

    const chaperoneTotal = formData.chaperoneCountMale + formData.chaperoneCountFemale
    if (chaperoneTotal > 0) {
      breakdown.push({
        label: 'Chaperones',
        count: chaperoneTotal,
        price: chaperonePrice,
        subtotal: chaperoneTotal * chaperonePrice,
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
    formData.youthCountMaleU18 +
    formData.youthCountFemaleU18 +
    formData.youthCountMaleO18 +
    formData.youthCountFemaleO18 +
    formData.chaperoneCountMale +
    formData.chaperoneCountFemale +
    formData.priestCount

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
      groupLeaderAddress: formData.groupLeaderAddress,
      alternativeContact1Name: formData.alternativeContact1Name,
      alternativeContact1Email: formData.alternativeContact1Email,
      alternativeContact1Phone: formData.alternativeContact1Phone,
      alternativeContact2Name: formData.alternativeContact2Name,
      alternativeContact2Email: formData.alternativeContact2Email,
      alternativeContact2Phone: formData.alternativeContact2Phone,
      youthCountMaleU18: formData.youthCountMaleU18.toString(),
      youthCountFemaleU18: formData.youthCountFemaleU18.toString(),
      youthCountMaleO18: formData.youthCountMaleO18.toString(),
      youthCountFemaleO18: formData.youthCountFemaleO18.toString(),
      chaperoneCountMale: formData.chaperoneCountMale.toString(),
      chaperoneCountFemale: formData.chaperoneCountFemale.toString(),
      priestCount: formData.priestCount.toString(),
      housingType: formData.housingType,
      specialRequests: formData.specialRequests,
    })

    router.push(`/events/${eventId}/register-group/review?${params.toString()}`)
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
            <p className="text-gray-600">Group Registration</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Group Information</CardTitle>
                    <CardDescription>Tell us about your youth group</CardDescription>
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
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Group Leader Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        Address *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.groupLeaderAddress}
                        onChange={(e) => setFormData({ ...formData, groupLeaderAddress: e.target.value })}
                        placeholder="123 Main St, City, State, ZIP"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Alternative Contacts</CardTitle>
                    <CardDescription>Who can we contact if we can't reach the group leader?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Alternative Contact 1 */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-navy">Primary Alternative Contact</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact1Name}
                            onChange={(e) => setFormData({ ...formData, alternativeContact1Name: e.target.value })}
                            placeholder="Sarah Williams"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.alternativeContact1Email}
                            onChange={(e) => setFormData({ ...formData, alternativeContact1Email: e.target.value })}
                            placeholder="sarah@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-navy mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
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
                    <CardDescription>How many people are coming?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-navy mb-3">Youth (Under 18)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Male
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.youthCountMaleU18}
                            onChange={(e) =>
                              setFormData({ ...formData, youthCountMaleU18: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Female
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.youthCountFemaleU18}
                            onChange={(e) =>
                              setFormData({ ...formData, youthCountFemaleU18: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-navy mb-3">Youth (Over 18)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Male
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.youthCountMaleO18}
                            onChange={(e) =>
                              setFormData({ ...formData, youthCountMaleO18: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Female
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.youthCountFemaleO18}
                            onChange={(e) =>
                              setFormData({ ...formData, youthCountFemaleO18: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-navy mb-3">Chaperones</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Male
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.chaperoneCountMale}
                            onChange={(e) =>
                              setFormData({ ...formData, chaperoneCountMale: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Female
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                            value={formData.chaperoneCountFemale}
                            onChange={(e) =>
                              setFormData({ ...formData, chaperoneCountFemale: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Priests
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.priestCount}
                        onChange={(e) =>
                          setFormData({ ...formData, priestCount: parseInt(e.target.value) || 0 })
                        }
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

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Coupon Code (Optional)
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        value={formData.couponCode}
                        onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                        placeholder="EARLYBIRD"
                      />
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
                  disabled={totalParticipants === 0}
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
