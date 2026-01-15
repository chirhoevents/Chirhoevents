'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Building2 } from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: string
  contactName: string
  contactEmail: string
  contactPhone: string
  status: string
  subscriptionTier: string
  subscriptionStatus: string
  billingCycle: string
  monthlyFee: number
  monthlyPrice: number
  annualPrice: number
  setupFeePaid: boolean
  setupFeeAmount: number
  eventsPerYearLimit: number | null
  registrationsLimit: number | null
  storageLimitGb: number
  primaryColor: string
  secondaryColor: string
  modulesEnabled: { poros: boolean; salve: boolean; rapha: boolean }
  notes: string | null
  legalEntityName: string | null
  website: string | null
  paymentMethodPreference: string
  platformFeePercentage: number
}

// Standard tier pricing
const tierPricing: Record<string, { monthly: number; annual: number; eventsLimit: number; registrationsLimit: number; storageLimit: number }> = {
  starter: { monthly: 25, annual: 250, eventsLimit: 3, registrationsLimit: 500, storageLimit: 5 },
  parish: { monthly: 45, annual: 450, eventsLimit: 5, registrationsLimit: 1000, storageLimit: 10 },
  shrine: { monthly: 89, annual: 890, eventsLimit: 10, registrationsLimit: 3000, storageLimit: 25 },
  cathedral: { monthly: 120, annual: 1200, eventsLimit: 25, registrationsLimit: 8000, storageLimit: 100 },
  basilica: { monthly: 200, annual: 2000, eventsLimit: -1, registrationsLimit: -1, storageLimit: 500 },
  test: { monthly: 0, annual: 0, eventsLimit: 3, registrationsLimit: 100, storageLimit: 1 },
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  parish: 'Parish',
  shrine: 'Shrine',
  cathedral: 'Cathedral',
  basilica: 'Basilica',
  test: 'Test (Free)',
}

