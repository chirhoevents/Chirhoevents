'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Building2, CheckCircle } from 'lucide-react'

interface VendorTier {
  id: string
  name: string
  price: string
  description: string
  active: boolean
  quantityLimit: string
}

interface EventSettings {
  vendorRegistrationEnabled: boolean
  vendorTiers: VendorTier[]
  liabilityFormsRequiredGroup: boolean
}

interface EventData {
  id: string
  name: string
  slug: string
  startDate: string
  endDate: string
  organizationId: string
  settings: EventSettings
}

export default function VendorRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    contactFirstName: '',
    contactLastName: '',
    email: '',
    phone: '',
    boothDescription: '',
    selectedTier: '',
    additionalNeeds: '',
  })

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) throw new Error('Event not found')
        const data = await response.json()

        // Check if vendor registration is enabled
        if (!data.settings?.vendorRegistrationEnabled) {
          setError('Vendor registration is not enabled for this event.')
          setLoading(false)
          return
        }

        setEvent(data)
      } catch (err) {
        setError('Failed to load event. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [eventId])

  const activeTiers = event?.settings?.vendorTiers?.filter(t => t.active) || []
  const selectedTierData = activeTiers.find(t => t.id === formData.selectedTier)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.selectedTier) {
      setError('Please select a booth tier')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registration/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...formData,
          tierPrice: selectedTierData?.price || '0',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
      setSubmitting(false)
    }
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Registration Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href={`/events/${eventId}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) return null

  // Show success message after submission
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-700">Application Submitted!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-2">
                  Thank you for your vendor booth application for
                </p>
                <p className="font-semibold text-lg text-[#1E3A5F]">{event.name}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Your application is now under review</li>
                  <li>• You will receive an email notification once reviewed</li>
                  <li>• If approved, you will receive your vendor code and invoice</li>
                  <li>• Your booth staff can register using the vendor code</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  A confirmation email has been sent to <strong>{formData.email}</strong>.
                  Please check your inbox (and spam folder) for details.
                </p>
              </div>

              <Link href={`/events/${eventId}`}>
                <Button className="w-full bg-[#1E3A5F] hover:bg-[#2d4a6f]">
                  Back to Event Page
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/events/${eventId}`} className="text-[#1E3A5F] hover:underline flex items-center mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <div className="flex items-center space-x-3 mb-2">
            <Building2 className="h-8 w-8 text-[#1E3A5F]" />
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Vendor Booth Application</h1>
          </div>
          <p className="text-gray-600">{event.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Business Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business/Organization Name <span className="text-red-500">*</span></Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => updateFormData({ businessName: e.target.value })}
                  placeholder="Your Business Name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactFirstName">Contact First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="contactFirstName"
                    value={formData.contactFirstName}
                    onChange={(e) => updateFormData({ contactFirstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactLastName">Contact Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="contactLastName"
                    value={formData.contactLastName}
                    onChange={(e) => updateFormData({ contactLastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booth Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Booth Details</CardTitle>
              <CardDescription>Tell us about what you will be offering</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="boothDescription">Booth Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="boothDescription"
                  value={formData.boothDescription}
                  onChange={(e) => updateFormData({ boothDescription: e.target.value })}
                  placeholder="Describe what products/services you will be offering at your booth..."
                  rows={4}
                  required
                />
              </div>

              {/* Booth Tier Selection */}
              <div>
                <Label className="mb-3 block">Select Booth Tier <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-1 gap-3">
                  {activeTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        formData.selectedTier === tier.id
                          ? 'border-[#1E3A5F] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateFormData({ selectedTier: tier.id })}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[#1E3A5F]">{tier.name}</p>
                          <p className="text-sm text-gray-600">{tier.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {Number(tier.price) > 0 ? `$${Number(tier.price).toFixed(2)}` : 'Contact for Pricing'}
                          </p>
                          {tier.quantityLimit && (
                            <p className="text-xs text-gray-500">Limited spots</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="additionalNeeds">Additional Needs or Requests</Label>
                <Textarea
                  id="additionalNeeds"
                  value={formData.additionalNeeds}
                  onChange={(e) => updateFormData({ additionalNeeds: e.target.value })}
                  placeholder="e.g., Need electricity for 2 tables, need early setup access, special requirements..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Any additional needs will be reviewed and priced accordingly on your invoice.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Application Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTierData ? (
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">{selectedTierData.name}</span>
                    <span className="font-medium">
                      {Number(selectedTierData.price) > 0 ? `$${Number(selectedTierData.price).toFixed(2)}` : 'TBD'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 pt-2">
                    * Final pricing will be confirmed upon approval. Additional requests may affect final invoice.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 italic">Please select a booth tier above</p>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || !formData.selectedTier}
            className="w-full bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white py-6 text-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Submitting Application...
              </>
            ) : (
              'Submit Vendor Application'
            )}
          </Button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Your application will be reviewed by the event organizers.
            You will receive an email notification once your application has been processed.
          </p>
        </form>
      </div>
    </div>
  )
}
