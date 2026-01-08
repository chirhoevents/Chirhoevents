'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  Save,
  Check,
  AlertTriangle,
  RefreshCw,
  Eye,
  Users,
  Calendar,
  HardDrive,
  Percent,
} from 'lucide-react'
import Link from 'next/link'

interface PricingSettings {
  // Fees
  setup_fee: string
  processing_fee_percent: string
  platform_fee_percent: string
  transaction_fee: string
  // Starter
  starter_monthly: string
  starter_annual: string
  starter_events: string
  starter_people: string
  starter_storage: string
  // Small Diocese
  small_diocese_monthly: string
  small_diocese_annual: string
  small_diocese_events: string
  small_diocese_people: string
  small_diocese_storage: string
  // Growing
  growing_monthly: string
  growing_annual: string
  growing_events: string
  growing_people: string
  growing_storage: string
  // Conference
  conference_monthly: string
  conference_annual: string
  conference_events: string
  conference_people: string
  conference_storage: string
  // Enterprise
  enterprise_monthly: string
  enterprise_annual: string
  enterprise_events: string
  enterprise_people: string
  enterprise_storage: string
  [key: string]: string
}

const tiers = [
  { key: 'starter', name: 'Starter', color: 'bg-gray-100' },
  { key: 'small_diocese', name: 'Small Diocese', color: 'bg-blue-50' },
  { key: 'growing', name: 'Growing', color: 'bg-yellow-50', popular: true },
  { key: 'conference', name: 'Conference', color: 'bg-purple-50' },
  { key: 'enterprise', name: 'Enterprise', color: 'bg-green-50' },
]

export default function PricingManagementPage() {
  const [settings, setSettings] = useState<PricingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/master-admin/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data.settings)
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load pricing settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/master-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Failed to save pricing settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 text-purple-600 animate-spin" />
          <span className="text-gray-600">Loading pricing settings...</span>
        </div>
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Failed to load settings'}</p>
        <button
          onClick={fetchSettings}
          className="mt-4 text-purple-600 hover:text-purple-700"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600">
            Configure subscription pricing and tier features. Changes will reflect on the homepage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg"
          >
            <Eye className="h-4 w-4" />
            Preview Homepage
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check className="h-5 w-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Platform Fees */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Platform Fees</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          These fees are displayed on the homepage and applied to all transactions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setup Fee ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={settings.setup_fee}
                onChange={(e) => handleChange('setup_fee', e.target.value)}
                className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">One-time fee</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Processing Fee (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.processing_fee_percent}
              onChange={(e) => handleChange('processing_fee_percent', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Stripe fee</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform Fee (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.platform_fee_percent}
              onChange={(e) => handleChange('platform_fee_percent', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">ChiRho fee</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Fee ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={settings.transaction_fee}
                onChange={(e) => handleChange('transaction_fee', e.target.value)}
                className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Homepage display:</strong> Processing Fee: {settings.processing_fee_percent}% + ${settings.transaction_fee} per ticket (Stripe) | Platform Fee: {settings.platform_fee_percent}% | Setup Fee: ${settings.setup_fee} (one-time)
          </p>
        </div>
      </div>

      {/* Tier Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Subscription Tiers</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Configure pricing and limits for each subscription tier.
        </p>

        <div className="space-y-6">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`rounded-lg p-4 ${tier.color} ${tier.popular ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                  {tier.popular && (
                    <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium">
                      POPULAR
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Monthly Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Monthly ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={settings[`${tier.key}_monthly`]}
                      onChange={(e) => handleChange(`${tier.key}_monthly`, e.target.value)}
                      className="w-full pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Annual Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Annual ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={settings[`${tier.key}_annual`]}
                      onChange={(e) => handleChange(`${tier.key}_annual`, e.target.value)}
                      className="w-full pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ${Math.round(parseInt(settings[`${tier.key}_annual`] || '0') / 12)}/mo
                  </p>
                </div>

                {/* Events per Year */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                    <Calendar className="h-3 w-3" />
                    Events/Year
                  </label>
                  <input
                    type="text"
                    value={settings[`${tier.key}_events`]}
                    onChange={(e) => handleChange(`${tier.key}_events`, e.target.value)}
                    placeholder="e.g., 10 or Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Max People */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                    <Users className="h-3 w-3" />
                    Max People
                  </label>
                  <input
                    type="text"
                    value={settings[`${tier.key}_people`]}
                    onChange={(e) => handleChange(`${tier.key}_people`, e.target.value)}
                    placeholder="e.g., 3,000 or Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Storage */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                    <HardDrive className="h-3 w-3" />
                    Storage (GB)
                  </label>
                  <input
                    type="text"
                    value={settings[`${tier.key}_storage`]}
                    onChange={(e) => handleChange(`${tier.key}_storage`, e.target.value)}
                    placeholder="e.g., 25 or 500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This is how the pricing will appear on the homepage.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Monthly</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Events/Year</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Max People</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((tier) => (
                <tr key={tier.key} className={tier.popular ? 'bg-yellow-50' : ''}>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {tier.name}
                    {tier.popular && (
                      <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <span className="text-xl font-bold text-gray-900">
                      ${settings[`${tier.key}_monthly`]}
                    </span>
                    /mo
                  </td>
                  <td className="py-3 px-4 text-gray-600">{settings[`${tier.key}_events`]} events</td>
                  <td className="py-3 px-4 text-gray-600">{settings[`${tier.key}_people`]} people</td>
                  <td className="py-3 px-4 text-gray-600">{settings[`${tier.key}_storage`]}GB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button (bottom) */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check className="h-5 w-5" />
              Changes Saved!
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
