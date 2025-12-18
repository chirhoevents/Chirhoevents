'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import RefundModal from './RefundModal'
import RecordAdditionalPaymentModal from './RecordAdditionalPaymentModal'

interface IndividualRegistration {
  id: string
  firstName: string
  lastName: string
  preferredName?: string | null
  email: string
  phone: string | null
  age: number | null
  gender?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  housingType: string | null
  roomType?: string | null
  tShirtSize?: string | null
  preferredRoommate?: string | null
  dietaryRestrictions?: string | null
  adaAccommodations?: string | null
  emergencyContact1Name?: string | null
  emergencyContact1Phone?: string | null
  emergencyContact1Relation?: string | null
  emergencyContact2Name?: string | null
  emergencyContact2Phone?: string | null
  emergencyContact2Relation?: string | null
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: string
  registeredAt: string
}

interface EditIndividualRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  registration: IndividualRegistration | null
  eventId: string
  onUpdate?: () => void
}

export default function EditIndividualRegistrationModal({
  isOpen,
  onClose,
  registration,
  eventId,
  onUpdate,
}: EditIndividualRegistrationModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showRecordAdditionalPaymentModal, setShowRecordAdditionalPaymentModal] = useState(false)
  const [auditTrail, setAuditTrail] = useState<Array<{
    id: string
    editedAt: string
    editType: string
    changesMade: Record<string, unknown> | null
    oldTotal: number | null
    newTotal: number | null
    difference: number | null
    adminNotes: string | null
    editedBy: {
      firstName: string
      lastName: string
      email: string
    }
  }>>([])
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false)
  const [eventPricing, setEventPricing] = useState<{
    onCampusSinglePrice?: number | null
    onCampusDoublePrice?: number | null
    onCampusSharedPrice?: number | null
    offCampusPrice?: number | null
    dayPassPrice?: number | null
  } | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    age: 0,
    gender: 'male',
    street: '',
    city: '',
    state: '',
    zip: '',
    housingType: 'on_campus',
    roomType: 'single',
    tShirtSize: '',
    preferredRoommate: '',
    dietaryRestrictions: '',
    adaAccommodations: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relation: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relation: '',
    adminNotes: '',
  })

  // Reset form when registration changes
  useEffect(() => {
    if (registration) {
      setFormData({
        firstName: registration.firstName,
        lastName: registration.lastName,
        preferredName: registration.preferredName || '',
        email: registration.email,
        phone: registration.phone || '',
        age: registration.age || 0,
        gender: registration.gender || 'male',
        street: registration.street || '',
        city: registration.city || '',
        state: registration.state || '',
        zip: registration.zip || '',
        housingType: registration.housingType || 'on_campus',
        roomType: registration.roomType || 'single',
        tShirtSize: registration.tShirtSize || '',
        preferredRoommate: registration.preferredRoommate || '',
        dietaryRestrictions: registration.dietaryRestrictions || '',
        adaAccommodations: registration.adaAccommodations || '',
        emergencyContact1Name: registration.emergencyContact1Name || '',
        emergencyContact1Phone: registration.emergencyContact1Phone || '',
        emergencyContact1Relation: registration.emergencyContact1Relation || '',
        emergencyContact2Name: registration.emergencyContact2Name || '',
        emergencyContact2Phone: registration.emergencyContact2Phone || '',
        emergencyContact2Relation: registration.emergencyContact2Relation || '',
        adminNotes: '',
      })
    }
  }, [registration])

  const handleSave = async () => {
    if (!registration) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/individual/${registration.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update registration')
      }

      onUpdate?.()
      onClose()
    } catch (error) {
      console.error('Error updating registration:', error)
      alert('Failed to update registration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const fetchAuditTrail = async () => {
    if (!registration) return

    setLoadingAuditTrail(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/${registration.id}/audit?type=individual`
      )
      if (response.ok) {
        const data = await response.json()
        setAuditTrail(data.edits || [])
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error)
    } finally {
      setLoadingAuditTrail(false)
    }
  }

  const fetchEventPricing = async () => {
    if (!eventId) return

    try {
      const response = await fetch(`/api/admin/events/${eventId}/pricing`)
      if (response.ok) {
        const data = await response.json()
        setEventPricing(data.individualPricing || null)
      }
    } catch (error) {
      console.error('Error fetching event pricing:', error)
    }
  }

  // Fetch event pricing when modal opens
  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventPricing()
    }
  }, [isOpen, eventId])

  // Fetch audit trail when Updates tab is activated
  useEffect(() => {
    if (activeTab === 'updates' && registration && auditTrail.length === 0) {
      fetchAuditTrail()
    }
  }, [activeTab, registration])

  if (!registration) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Registration - {registration.firstName} {registration.lastName}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#1E3A5F]">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredName">Preferred Name</Label>
                    <Input
                      id="preferredName"
                      value={formData.preferredName}
                      onChange={(e) => handleInputChange('preferredName', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="tShirtSize">T-Shirt Size</Label>
                    <select
                      id="tShirtSize"
                      value={formData.tShirtSize}
                      onChange={(e) => handleInputChange('tShirtSize', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select size</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="2XL">2XL</option>
                      <option value="3XL">3XL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-[#1E3A5F]">Contact Information</h3>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-[#1E3A5F]">Address</h3>
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="e.g., CA"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Housing Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-[#1E3A5F]">Housing Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="housingType">Housing Type</Label>
                    <select
                      id="housingType"
                      value={formData.housingType}
                      onChange={(e) => handleInputChange('housingType', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="on_campus">On Campus (see room type for price)</option>
                      {eventPricing?.offCampusPrice ? (
                        <option value="off_campus">
                          Off Campus - ${eventPricing.offCampusPrice.toFixed(2)}
                        </option>
                      ) : (
                        <option value="off_campus">Off Campus</option>
                      )}
                      {eventPricing?.dayPassPrice ? (
                        <option value="day_pass">
                          Day Pass - ${eventPricing.dayPassPrice.toFixed(2)}
                        </option>
                      ) : (
                        <option value="day_pass">Day Pass</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="roomType">Room Type</Label>
                    <select
                      id="roomType"
                      value={formData.roomType}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={formData.housingType !== 'on_campus'}
                    >
                      {eventPricing?.onCampusSinglePrice && (
                        <option value="single">
                          Single - ${eventPricing.onCampusSinglePrice.toFixed(2)}
                        </option>
                      )}
                      {eventPricing?.onCampusDoublePrice && (
                        <option value="double">
                          Double - ${eventPricing.onCampusDoublePrice.toFixed(2)}
                        </option>
                      )}
                      {eventPricing?.onCampusSharedPrice && (
                        <option value="shared">
                          Shared - ${eventPricing.onCampusSharedPrice.toFixed(2)}
                        </option>
                      )}
                      {!eventPricing && (
                        <>
                          <option value="single">Single</option>
                          <option value="double">Double</option>
                          <option value="shared">Shared</option>
                        </>
                      )}
                    </select>
                    {formData.housingType !== 'on_campus' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Room type only applies to on-campus housing
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="preferredRoommate">Preferred Roommate</Label>
                  <Input
                    id="preferredRoommate"
                    value={formData.preferredRoommate}
                    onChange={(e) => handleInputChange('preferredRoommate', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Special Needs */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-[#1E3A5F]">Special Needs & Accommodations</h3>
                <div>
                  <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                  <Textarea
                    id="dietaryRestrictions"
                    value={formData.dietaryRestrictions}
                    onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                    placeholder="Any dietary restrictions or allergies..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="adaAccommodations">ADA Accommodations</Label>
                  <Textarea
                    id="adaAccommodations"
                    value={formData.adaAccommodations}
                    onChange={(e) => handleInputChange('adaAccommodations', e.target.value)}
                    placeholder="Any accessibility needs or accommodations..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-[#1E3A5F]">Emergency Contacts</h3>

                {/* Primary Emergency Contact */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-semibold text-[#1E3A5F]">Primary Contact *</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyContact1Name">Name *</Label>
                      <Input
                        id="emergencyContact1Name"
                        value={formData.emergencyContact1Name}
                        onChange={(e) => handleInputChange('emergencyContact1Name', e.target.value)}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContact1Phone">Phone *</Label>
                      <Input
                        id="emergencyContact1Phone"
                        type="tel"
                        value={formData.emergencyContact1Phone}
                        onChange={(e) => handleInputChange('emergencyContact1Phone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact1Relation">Relationship</Label>
                    <Input
                      id="emergencyContact1Relation"
                      value={formData.emergencyContact1Relation}
                      onChange={(e) => handleInputChange('emergencyContact1Relation', e.target.value)}
                      placeholder="e.g., Mother, Father, Spouse"
                    />
                  </div>
                </div>

                {/* Secondary Emergency Contact */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-semibold text-[#1E3A5F]">Secondary Contact (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyContact2Name">Name</Label>
                      <Input
                        id="emergencyContact2Name"
                        value={formData.emergencyContact2Name}
                        onChange={(e) => handleInputChange('emergencyContact2Name', e.target.value)}
                        placeholder="Secondary contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContact2Phone">Phone</Label>
                      <Input
                        id="emergencyContact2Phone"
                        type="tel"
                        value={formData.emergencyContact2Phone}
                        onChange={(e) => handleInputChange('emergencyContact2Phone', e.target.value)}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact2Relation">Relationship</Label>
                    <Input
                      id="emergencyContact2Relation"
                      value={formData.emergencyContact2Relation}
                      onChange={(e) => handleInputChange('emergencyContact2Relation', e.target.value)}
                      placeholder="e.g., Friend, Sibling"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={formData.adminNotes}
                  onChange={(e) => handleInputChange('adminNotes', e.target.value)}
                  placeholder="Add any notes about this edit..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Payment Tab */}
            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Summary
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-mono font-semibold">
                        ${registration.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-mono text-green-600 font-semibold">
                        ${registration.amountPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-mono text-orange-600 font-semibold">
                        ${registration.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Payment Status:</span>
                      <Badge
                        variant={
                          registration.paymentStatus === 'paid'
                            ? 'default'
                            : registration.paymentStatus === 'partial'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {registration.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t space-y-3">
                    <Button
                      onClick={() => setShowRecordAdditionalPaymentModal(true)}
                      className="w-full bg-[#10B981] hover:bg-[#059669]"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      + Record Additional Payment
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Record any payment: check, card, cash, wire transfer, etc.
                    </p>

                    <Button
                      variant="outline"
                      onClick={() => setShowRefundModal(true)}
                      className="w-full"
                      disabled={registration.amountPaid <= 0}
                    >
                      Process Refund
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Updates Tab */}
            <TabsContent value="updates" className="space-y-4">
              {loadingAuditTrail ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1E3A5F]" />
                  <span className="ml-2 text-gray-600">Loading updates...</span>
                </div>
              ) : auditTrail.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No updates yet
                </div>
              ) : (
                <div className="space-y-3">
                  {auditTrail.map((edit) => (
                    <Card key={edit.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {edit.editType.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {new Date(edit.editedAt).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            By {edit.editedBy.firstName} {edit.editedBy.lastName} (
                            {edit.editedBy.email})
                          </div>
                        </div>
                        {edit.difference !== null && edit.difference !== undefined && edit.difference !== 0 && (
                          <div
                            className={`font-bold text-lg ${
                              edit.difference > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {edit.difference > 0 ? '+' : ''}$
                            {Number(edit.difference).toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Changes Made */}
                      {edit.changesMade && Object.keys(edit.changesMade).length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          <div className="font-medium mb-2">Changes:</div>
                          <div className="space-y-1">
                            {Object.entries(edit.changesMade).map(
                              ([field, change]: [string, unknown]) => {
                                // Check if this is an old/new format or a direct value
                                const isOldNewFormat = change && typeof change === 'object' && 'old' in change && 'new' in change

                                if (isOldNewFormat) {
                                  const changeObj = change as {old: unknown; new: unknown}
                                  return (
                                    <div key={field} className="text-xs">
                                      <span className="font-medium">
                                        {field.replace(/([A-Z])/g, ' $1').trim()}:
                                      </span>{' '}
                                      <span className="text-gray-600">
                                        {typeof changeObj.old === 'object'
                                          ? JSON.stringify(changeObj.old)
                                          : String(changeObj.old || 'N/A')}
                                      </span>
                                      {' → '}
                                      <span className="text-gray-900">
                                        {typeof changeObj.new === 'object'
                                          ? JSON.stringify(changeObj.new)
                                          : String(changeObj.new)}
                                      </span>
                                    </div>
                                  )
                                } else {
                                  // Direct value (e.g., refund fields)
                                  return (
                                    <div key={field} className="text-xs">
                                      <span className="font-medium">
                                        {field.replace(/([A-Z])/g, ' $1').trim()}:
                                      </span>{' '}
                                      <span className="text-gray-900">
                                        {typeof change === 'number' && field.toLowerCase().includes('amount')
                                          ? `$${Number(change).toFixed(2)}`
                                          : String(change)}
                                      </span>
                                    </div>
                                  )
                                }
                              }
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price Change */}
                      {edit.oldTotal !== null && edit.oldTotal !== undefined && edit.newTotal !== null && edit.newTotal !== undefined && (
                        <div className="mt-2 text-sm text-gray-600">
                          Price: ${Number(edit.oldTotal).toFixed(2)} → ${Number(edit.newTotal).toFixed(2)}
                        </div>
                      )}

                      {/* Admin Notes */}
                      {edit.adminNotes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                          <div className="font-medium mb-1">Admin Notes:</div>
                          <div>{edit.adminNotes}</div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Additional Payment Modal */}
      <RecordAdditionalPaymentModal
        isOpen={showRecordAdditionalPaymentModal}
        onClose={() => setShowRecordAdditionalPaymentModal(false)}
        registrationId={registration.id}
        registrationType="individual"
        registrationName={`${registration.firstName} ${registration.lastName}`}
        balanceRemaining={registration.balance}
        onSuccess={() => {
          setShowRecordAdditionalPaymentModal(false)
          onUpdate?.()
        }}
      />

      {/* Refund Modal */}
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        registrationId={registration.id}
        registrationType="individual"
        amountPaid={registration.amountPaid}
        currentBalance={registration.balance}
        onRefundProcessed={() => {
          setShowRefundModal(false)
          onUpdate?.()
        }}
      />
    </>
  )
}
