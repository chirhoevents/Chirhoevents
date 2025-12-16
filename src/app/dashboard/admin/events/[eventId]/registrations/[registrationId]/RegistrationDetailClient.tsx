'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  DollarSign,
  AlertCircle,
  Calendar,
  User,
  Home,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import RecordAdditionalPaymentModal from '@/components/admin/RecordAdditionalPaymentModal'

interface Event {
  id: string
  name: string
  startDate: Date
  endDate: Date
  pricing: {
    youthRegularPrice: number
    chaperoneRegularPrice: number
    onCampusYouthPrice?: number | null
    offCampusYouthPrice?: number | null
    dayPassYouthPrice?: number | null
    onCampusChaperonePrice?: number | null
    offCampusChaperonePrice?: number | null
    dayPassChaperonePrice?: number | null
  } | null
}

interface IndividualRegistration {
  id: string
  type: 'individual'
  firstName: string
  lastName: string
  preferredName?: string | null
  email: string
  phone: string
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
  emergencyContact1Name: string
  emergencyContact1Phone: string
  emergencyContact1Relation?: string | null
  emergencyContact2Name?: string | null
  emergencyContact2Phone?: string | null
  emergencyContact2Relation?: string | null
  registeredAt: Date
  [key: string]: any
}

interface GroupRegistration {
  id: string
  type: 'group'
  groupName: string
  parishName?: string | null
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  totalParticipants: number
  housingType: string
  registeredAt: Date
  participants?: any[]
  [key: string]: any
}

interface PaymentBalance {
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  paymentStatus: string
}

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  paymentType: string
  paymentStatus: string
  processedAt: Date
  checkNumber?: string | null
  notes?: string | null
}

interface RegistrationDetailClientProps {
  event: Event
  registration: IndividualRegistration | GroupRegistration
  paymentBalance: PaymentBalance | null
  payments: Payment[]
}

