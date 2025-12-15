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
  housingType: string | null
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
        housingType: registration.housingType || 'on_campus',
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
                              }
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price Change */}
                      {edit.oldTotal !== null && edit.newTotal !== null && (
                        <div className="mt-2 text-sm text-gray-600">
                          Price: ${edit.oldTotal.toFixed(2)} → ${edit.newTotal.toFixed(2)}
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
