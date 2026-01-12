'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Plus,
  Ticket,
  Trash2,
  Edit,
  Copy,
  Check,
  X,
  ArrowLeft,
  Calendar,
  Users,
  Percent,
  DollarSign,
} from 'lucide-react'

interface Coupon {
  id: string
  name: string
  code: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  usageLimitType: 'unlimited' | 'single_use' | 'limited'
  usageCount: number
  maxUses: number | null
  isStackable: boolean
  restrictToEmail: string | null
  expirationDate: string | null
  active: boolean
  createdAt: string
}

interface EventData {
  id: string
  name: string
}

export default function CouponsManagementPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { getToken } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Form state for new/edit coupon
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount',
    discountValue: '',
    usageLimitType: 'unlimited' as 'unlimited' | 'single_use' | 'limited',
    maxUses: '',
    isStackable: false,
    restrictToEmail: '',
    expirationDate: '',
    active: true,
  })

  // Load event and coupons
  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    try {
      const token = await getToken()

      // Fetch event details
      const eventResponse = await fetch(`/api/admin/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!eventResponse.ok) throw new Error('Failed to load event')
      const eventData = await eventResponse.json()
      setEvent(eventData.event)

      // Fetch coupons
      const couponsResponse = await fetch(`/api/admin/events/${eventId}/coupons`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (couponsResponse.ok) {
        const couponsData = await couponsResponse.json()
        setCoupons(couponsData.coupons || [])
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      discountType: 'percentage',
      discountValue: '',
      usageLimitType: 'unlimited',
      maxUses: '',
      isStackable: false,
      restrictToEmail: '',
      expirationDate: '',
      active: true,
    })
    setEditingCoupon(null)
    setShowForm(false)
  }

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      name: coupon.name,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      usageLimitType: coupon.usageLimitType,
      maxUses: coupon.maxUses?.toString() || '',
      isStackable: coupon.isStackable,
      restrictToEmail: coupon.restrictToEmail || '',
      expirationDate: coupon.expirationDate ? coupon.expirationDate.split('T')[0] : '',
      active: coupon.active,
    })
    setEditingCoupon(coupon)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      const url = editingCoupon
        ? `/api/admin/events/${eventId}/coupons/${editingCoupon.id}`
        : `/api/admin/events/${eventId}/coupons`
      const method = editingCoupon ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code.toUpperCase(),
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          usageLimitType: formData.usageLimitType,
          maxUses: formData.usageLimitType === 'limited' ? parseInt(formData.maxUses) : null,
          isStackable: formData.isStackable,
          restrictToEmail: formData.restrictToEmail || null,
          expirationDate: formData.expirationDate || null,
          active: formData.active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save coupon')
      }

      await loadData()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return

    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/coupons/${couponId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) throw new Error('Failed to delete coupon')
      await loadData()
    } catch (err) {
      setError('Failed to delete coupon')
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...coupon, active: !coupon.active }),
      })

      if (!response.ok) throw new Error('Failed to update coupon')
      await loadData()
    } catch (err) {
      setError('Failed to update coupon')
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/admin/events/${eventId}`}
            className="text-sm text-[#6B7280] hover:text-[#1E3A5F] flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Manage Coupons</h1>
          <p className="text-[#6B7280]">{event?.name}</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create/Edit Coupon Form */}
      {showForm && (
        <Card className="border-[#1E3A5F] border-2">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">
              {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            </CardTitle>
            <CardDescription>
              {editingCoupon
                ? 'Update the coupon details below'
                : 'Fill in the details to create a new coupon code'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name">Coupon Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Early Bird Discount"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <Label htmlFor="code">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="EARLYBIRD"
                      required
                      className="uppercase"
                    />
                    <Button type="button" variant="outline" onClick={generateCode}>
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Discount Type */}
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <select
                    id="discountType"
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed_amount' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <Label htmlFor="discountValue">
                    Discount Value {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    step={formData.discountType === 'percentage' ? '1' : '0.01'}
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'percentage' ? '10' : '25.00'}
                    required
                  />
                </div>

                {/* Usage Limit Type */}
                <div>
                  <Label htmlFor="usageLimitType">Usage Limit</Label>
                  <select
                    id="usageLimitType"
                    value={formData.usageLimitType}
                    onChange={(e) => setFormData({ ...formData, usageLimitType: e.target.value as 'unlimited' | 'single_use' | 'limited' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    <option value="unlimited">Unlimited Uses</option>
                    <option value="single_use">Single Use (One Time)</option>
                    <option value="limited">Limited Uses</option>
                  </select>
                </div>

                {/* Max Uses (if limited) */}
                {formData.usageLimitType === 'limited' && (
                  <div>
                    <Label htmlFor="maxUses">Maximum Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>
                )}

                {/* Expiration Date */}
                <div>
                  <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  />
                </div>

                {/* Restrict to Email */}
                <div>
                  <Label htmlFor="restrictToEmail">Restrict to Email (Optional)</Label>
                  <Input
                    id="restrictToEmail"
                    type="email"
                    value={formData.restrictToEmail}
                    onChange={(e) => setFormData({ ...formData, restrictToEmail: e.target.value })}
                    placeholder="specific@email.com"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isStackable}
                    onChange={(e) => setFormData({ ...formData, isStackable: e.target.checked })}
                    className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                  />
                  <span className="text-sm">Stackable with other coupons</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F] flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Coupons ({coupons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280]">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No coupons created yet.</p>
              <p className="text-sm">Click "Create Coupon" to add your first coupon code.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`border rounded-lg p-4 ${
                    coupon.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[#1E3A5F]">{coupon.name}</h3>
                        <Badge variant={coupon.active ? 'default' : 'secondary'}>
                          {coupon.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {coupon.expirationDate && new Date(coupon.expirationDate) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <code className="bg-gray-100 px-3 py-1 rounded text-lg font-mono font-bold text-[#1E3A5F]">
                          {coupon.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(coupon.code)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          {coupon.discountType === 'percentage' ? (
                            <Percent className="h-4 w-4" />
                          ) : (
                            <DollarSign className="h-4 w-4" />
                          )}
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% off`
                            : `$${coupon.discountValue.toFixed(2)} off`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {coupon.usageLimitType === 'unlimited'
                            ? `${coupon.usageCount} uses (unlimited)`
                            : coupon.usageLimitType === 'single_use'
                            ? `${coupon.usageCount}/1 use`
                            : `${coupon.usageCount}/${coupon.maxUses} uses`}
                        </span>
                        {coupon.expirationDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Expires: {new Date(coupon.expirationDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(coupon)}
                        title={coupon.active ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.active ? (
                          <X className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(coupon.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
