'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Users, Building2 } from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'

interface CustomQuestion {
  id: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'dropdown'
  options: string[] | null
  required: boolean
  appliesTo: string
  displayOrder: number
}

interface EventSettings {
  staffRegistrationEnabled: boolean
  staffVolunteerPrice: number
  vendorStaffPrice: number
  staffRoles: string[]
  vendorRegistrationEnabled: boolean
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
  staffQuestions: CustomQuestion[]
}

const TSHIRT_SIZES = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: '2XL', label: '2XL' },
  { value: '3XL', label: '3XL' },
]

export default function StaffRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    tshirtSize: '',
    dietaryRestrictions: '',
    isVendorStaff: false,
    vendorCode: '',
  })

  const [vendorCodeError, setVendorCodeError] = useState<string | null>(null)
  const [vendorCodeValid, setVendorCodeValid] = useState(false)
  const [vendorBusinessName, setVendorBusinessName] = useState<string | null>(null)
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(`/api/events/${eventId}/staff-vendor-settings`)
        if (!response.ok) throw new Error('Event not found')
        const data = await response.json()

        // Check if staff registration is enabled
        if (!data.settings?.staffRegistrationEnabled) {
          setError('Staff registration is not enabled for this event.')
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

  // Calculate price based on staff type
  const calculatePrice = () => {
    if (!event?.settings) return 0
    if (formData.isVendorStaff && vendorCodeValid) {
      return event.settings.vendorStaffPrice || 0
    }
    return event.settings.staffVolunteerPrice || 0
  }

  const totalPrice = calculatePrice()

  // Validate vendor code
  const validateVendorCode = async (code: string) => {
    if (!code.trim()) {
      setVendorCodeError('Please enter a vendor code')
      setVendorCodeValid(false)
      setVendorBusinessName(null)
      return
    }

    try {
      const response = await fetch(`/api/registration/staff/validate-vendor-code?code=${encodeURIComponent(code)}&eventId=${eventId}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setVendorCodeError(null)
        setVendorCodeValid(true)
        setVendorBusinessName(data.businessName)
      } else {
        setVendorCodeError(data.error || 'Invalid vendor code')
        setVendorCodeValid(false)
        setVendorBusinessName(null)
      }
    } catch {
      setVendorCodeError('Failed to validate vendor code')
      setVendorCodeValid(false)
      setVendorBusinessName(null)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate vendor code if vendor staff
    if (formData.isVendorStaff && !vendorCodeValid) {
      setVendorCodeError('Please enter a valid vendor code')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registration/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...formData,
          price: totalPrice,
          customAnswers: Object.entries(customAnswers)
            .filter(([, value]) => value.trim() !== '')
            .map(([questionId, answerText]) => ({ questionId, answerText })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register')
      }

      // If payment required, redirect to Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        // Free registration - redirect to success page
        router.push(`/events/${eventId}/register-staff/success?id=${data.registration.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit registration')
      setSubmitting(false)
    }
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  if (loading) {
    return <LoadingScreen message="Loading staff registration..." />
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/events/${eventId}`} className="text-[#1E3A5F] hover:underline flex items-center mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Staff/Volunteer Registration</h1>
          <p className="text-gray-600">{event.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Staff Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Registration Type</CardTitle>
              <CardDescription>Are you registering as general staff or as part of a vendor booth?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    !formData.isVendorStaff
                      ? 'border-[#1E3A5F] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    updateFormData({ isVendorStaff: false, vendorCode: '' })
                    setVendorCodeError(null)
                    setVendorCodeValid(false)
                    setVendorBusinessName(null)
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Users className={`h-6 w-6 ${!formData.isVendorStaff ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium">General Staff/Volunteer</p>
                      <p className="text-sm text-gray-500">
                        {event.settings.staffVolunteerPrice > 0
                          ? `$${event.settings.staffVolunteerPrice.toFixed(2)}`
                          : 'Free'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    formData.isVendorStaff
                      ? 'border-[#1E3A5F] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData({ isVendorStaff: true })}
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className={`h-6 w-6 ${formData.isVendorStaff ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium">Vendor Booth Staff</p>
                      <p className="text-sm text-gray-500">
                        {event.settings.vendorStaffPrice > 0
                          ? `$${event.settings.vendorStaffPrice.toFixed(2)}`
                          : 'Free'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Code Input */}
              {formData.isVendorStaff && (
                <div className="pt-4 border-t">
                  <Label htmlFor="vendorCode">Vendor Code <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-gray-500 mb-2">
                    Enter the vendor code provided by your booth organizer
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="vendorCode"
                      value={formData.vendorCode}
                      onChange={(e) => {
                        updateFormData({ vendorCode: e.target.value.toUpperCase() })
                        setVendorCodeError(null)
                        setVendorCodeValid(false)
                        setVendorBusinessName(null)
                      }}
                      placeholder="VND-XXXXXX"
                      className={vendorCodeError ? 'border-red-500' : vendorCodeValid ? 'border-green-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => validateVendorCode(formData.vendorCode)}
                    >
                      Verify
                    </Button>
                  </div>
                  {vendorCodeError && (
                    <p className="text-sm text-red-500 mt-1">{vendorCodeError}</p>
                  )}
                  {vendorCodeValid && vendorBusinessName && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Valid code for: {vendorBusinessName}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData({ firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData({ lastName: e.target.value })}
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

              <div>
                <Label htmlFor="role">Role/Position <span className="text-red-500">*</span></Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => updateFormData({ role: e.target.value })}
                  className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  required
                >
                  <option value="">Select a role...</option>
                  {event.settings.staffRoles?.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tshirtSize">T-Shirt Size <span className="text-red-500">*</span></Label>
                <select
                  id="tshirtSize"
                  value={formData.tshirtSize}
                  onChange={(e) => updateFormData({ tshirtSize: e.target.value })}
                  className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  required
                >
                  <option value="">Select size...</option>
                  {TSHIRT_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={(e) => updateFormData({ dietaryRestrictions: e.target.value })}
                  placeholder="e.g., Vegetarian, Gluten-free, Nut allergy..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Questions */}
          {event.staffQuestions && event.staffQuestions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Additional Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.staffQuestions.map((question) => (
                  <div key={question.id}>
                    <Label htmlFor={`q-${question.id}`}>
                      {question.questionText}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {question.questionType === 'text' && (
                      <Textarea
                        id={`q-${question.id}`}
                        value={customAnswers[question.id] || ''}
                        onChange={(e) =>
                          setCustomAnswers((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                        required={question.required}
                        rows={2}
                      />
                    )}

                    {question.questionType === 'yes_no' && (
                      <select
                        id={`q-${question.id}`}
                        value={customAnswers[question.id] || ''}
                        onChange={(e) =>
                          setCustomAnswers((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                        className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                        required={question.required}
                      >
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    )}

                    {(question.questionType === 'dropdown' ||
                      question.questionType === 'multiple_choice') && (
                      <select
                        id={`q-${question.id}`}
                        value={customAnswers[question.id] || ''}
                        onChange={(e) =>
                          setCustomAnswers((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                        className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                        required={question.required}
                      >
                        <option value="">Select...</option>
                        {question.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Price Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Registration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">
                  {formData.isVendorStaff ? 'Vendor Booth Staff Registration' : 'Staff/Volunteer Registration'}
                </span>
                <span className="font-medium">
                  {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 text-lg font-bold">
                <span>Total</span>
                <span className="text-[#1E3A5F]">
                  {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : 'Free'}
                </span>
              </div>
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
            disabled={submitting || (formData.isVendorStaff && !vendorCodeValid)}
            className="w-full bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white py-6 text-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </>
            ) : totalPrice > 0 ? (
              `Continue to Payment - $${totalPrice.toFixed(2)}`
            ) : (
              'Complete Registration'
            )}
          </Button>

          <p className="text-center text-sm text-gray-500 mt-4">
            By registering, you agree to the event terms and conditions.
          </p>
        </form>
      </div>
    </div>
  )
}