export default function EditOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'parish',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    status: 'active',
    subscriptionTier: 'shrine',
    billingCycle: 'annual',
    monthlyFee: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    eventsLimit: 10,
    registrationsLimit: 3000,
    storageLimitGb: 25,
    setupFeePaid: false,
    setupFeeAmount: 250,
    primaryColor: '#1E3A5F',
    secondaryColor: '#9C8466',
    modulesEnabled: { poros: true, salve: true, rapha: true },
    notes: '',
    legalEntityName: '',
    website: '',
    paymentMethod: 'credit_card',
    platformFeePercentage: 1,
  })

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const token = await getToken()
        const response = await fetch(`/api/master-admin/organizations/${params.orgId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (response.ok) {
          const data = await response.json()
          const org: Organization = data.organization
          setFormData({
            name: org.name,
            type: org.type,
            contactName: org.contactName,
            contactEmail: org.contactEmail,
            contactPhone: org.contactPhone || '',
            status: org.status,
            subscriptionTier: org.subscriptionTier,
            billingCycle: org.billingCycle || 'annual',
            monthlyFee: org.monthlyFee,
            monthlyPrice: org.monthlyPrice,
            annualPrice: org.annualPrice,
            eventsLimit: org.eventsPerYearLimit || -1,
            registrationsLimit: org.registrationsLimit || -1,
            storageLimitGb: org.storageLimitGb,
            setupFeePaid: org.setupFeePaid,
            setupFeeAmount: org.setupFeeAmount,
            primaryColor: org.primaryColor,
            secondaryColor: org.secondaryColor,
            modulesEnabled: org.modulesEnabled || { poros: true, salve: true, rapha: true },
            notes: org.notes || '',
            legalEntityName: org.legalEntityName || '',
            website: org.website || '',
            paymentMethod: org.paymentMethodPreference || 'credit_card',
            platformFeePercentage: org.platformFeePercentage || 1,
          })
        } else {
          setError('Organization not found')
        }
      } catch (err) {
        setError('Failed to load organization')
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [params.orgId, getToken])

  const handleTierChange = (newTier: string) => {
    const pricing = tierPricing[newTier]
    if (pricing) {
      setFormData(prev => ({
        ...prev,
        subscriptionTier: newTier,
        monthlyPrice: pricing.monthly,
        annualPrice: pricing.annual,
        monthlyFee: prev.billingCycle === 'monthly' ? pricing.monthly : Math.round(pricing.annual / 12),
        eventsLimit: pricing.eventsLimit,
        registrationsLimit: pricing.registrationsLimit,
        storageLimitGb: pricing.storageLimit,
      }))
    }
  }

  const handleBillingCycleChange = (newCycle: string) => {
    const pricing = tierPricing[formData.subscriptionTier]
    if (pricing) {
      setFormData(prev => ({
        ...prev,
        billingCycle: newCycle,
        monthlyFee: newCycle === 'monthly' ? pricing.monthly : Math.round(pricing.annual / 12),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push(`/dashboard/master-admin/organizations/${params.orgId}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save organization')
      }
    } catch (err) {
      setError('Failed to save organization')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (error && !formData.name) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900">{error}</h2>
        <Link href="/dashboard/master-admin/organizations" className="text-purple-600 hover:text-purple-800 mt-2 inline-block">
          Back to Organizations
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/master-admin/organizations/${params.orgId}`}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Organization</h1>
          <p className="text-gray-600">{formData.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="parish">Parish</option>
                <option value="diocese">Diocese</option>
                <option value="archdiocese">Archdiocese</option>
                <option value="seminary">Seminary</option>
                <option value="retreat_center">Retreat Center</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={formData.legalEntityName}
                onChange={(e) => setFormData({ ...formData, legalEntityName: e.target.value })}
                placeholder="For invoicing purposes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Subscription & Billing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription & Billing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Tier
              </label>
              <select
                value={formData.subscriptionTier}
                onChange={(e) => handleTierChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {Object.entries(tierLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Cycle
              </label>
              <select
                value={formData.billingCycle}
                onChange={(e) => handleBillingCycleChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Standard: {formatCurrency(tierPricing[formData.subscriptionTier]?.monthly || 0)}/mo</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.annualPrice}
                  onChange={(e) => setFormData({ ...formData, annualPrice: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Standard: {formatCurrency(tierPricing[formData.subscriptionTier]?.annual || 0)}/yr</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="credit_card">Credit Card (Stripe)</option>
                <option value="check">Check</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Setup Fee */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Setup Fee</label>
                <p className="text-xs text-gray-500">{formatCurrency(formData.setupFeeAmount)}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.setupFeePaid}
                  onChange={(e) => setFormData({ ...formData, setupFeePaid: e.target.checked })}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Paid</span>
              </label>
            </div>
          </div>

          {/* Platform Fee */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Platform Fee Percentage</label>
                <p className="text-xs text-gray-500">Applied to event registration payments via Stripe Connect</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.platformFeePercentage}
                  onChange={(e) => setFormData({ ...formData, platformFeePercentage: Number(e.target.value) })}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <span className="text-sm text-gray-700">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Events Per Year (-1 = unlimited)
              </label>
              <input
                type="number"
                value={formData.eventsLimit}
                onChange={(e) => setFormData({ ...formData, eventsLimit: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registrations (-1 = unlimited)
              </label>
              <input
                type="number"
                value={formData.registrationsLimit}
                onChange={(e) => setFormData({ ...formData, registrationsLimit: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage (GB)
              </label>
              <input
                type="number"
                value={formData.storageLimitGb}
                onChange={(e) => setFormData({ ...formData, storageLimitGb: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enabled Modules</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.modulesEnabled.poros}
                onChange={(e) => setFormData({
                  ...formData,
                  modulesEnabled: { ...formData.modulesEnabled, poros: e.target.checked }
                })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Poros Portal (Event Management)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.modulesEnabled.salve}
                onChange={(e) => setFormData({
                  ...formData,
                  modulesEnabled: { ...formData.modulesEnabled, salve: e.target.checked }
                })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">SALVE Check-In</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.modulesEnabled.rapha}
                onChange={(e) => setFormData({
                  ...formData,
                  modulesEnabled: { ...formData.modulesEnabled, rapha: e.target.checked }
                })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Rapha Medical</span>
            </label>
          </div>
        </div>

        {/* Customization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-10 w-20 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="h-10 w-20 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Master Admin Notes</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Internal notes about this organization..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/dashboard/master-admin/organizations/${params.orgId}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
