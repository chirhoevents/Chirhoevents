'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { HandCoins, Loader2, X } from 'lucide-react'

interface Payout {
  id: string
  amount: number
  method: string
  checkNumber: string | null
  periodStart: string | null
  periodEnd: string | null
  notes: string | null
  createdAt: string
  processedByName: string | null
}

interface OrgBalance {
  id: string
  name: string
  checkPaymentName: string | null
  checkPaymentAddress: string | null
  grossCollected: number
  platformFeesTaken: number
  netOwed: number
  totalPaidOut: number
  balanceOwed: number
  recentPayouts: Payout[]
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export default function PlatformPayoutsPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<OrgBalance[]>([])
  const [payoutOrg, setPayoutOrg] = useState<OrgBalance | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    amount: '',
    method: 'check',
    checkNumber: '',
    periodStart: '',
    periodEnd: '',
    notes: '',
  })

  const fetchData = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/platform-payouts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations)
      } else {
        setError('Failed to load platform-collected organizations')
      }
    } catch {
      setError('Failed to load platform-collected organizations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPayoutForm = (org: OrgBalance) => {
    setPayoutOrg(org)
    setFormError(null)
    setForm({
      amount: org.balanceOwed > 0 ? org.balanceOwed.toFixed(2) : '',
      method: 'check',
      checkNumber: '',
      periodStart: '',
      periodEnd: '',
      notes: '',
    })
  }

  const submitPayout = async () => {
    if (!payoutOrg) return
    setSaving(true)
    setFormError(null)
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/platform-payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          organizationId: payoutOrg.id,
          amount: Number(form.amount),
          method: form.method,
          checkNumber: form.checkNumber || null,
          periodStart: form.periodStart || null,
          periodEnd: form.periodEnd || null,
          notes: form.notes || null,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setPayoutOrg(null)
        fetchData()
      } else {
        setFormError(data.error || 'Failed to record payout')
      }
    } catch {
      setFormError('Failed to record payout')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HandCoins className="h-6 w-6 text-purple-600" />
          Platform Payouts
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Organizations whose card payments are collected into ChiRho Technologies&apos; own Stripe
          account (instead of their own Connect account). Record a check/ACH/wire when you settle
          up with them.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {organizations.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          No organizations are currently set to platform-collected payments. Enable it from an
          organization&apos;s edit page.
        </div>
      )}

      <div className="space-y-4">
        {organizations.map((org) => (
          <div key={org.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{org.name}</h2>
                {org.checkPaymentName && (
                  <p className="text-sm text-gray-500 mt-1">
                    Payable to: {org.checkPaymentName}
                    {org.checkPaymentAddress ? ` — ${org.checkPaymentAddress}` : ''}
                  </p>
                )}
                {!org.checkPaymentName && (
                  <p className="text-sm text-amber-600 mt-1">
                    No payee name/address on file — add one in the org&apos;s edit page.
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Balance Owed</p>
                <p className={`text-2xl font-bold ${org.balanceOwed > 0 ? 'text-purple-700' : 'text-gray-400'}`}>
                  {formatCurrency(org.balanceOwed)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-500">Collected (net of platform fee)</p>
                <p className="font-medium text-gray-900">{formatCurrency(org.netOwed)}</p>
              </div>
              <div>
                <p className="text-gray-500">Already Paid Out</p>
                <p className="font-medium text-gray-900">{formatCurrency(org.totalPaidOut)}</p>
              </div>
              <div className="flex items-end justify-end">
                <button
                  onClick={() => openPayoutForm(org)}
                  disabled={org.balanceOwed <= 0}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Record Payout
                </button>
              </div>
            </div>

            {org.recentPayouts.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Recent Payouts</p>
                <div className="space-y-1">
                  {org.recentPayouts.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm text-gray-600">
                      <span>
                        {new Date(p.createdAt).toLocaleDateString()} — {p.method}
                        {p.checkNumber ? ` #${p.checkNumber}` : ''}
                        {p.processedByName ? ` (by ${p.processedByName})` : ''}
                      </span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {payoutOrg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setPayoutOrg(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Payout</h3>
            <p className="text-sm text-gray-500 mb-4">{payoutOrg.name}</p>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current balance owed: {formatCurrency(payoutOrg.balanceOwed)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="check">Check</option>
                  <option value="ach">ACH</option>
                  <option value="wire">Wire</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {form.method === 'check' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Number</label>
                  <input
                    type="text"
                    value={form.checkNumber}
                    onChange={(e) => setForm({ ...form, checkNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPayoutOrg(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitPayout}
                disabled={saving || !form.amount || Number(form.amount) <= 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Record Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
