'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  Palette,
  DollarSign,
  FileText,
  Check,
  Loader2
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

const subscriptionTiers = [
  { value: 'starter', label: 'Starter', monthly: 49, annual: 490, description: 'Up to 3 events, 500 registrations' },
  { value: 'small_diocese', label: 'Small Diocese', monthly: 99, annual: 990, description: 'Up to 5 events, 1,000 registrations' },
  { value: 'growing', label: 'Growing', monthly: 149, annual: 1490, description: 'Up to 10 events, 3,000 registrations', popular: true },
  { value: 'conference', label: 'Conference', monthly: 249, annual: 2490, description: 'Up to 25 events, 8,000 registrations' },
  { value: 'enterprise', label: 'Enterprise', monthly: 499, annual: 4990, description: 'Unlimited events and registrations' },
  { value: 'test', label: 'Test/Free Account', monthly: 0, annual: 0, description: 'No billing (for testing only)' },
]

export default function CreateOrganizationPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'parish',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    legalEntityName: '',
    taxId: '',
    billingAddress: '',
    website: '',
    subscriptionTier: 'growing',
    billingCycle: 'annual',
    paymentMethod: 'credit_card',
    setupFeeWaived: false,
    setupFeePaid: false,
    primaryColor: '#1E3A5F',
    secondaryColor: '#9C8466',
    porosEnabled: true,
    salveEnabled: true,
    raphaEnabled: true,
    notes: '',
    sendWelcomeEmail: true,
    sendStripeOnboarding: true,
    skipStripeSetup: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          modulesEnabled: {
            poros: formData.porosEnabled,
            salve: formData.salveEnabled,
            rapha: formData.raphaEnabled,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      const data = await response.json()
      router.push(`/dashboard/master-admin/organizations/${data.organization.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selectedTier = subscriptionTiers.find(t => t.value === formData.subscriptionTier)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/master-admin/organizations"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Organization</h1>
          <p className="text-gray-600 mt-1">Add a new organization to the platform</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Saint Joseph Old Cathedral"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="https://example.org"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Billing Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Entity Name
              </label>
              <input
                type="text"
                name="legalEntityName"
                value={formData.legalEntityName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID / EIN
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Address
              </label>
              <textarea
                name="billingAddress"
                value={formData.billingAddress}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="307 NW 4th Street&#10;Oklahoma City, OK 73102"
              />
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Subscription Tier *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptionTiers.map(tier => (
                  <label
                    key={tier.value}
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.subscriptionTier === tier.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="subscriptionTier"
                      value={tier.value}
                      checked={formData.subscriptionTier === tier.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {tier.popular && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded">
                        Popular
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-900">{tier.label}</span>
                    <span className="text-lg font-bold text-purple-600 mt-1">
                      ${tier.monthly}/mo
                      {tier.annual > 0 && <span className="text-sm text-gray-500"> or ${tier.annual}/yr</span>}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">{tier.description}</span>
                    {formData.subscriptionTier === tier.value && (
                      <Check className="absolute top-4 right-4 h-5 w-5 text-purple-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Cycle
                </label>
                <select
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual (save 2 months)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="credit_card">Credit Card (Stripe)</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Setup Fee:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formData.setupFeeWaived ? '$0 (Waived)' : '$250'}
                </span>
              </div>
              <div className="space-y-2 mt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="setupFeeWaived"
                    checked={formData.setupFeeWaived}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Waive setup fee</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="setupFeePaid"
                    checked={formData.setupFeePaid}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Setup fee already paid</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Connect */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Stripe Connect</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="skipStripeSetup"
                checked={formData.skipStripeSetup}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Skip Stripe setup (set up later)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="sendStripeOnboarding"
                checked={formData.sendStripeOnboarding && !formData.skipStripeSetup}
                disabled={formData.skipStripeSetup}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">Send Stripe onboarding email</span>
            </label>
          </div>
        </div>

        {/* Customization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Customization</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={e => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleChange}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={e => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enable Modules</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="porosEnabled"
                checked={formData.porosEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Poros Portal (Housing/Seating/Meals)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="salveEnabled"
                checked={formData.salveEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">SALVE Check-In (QR Scanning)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="raphaEnabled"
                checked={formData.raphaEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Rapha Medical Platform</span>
            </label>
          </div>
        </div>

        {/* Master Admin Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Master Admin Notes (Internal)</h2>

          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Internal notes visible only to Master Admin..."
          />
        </div>

        {/* Email Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="sendWelcomeEmail"
                checked={formData.sendWelcomeEmail}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Send welcome email with login info</span>
            </label>
          </div>
        </div>

        {/* Summary */}
        {selectedTier && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Subscription Tier:</span>
                <span className="font-medium text-gray-900">{selectedTier.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Billing Cycle:</span>
                <span className="font-medium text-gray-900">
                  {formData.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">
                  {formData.billingCycle === 'annual' ? 'Annual' : 'Monthly'} Amount:
                </span>
                <span className="font-medium text-gray-900">
                  ${formData.billingCycle === 'annual' ? selectedTier.annual : selectedTier.monthly}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Setup Fee:</span>
                <span className="font-medium text-gray-900">
                  {formData.setupFeeWaived ? '$0' : '$250'}
                </span>
              </div>
              <div className="border-t border-purple-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-purple-900">First Payment:</span>
                <span className="font-bold text-purple-900">
                  ${(formData.billingCycle === 'annual' ? selectedTier.annual : selectedTier.monthly) + (formData.setupFeeWaived ? 0 : 250)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/master-admin/organizations"
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Organization'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
