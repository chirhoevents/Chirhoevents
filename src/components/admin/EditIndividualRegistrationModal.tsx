'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import RefundModal from './RefundModal'

interface IndividualRegistration {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  age: number | null
  housingType: string
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

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: 0,
    housingType: 'on_campus',
  })

  // Reset form when registration changes
  useEffect(() => {
    if (registration) {
      setFormData({
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone || '',
        age: registration.age || 0,
        housingType: registration.housingType,
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
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="housingType">Housing Type</Label>
                  <select
                    id="housingType"
                    value={formData.housingType}
                    onChange={(e) => handleInputChange('housingType', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="on_campus">On Campus</option>
                    <option value="off_campus">Off Campus</option>
                    <option value="day_pass">Day Pass</option>
                  </select>
                </div>
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

                  <div className="mt-6 pt-6 border-t">
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
            <TabsContent value="updates">
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500 text-center py-8">
                    Audit trail coming soon...
                  </p>
                </CardContent>
              </Card>
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