export default function RegistrationDetailClient({
  event,
  registration,
  paymentBalance: initialPaymentBalance,
  payments: initialPayments,
}: RegistrationDetailClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentBalance, setPaymentBalance] = useState(initialPaymentBalance)
  const [payments, setPayments] = useState(initialPayments)

  // Form data for individual registration
  const [formData, setFormData] = useState(() => {
    if (registration.type === 'individual') {
      return {
        firstName: registration.firstName,
        lastName: registration.lastName,
        preferredName: registration.preferredName || '',
        email: registration.email,
        phone: registration.phone,
        age: registration.age || 0,
        gender: registration.gender || 'male',
        street: registration.street || '',
        city: registration.city || '',
        state: registration.state || '',
        zip: registration.zip || '',
        housingType: registration.housingType || 'on_campus',
        roomType: registration.roomType || 'double',
        tShirtSize: registration.tShirtSize || '',
        preferredRoommate: registration.preferredRoommate || '',
        dietaryRestrictions: registration.dietaryRestrictions || '',
        adaAccommodations: registration.adaAccommodations || '',
        emergencyContact1Name: registration.emergencyContact1Name,
        emergencyContact1Phone: registration.emergencyContact1Phone,
        emergencyContact1Relation: registration.emergencyContact1Relation || '',
        emergencyContact2Name: registration.emergencyContact2Name || '',
        emergencyContact2Phone: registration.emergencyContact2Phone || '',
        emergencyContact2Relation: registration.emergencyContact2Relation || '',
      }
    }
    return {}
  })

  // Calculate price based on housing type
  const calculatePrice = () => {
    if (registration.type !== 'individual') return paymentBalance?.totalAmountDue || 0
    if (!event.pricing) return paymentBalance?.totalAmountDue || 0

    const housingType = formData.housingType

    // Default to youth regular price
    let basePrice = Number(event.pricing.youthRegularPrice)

    // Adjust based on housing type
    if (housingType === 'on_campus' && event.pricing.onCampusYouthPrice) {
      basePrice = Number(event.pricing.onCampusYouthPrice)
    } else if (housingType === 'off_campus' && event.pricing.offCampusYouthPrice) {
      basePrice = Number(event.pricing.offCampusYouthPrice)
    } else if (housingType === 'day_pass' && event.pricing.dayPassYouthPrice) {
      basePrice = Number(event.pricing.dayPassYouthPrice)
    }

    return basePrice
  }

  const currentPrice = calculatePrice()
  const originalPrice = paymentBalance?.totalAmountDue || 0
  const priceDifference = currentPrice - originalPrice

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/individual/${registration.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            adminNotes: `Updated via full registration edit. ${priceDifference !== 0 ? `Price changed from $${originalPrice} to $${currentPrice}.` : ''}`,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update registration')
      }

      // If price changed, update payment balance
      if (priceDifference !== 0) {
        const updateBalanceResponse = await fetch(
          `/api/admin/registrations/${registration.id}/payment-balance`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              registrationType: registration.type,
              newTotalDue: currentPrice,
            }),
          }
        )

        if (!updateBalanceResponse.ok) {
          throw new Error('Failed to update payment balance')
        }
      }

      alert('Registration updated successfully!')
      router.refresh()
    } catch (error) {
      console.error('Error updating registration:', error)
      alert('Failed to update registration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (registration.type === 'group') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">
              Group registration editing coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/dashboard/admin/events/${event.id}/registrations`}
              className="inline-flex items-center text-sm text-[#9C8466] hover:underline mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Registrations
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">
                  {registration.firstName} {registration.lastName}
                </h1>
                <p className="text-gray-600">
                  Individual Registration for {event.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Registered on {format(new Date(registration.registeredAt), 'MMMM d, yyyy')}
                </p>
              </div>
              <Badge variant={paymentBalance?.paymentStatus === 'paid_full' ? 'default' : 'secondary'}>
                {paymentBalance?.paymentStatus === 'paid_full' ? 'Paid in Full' :
                 paymentBalance?.paymentStatus === 'partial' ? 'Partial Payment' : 'Unpaid'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  <div>
                    <Label htmlFor="preferredName">Preferred Name (Optional)</Label>
                    <Input
                      id="preferredName"
                      value={formData.preferredName}
                      onChange={(e) => handleInputChange('preferredName', e.target.value)}
                      placeholder="Johnny"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="CA"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code *</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        placeholder="12345"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <Label htmlFor="gender">Gender *</Label>
                      <select
                        id="gender"
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="tShirtSize">T-Shirt Size *</Label>
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
                </CardContent>
              </Card>

              {/* Housing & Room Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Housing & Room Preferences
                  </CardTitle>
                  <CardDescription>
                    Changes to housing type will update the registration price
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="housingType">Housing Type *</Label>
                      <select
                        id="housingType"
                        value={formData.housingType}
                        onChange={(e) => handleInputChange('housingType', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="on_campus">On-Campus Housing</option>
                        <option value="off_campus">Off-Campus (Self-Arranged)</option>
                        <option value="day_pass">Day Pass (No Housing)</option>
                      </select>
                    </div>

                    {formData.housingType === 'on_campus' && (
                      <div>
                        <Label htmlFor="roomType">Room Type *</Label>
                        <select
                          id="roomType"
                          value={formData.roomType}
                          onChange={(e) => handleInputChange('roomType', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="single">Single Room</option>
                          <option value="double">Double Room</option>
                          <option value="triple">Triple Room</option>
                          <option value="quad">Quad Room</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {formData.housingType === 'on_campus' && (
                    <div>
                      <Label htmlFor="preferredRoommate">Preferred Roommate (Optional)</Label>
                      <Input
                        id="preferredRoommate"
                        value={formData.preferredRoommate}
                        onChange={(e) => handleInputChange('preferredRoommate', e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dietary & Accommodations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Dietary Restrictions & Accommodations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dietaryRestrictions">Dietary Restrictions (Optional)</Label>
                    <Textarea
                      id="dietaryRestrictions"
                      value={formData.dietaryRestrictions}
                      onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                      rows={3}
                      placeholder="Vegetarian, gluten-free, peanut allergy, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="adaAccommodations">ADA Accommodations (Optional)</Label>
                    <Textarea
                      id="adaAccommodations"
                      value={formData.adaAccommodations}
                      onChange={(e) => handleInputChange('adaAccommodations', e.target.value)}
                      rows={3}
                      placeholder="Wheelchair accessible room, hearing assistance, etc."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Primary Contact */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                    <h3 className="font-semibold text-[#1E3A5F]">Primary Contact *</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="emergencyContact1Name">Name *</Label>
                        <Input
                          id="emergencyContact1Name"
                          value={formData.emergencyContact1Name}
                          onChange={(e) => handleInputChange('emergencyContact1Name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContact1Phone">Phone *</Label>
                        <Input
                          id="emergencyContact1Phone"
                          type="tel"
                          value={formData.emergencyContact1Phone}
                          onChange={(e) => handleInputChange('emergencyContact1Phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContact1Relation">Relationship</Label>
                        <Input
                          id="emergencyContact1Relation"
                          value={formData.emergencyContact1Relation}
                          onChange={(e) => handleInputChange('emergencyContact1Relation', e.target.value)}
                          placeholder="Mother"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Contact */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                    <h3 className="font-semibold text-[#1E3A5F]">Secondary Contact (Optional)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="emergencyContact2Name">Name</Label>
                        <Input
                          id="emergencyContact2Name"
                          value={formData.emergencyContact2Name}
                          onChange={(e) => handleInputChange('emergencyContact2Name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContact2Phone">Phone</Label>
                        <Input
                          id="emergencyContact2Phone"
                          type="tel"
                          value={formData.emergencyContact2Phone}
                          onChange={(e) => handleInputChange('emergencyContact2Phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContact2Relation">Relationship</Label>
                        <Input
                          id="emergencyContact2Relation"
                          value={formData.emergencyContact2Relation}
                          onChange={(e) => handleInputChange('emergencyContact2Relation', e.target.value)}
                          placeholder="Father"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Sidebar - Pricing & Payment */}
            <div className="lg:col-span-1 space-y-6">
              {/* Pricing Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Price:</span>
                      <span className="font-mono font-semibold">
                        ${currentPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Original Price:</span>
                      <span className="font-mono">
                        ${originalPrice.toFixed(2)}
                      </span>
                    </div>
                    {priceDifference !== 0 && (
                      <div className={`flex justify-between text-sm font-semibold ${priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        <span>Price Difference:</span>
                        <span className="font-mono">
                          {priceDifference > 0 ? '+' : ''}${priceDifference.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {priceDifference !== 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <div className="flex gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-amber-900">Price Change</p>
                          <p className="text-amber-700 mt-1">
                            {priceDifference > 0
                              ? `This participant owes an additional $${priceDifference.toFixed(2)} due to housing change.`
                              : `This participant is entitled to a $${Math.abs(priceDifference).toFixed(2)} refund.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Due:</span>
                      <span className="font-mono font-semibold">
                        ${paymentBalance?.totalAmountDue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-mono text-green-600 font-semibold">
                        ${paymentBalance?.amountPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-semibold">Balance Remaining:</span>
                      <span className="font-mono text-orange-600 font-semibold">
                        ${paymentBalance?.amountRemaining.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-[#10B981] hover:bg-[#059669]"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No payments recorded yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="border-b border-gray-200 pb-3 last:border-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">
                                ${payment.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.paymentMethod} • {payment.paymentType}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(payment.processedAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {payment.paymentStatus}
                            </Badge>
                          </div>
                          {payment.checkNumber && (
                            <p className="text-xs text-gray-500 mt-1">
                              Check #{payment.checkNumber}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-gray-600 mt-1">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentBalance && (
        <RecordAdditionalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          registrationId={registration.id}
          registrationType="individual"
          registrationName={`${registration.firstName} ${registration.lastName}`}
          balanceRemaining={paymentBalance.amountRemaining}
          onSuccess={() => {
            setShowPaymentModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
