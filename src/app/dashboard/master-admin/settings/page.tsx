'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Settings,
  Save,
  DollarSign,
  Mail,
  Shield,
  CreditCard,
  AlertTriangle,
  Check,
  Bell,
  Trash2,
} from 'lucide-react'
import MasterAdminNotificationsTab from '@/components/master-admin/MasterAdminNotificationsTab'

interface SettingsData {
  platform_name: string
  support_email: string
  billing_email: string
  setup_fee: string
  trial_days: string
  default_tier: string
  maintenance_mode: string
  allow_new_signups: string
  require_approval: string
  stripe_enabled: string
  invoice_enabled: string
  ach_enabled: string
  check_enabled: string
  check_payable_to: string
  billing_address_line1: string
  billing_address_line2: string
  billing_address_city: string
  billing_address_state: string
  billing_address_zip: string
  starter_monthly: string
  starter_annual: string
  parish_monthly: string
  parish_annual: string
  cathedral_monthly: string
  cathedral_annual: string
  shrine_monthly: string
  shrine_annual: string
  basilica_monthly: string
  basilica_annual: string
  [key: string]: string
}

export default function SettingsPage() {
  const { getToken } = useAuth()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'platform' | 'notifications'>('platform')
  const [clearingTestData, setClearingTestData] = useState(false)
  const [clearResult, setClearResult] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleClearTestData = async () => {
    setClearingTestData(true)
    setClearResult(null)
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/test-data/clear', {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to clear test data')
      setClearResult(data.message)
    } catch (error) {
      setClearResult(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setClearingTestData(false)
      setShowClearConfirm(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setSettings(data.settings)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setSaved(false)
  }

  const handleToggle = (key: string) => {
    if (!settings) return
    const newValue = settings[key] === 'true' ? 'false' : 'true'
    setSettings({ ...settings, [key]: newValue })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-purple-600 animate-spin" />
          <span className="text-gray-600">Loading settings...</span>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600">Configure global platform settings, pricing, and notifications</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('platform')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'platform'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-4 w-4" />
            Platform Settings
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'notifications'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>
        </nav>
      </div>

      {activeTab === 'notifications' ? (
        <MasterAdminNotificationsTab />
      ) : (
        <>
          {/* Save Button */}
          <div className="flex justify-end">
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

          {/* Maintenance Mode Warning */}
          {settings.maintenance_mode === 'true' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Maintenance Mode is ON</p>
                <p className="text-sm text-orange-600">
                  New users cannot access the platform. Only master admins can log in.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">General</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                value={settings.platform_name}
                onChange={(e) => handleChange('platform_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Subscription Tier
              </label>
              <select
                value={settings.default_tier}
                onChange={(e) => handleChange('default_tier', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="starter">Chapel</option>
                <option value="parish">Parish</option>
                <option value="cathedral">Cathedral</option>
                <option value="shrine">Shrine</option>
                <option value="basilica">Basilica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trial Days
              </label>
              <input
                type="number"
                value={settings.trial_days}
                onChange={(e) => handleChange('trial_days', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setup Fee ($)
              </label>
              <input
                type="number"
                value={settings.setup_fee}
                onChange={(e) => handleChange('setup_fee', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Email</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => handleChange('support_email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Email
              </label>
              <input
                type="email"
                value={settings.billing_email}
                onChange={(e) => handleChange('billing_email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Access Control */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Access Control</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-500">Block all non-admin access</p>
              </div>
              <button
                onClick={() => handleToggle('maintenance_mode')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.maintenance_mode === 'true' ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.maintenance_mode === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Allow New Signups</p>
                <p className="text-sm text-gray-500">Accept new organization applications</p>
              </div>
              <button
                onClick={() => handleToggle('allow_new_signups')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.allow_new_signups === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.allow_new_signups === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Require Approval</p>
                <p className="text-sm text-gray-500">New orgs need manual approval</p>
              </div>
              <button
                onClick={() => handleToggle('require_approval')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.require_approval === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.require_approval === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Stripe (Credit Card)</p>
                <p className="text-sm text-gray-500">Accept credit card payments</p>
              </div>
              <button
                onClick={() => handleToggle('stripe_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.stripe_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.stripe_enabled === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Invoice / Check</p>
                <p className="text-sm text-gray-500">Accept manual payments</p>
              </div>
              <button
                onClick={() => handleToggle('invoice_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.invoice_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.invoice_enabled === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">ACH Bank Transfer</p>
                <p className="text-sm text-gray-500">Accept bank transfers</p>
              </div>
              <button
                onClick={() => handleToggle('ach_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.ach_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.ach_enabled === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Check / Money Order</p>
                <p className="text-sm text-gray-500">Show check mailing option on invoices</p>
              </div>
              <button
                onClick={() => handleToggle('check_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.check_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.check_enabled === 'true' ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Check Billing Address */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Check / Mail-In Billing Address</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            This address appears on invoice emails so clients know where to mail checks.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make Check Payable To
              </label>
              <input
                type="text"
                value={settings.check_payable_to}
                onChange={(e) => handleChange('check_payable_to', e.target.value)}
                placeholder="ChiRho Events"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={settings.billing_address_line1}
                onChange={(e) => handleChange('billing_address_line1', e.target.value)}
                placeholder="123 Main St"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2 <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={settings.billing_address_line2}
                onChange={(e) => handleChange('billing_address_line2', e.target.value)}
                placeholder="Suite 100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={settings.billing_address_city}
                  onChange={(e) => handleChange('billing_address_city', e.target.value)}
                  placeholder="City"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={settings.billing_address_state}
                  onChange={(e) => handleChange('billing_address_state', e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={settings.billing_address_zip}
                  onChange={(e) => handleChange('billing_address_zip', e.target.value)}
                  placeholder="78201"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tier Pricing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tier Pricing</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tier</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Monthly ($)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Annual ($)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Monthly Equivalent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { key: 'starter', label: 'Chapel' },
                  { key: 'parish', label: 'Parish' },
                  { key: 'cathedral', label: 'Cathedral' },
                  { key: 'shrine', label: 'Shrine' },
                  { key: 'basilica', label: 'Basilica' },
                ].map((tier) => (
                  <tr key={tier.key}>
                    <td className="py-3 px-4 font-medium text-gray-900">{tier.label}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={settings[`${tier.key}_monthly`]}
                        onChange={(e) => handleChange(`${tier.key}_monthly`, e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={settings[`${tier.key}_annual`]}
                        onChange={(e) => handleChange(`${tier.key}_annual`, e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      ${Math.round(parseInt(settings[`${tier.key}_annual`] || '0') / 12)}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              These actions are irreversible. Use them only to remove test/demo data before going live.
            </p>

            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Clear All Payment Records</p>
                <p className="text-sm text-gray-500">
                  Deletes every payment and payment balance record from the database. This will reset all earnings on the dashboard to $0.
                </p>
              </div>
              <button
                onClick={() => { setShowClearConfirm(true); setClearResult(null) }}
                disabled={clearingTestData}
                className="ml-6 flex-shrink-0 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear Test Data
              </button>
            </div>

            {/* Inline confirmation */}
            {showClearConfirm && (
              <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="font-medium text-red-800 mb-3">
                  Are you sure? This will permanently delete ALL payment records and cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearTestData}
                    disabled={clearingTestData}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {clearingTestData ? 'Clearing...' : 'Yes, delete all payments'}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Result message */}
            {clearResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{clearResult}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
