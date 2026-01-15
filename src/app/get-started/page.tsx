'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  Globe,
  FileText,
  DollarSign,
  MessageSquare,
  Check,
  Loader2,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

const organizationTypes = [
  { value: 'diocese', label: 'Diocese' },
  { value: 'archdiocese', label: 'Archdiocese' },
  { value: 'parish', label: 'Parish' },
  { value: 'seminary', label: 'Seminary' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'retreat_center', label: 'Retreat Center' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
]

const eventRanges = [
  { value: '1-3', label: '1-3 events', tier: 'starter' },
  { value: '4-5', label: '4-5 events', tier: 'parish' },
  { value: '6-10', label: '6-10 events', tier: 'shrine' },
  { value: '11-25', label: '11-25 events', tier: 'cathedral' },
  { value: '25+', label: '25+ events', tier: 'basilica' },
]

const attendeeRanges = [
  { value: 'under-500', label: 'Under 500' },
  { value: '500-1000', label: '500-1,000' },
  { value: '1000-3000', label: '1,000-3,000' },
  { value: '3000-8000', label: '3,000-8,000' },
  { value: '8000+', label: '8,000+' },
]

const howDidYouHearOptions = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'referral', label: 'Referral from another organization' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'conference_event', label: 'Conference/Event' },
  { value: 'other', label: 'Other' },
]

export default function GetStartedPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    website: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactJobTitle: '',
    legalEntityName: '',
    taxId: '',
    billingAddressLine1: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    eventsPerYear: '',
    attendeesPerYear: '',
    billingCycle: 'annual',
    paymentMethod: 'credit_card',
    howDidYouHear: '',
    howDidYouHearOther: '',
    additionalNotes: '',
    agreedToTerms: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const getSuggestedTier = () => {
    const eventRange = eventRanges.find(r => r.value === formData.eventsPerYear)
    return eventRange?.tier || 'shrine'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          billingAddress: `${formData.billingAddressLine1}\n${formData.billingCity}, ${formData.billingState} ${formData.billingZip}`,
          requestedTier: getSuggestedTier(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit application')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F5F1E8] to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your interest in ChiRho Events! We&apos;ll review your application and contact you within 24 hours.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2A4A6F] transition-colors font-medium"
          >
            Return to Homepage
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1E8] to-white">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/light-logo-horizontal.png"
              alt="ChiRho Events"
              width={180}
              height={45}
              className="h-10 w-auto"
            />
          </Link>
          <Link href="/" className="text-sm text-[#E8DCC8] hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#1E3A5F] mb-4">Start Using ChiRho Events</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Fill out the form below and we&apos;ll review your application within 24 hours.
            Once approved, you&apos;ll receive login credentials and can start setting up your events immediately.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
          {/* Organization Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-[#1E3A5F]" />
              <h2 className="text-lg font-semibold text-gray-900">Organization Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  placeholder="e.g., Diocese of Oklahoma City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Type *
                </label>
                <select
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                >
                  <option value="">Select type...</option>
                  {organizationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website (optional)
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  placeholder="https://example.org"
                />
              </div>
            </div>
          </div>

          {/* Your Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-[#1E3A5F]" />
              <h2 className="text-lg font-semibold text-gray-900">Your Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="contactFirstName"
                  value={formData.contactFirstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="contactLastName"
                  value={formData.contactLastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  name="contactJobTitle"
                  value={formData.contactJobTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  placeholder="e.g., Youth Ministry Director"
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-[#1E3A5F]" />
              <h2 className="text-lg font-semibold text-gray-900">Billing Information</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Entity Name
                  </label>
                  <input
                    type="text"
                    name="legalEntityName"
                    value={formData.legalEntityName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID / EIN (optional)
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Address *
                </label>
                <input
                  type="text"
                  name="billingAddressLine1"
                  value={formData.billingAddressLine1}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="billingCity"
                    value={formData.billingCity}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    name="billingState"
                    value={formData.billingState}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP *
                  </label>
                  <input
                    type="text"
                    name="billingZip"
                    value={formData.billingZip}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Usage Estimates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="h-5 w-5 text-[#1E3A5F]" />
              <h2 className="text-lg font-semibold text-gray-900">Usage Estimates</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How many events do you plan to run per year? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {eventRanges.map(range => (
                    <label
                      key={range.value}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.eventsPerYear === range.value
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="eventsPerYear"
                        value={range.value}
                        checked={formData.eventsPerYear === range.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-sm text-gray-700">{range.label}</span>
                      {formData.eventsPerYear === range.value && (
                        <Check className="h-4 w-4 text-[#1E3A5F] ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Estimated attendees per year? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {attendeeRanges.map(range => (
                    <label
                      key={range.value}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.attendeesPerYear === range.value
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="attendeesPerYear"
                        value={range.value}
                        checked={formData.attendeesPerYear === range.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-sm text-gray-700">{range.label}</span>
                      {formData.attendeesPerYear === range.value && (
                        <Check className="h-4 w-4 text-[#1E3A5F] ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred billing cycle
                  </label>
                  <select
                    name="billingCycle"
                    value={formData.billingCycle}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual (save 2 months)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred payment method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="check">Check</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* How did you hear about us */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="h-5 w-5 text-[#1E3A5F]" />
              <h2 className="text-lg font-semibold text-gray-900">How Did You Hear About Us?</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {howDidYouHearOptions.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.howDidYouHear === option.value
                        ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="howDidYouHear"
                      value={option.value}
                      checked={formData.howDidYouHear === option.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                    {formData.howDidYouHear === option.value && (
                      <Check className="h-4 w-4 text-[#1E3A5F] ml-auto" />
                    )}
                  </label>
                ))}
              </div>

              {formData.howDidYouHear === 'other' && (
                <input
                  type="text"
                  name="howDidYouHearOther"
                  value={formData.howDidYouHearOther}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  placeholder="Please specify..."
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tell us about your needs (optional)
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  placeholder="Any specific requirements or questions?"
                />
              </div>
            </div>
          </div>

          {/* Terms & Submit */}
          <div className="space-y-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreedToTerms"
                checked={formData.agreedToTerms}
                onChange={handleChange}
                required
                className="mt-1 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <Link href="/terms" className="text-[#1E3A5F] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#1E3A5F] hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <div className="bg-[#F5F1E8] rounded-lg p-4 text-sm text-gray-700">
              After approval, you&apos;ll receive an invoice for the $250 setup fee and your first subscription payment.
            </div>

            <button
              type="submit"
              disabled={loading || !formData.agreedToTerms}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2A4A6F] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
