'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, User, DollarSign, FileText, X, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import {
  calculateRegistrationPrice,
  type EventPricing,
} from '@/lib/registration-price-calculator'
import ParticipantFormModal from './ParticipantFormModal'
import RefundModal from './RefundModal'

interface Participant {
  id?: string
  firstName: string
  lastName: string
  age: number
  gender?: 'male' | 'female' | 'other'
  participantType: 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'
  liabilityFormCompleted?: boolean
}

interface PaymentBalance {
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  paymentStatus: string
}

interface GroupRegistration {
  id: string
  groupName: string
  parishName: string
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  totalParticipants: number
  housingType: 'on_campus' | 'off_campus' | 'day_pass'
  registeredAt: string
  participants: Participant[]
  paymentBalance?: PaymentBalance
}

interface EditGroupRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  registration: GroupRegistration | null
  eventId: string
  eventPricing: EventPricing | null
  onUpdate?: () => void
}

export default function EditGroupRegistrationModal({
  isOpen,
  onClose,
  registration,
  eventId,
  eventPricing,
  onUpdate,
}: EditGroupRegistrationModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isSaving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    groupName: '',
    parishName: '',
    groupLeaderName: '',
    groupLeaderEmail: '',
    groupLeaderPhone: '',
    housingType: 'on_campus' as 'on_campus' | 'off_campus' | 'day_pass',
    adminNotes: '',
  })
  const [originalTotal, setOriginalTotal] = useState(0)
  const [newTotal, setNewTotal] = useState(0)
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{
    participantType: string
    count: number
    pricePerPerson: number
    subtotal: number
  }>>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
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

  // Initialize form data when registration changes
  useEffect(() => {
    if (registration) {
      setFormData({
        groupName: registration.groupName,
        parishName: registration.parishName,
        groupLeaderName: registration.groupLeaderName,
        groupLeaderEmail: registration.groupLeaderEmail,
        groupLeaderPhone: registration.groupLeaderPhone,
        housingType: registration.housingType,
        adminNotes: '',
      })
      setParticipants(registration.participants)
      const total = registration.paymentBalance?.totalAmountDue || 0
      setOriginalTotal(total)
      setNewTotal(total)
    }
  }, [registration])

  // Recalculate price when housing type or participants change
  useEffect(() => {
    if (eventPricing && participants.length > 0) {
      const calculation = calculateRegistrationPrice({
        participants,
        housingType: formData.housingType,
        pricing: eventPricing,
        registrationDate: registration ? new Date(registration.registeredAt) : new Date(),
      })
      setNewTotal(calculation.total)
      setPriceBreakdown(calculation.breakdown)
    }
  }, [formData.housingType, participants, eventPricing, registration])

  const handleSave = async () => {
    if (!registration) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/group/${registration.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            participants,
            eventId,
            oldTotal: originalTotal,
            newTotal,
          }),
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddParticipant = () => {
    setEditingParticipant(null)
    setShowParticipantModal(true)
  }

  const handleEditParticipant = (participant: Participant) => {
    setEditingParticipant(participant)
    setShowParticipantModal(true)
  }

  const handleRemoveParticipant = (participantId: string) => {
    if (confirm('Are you sure you want to remove this participant? This will recalculate the total price.')) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId))
    }
  }

  const handleSaveParticipant = (participant: Participant) => {
    if (participant.id) {
      // Update existing participant
      setParticipants((prev) =>
        prev.map((p) => (p.id === participant.id ? participant : p))
      )
    } else {
      // Add new participant
      const newParticipant = {
        ...participant,
        id: `temp-${Date.now()}`, // Temporary ID until saved to DB
        liabilityFormCompleted: false,
      }
      setParticipants((prev) => [...prev, newParticipant])
    }
    setShowParticipantModal(false)
    setEditingParticipant(null)
  }

  const fetchAuditTrail = async () => {
    if (!registration) return

    setLoadingAuditTrail(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/${registration.id}/audit?type=group`
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

  const difference = newTotal - originalTotal

  if (!registration) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E3A5F]">
            Edit Group Registration
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Registration ID: {registration.id}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="participants">
              <User className="h-4 w-4 mr-2" />
              Participants ({registration.participants.length})
            </TabsTrigger>
            <TabsTrigger value="payment">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="updates">
              <FileText className="h-4 w-4 mr-2" />
              Updates
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={formData.groupName}
                  onChange={(e) => handleInputChange('groupName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="parishName">Parish Name</Label>
                <Input
                  id="parishName"
                  value={formData.parishName}
                  onChange={(e) => handleInputChange('parishName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderName">Group Leader Name</Label>
                <Input
                  id="groupLeaderName"
                  value={formData.groupLeaderName}
                  onChange={(e) =>
                    handleInputChange('groupLeaderName', e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderEmail">Group Leader Email</Label>
                <Input
                  id="groupLeaderEmail"
                  type="email"
                  value={formData.groupLeaderEmail}
                  onChange={(e) =>
                    handleInputChange('groupLeaderEmail', e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderPhone">Group Leader Phone</Label>
                <Input
                  id="groupLeaderPhone"
                  value={formData.groupLeaderPhone}
                  onChange={(e) =>
                    handleInputChange('groupLeaderPhone', e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="housingType">Housing Type</Label>
                <select
                  id="housingType"
                  value={formData.housingType}
                  onChange={(e) => handleInputChange('housingType', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="on_campus">On Campus</option>
                  <option value="off_campus">Off Campus</option>
                  <option value="day_pass">Day Pass</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={formData.adminNotes}
                onChange={(e) => handleInputChange('adminNotes', e.target.value)}
                placeholder="Add notes about this edit..."
                rows={3}
              />
            </div>

            {/* Live Price Breakdown */}
            {priceBreakdown.length > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-sm text-[#1E3A5F] mb-3">
                  Live Price Calculation
                </h4>
                <div className="space-y-2">
                  {priceBreakdown.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.count}x {item.participantType.replace('_', ' ')} @ $
                        {item.pricePerPerson.toFixed(2)}
                      </span>
                      <span className="font-medium">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>New Total:</span>
                    <span className="text-[#1E3A5F]">${newTotal.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Price Change Summary */}
            {difference !== 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Price Change Detected
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Original: ${originalTotal.toFixed(2)} → New: $
                      {newTotal.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-lg ${
                      difference > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {difference > 0 ? '+' : ''}${difference.toFixed(2)}
                  </div>
                </div>
                {difference > 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    Group will be notified of additional charges
                  </div>
                )}
                {difference < 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    Credit will be applied to balance or refunded if requested
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-[#1E3A5F]">
                Participants ({participants.length})
              </h3>
              <Button size="sm" variant="outline" onClick={handleAddParticipant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            </div>

            <div className="space-y-2">
              {participants.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">No participants yet. Add some to get started!</p>
                </Card>
              ) : (
                participants.map((participant) => (
                  <Card key={participant.id || `${participant.firstName}-${participant.lastName}-${participant.age}`} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">
                          {participant.firstName} {participant.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          Age: {participant.age} • Type:{' '}
                          {participant.participantType.replace('_', ' ')}
                        </div>
                        <Badge
                          variant={
                            participant.liabilityFormCompleted
                              ? 'default'
                              : 'destructive'
                          }
                          className="mt-2"
                        >
                          {participant.liabilityFormCompleted
                            ? 'Form Complete'
                            : 'Form Incomplete'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditParticipant(participant)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => participant.id && handleRemoveParticipant(participant.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-4">
                Payment Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount Due:</span>
                  <span className="font-medium">
                    ${registration.paymentBalance?.totalAmountDue?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">
                    ${registration.paymentBalance?.amountPaid?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Balance Remaining:</span>
                  <span className="font-bold text-[#1E3A5F]">
                    ${registration.paymentBalance?.amountRemaining?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Badge
                  variant={
                    registration.paymentBalance?.paymentStatus === 'paid_full'
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {registration.paymentBalance?.paymentStatus || 'pending'}
                </Badge>
              </div>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowRefundModal(true)}
              disabled={!registration.paymentBalance?.amountPaid || registration.paymentBalance.amountPaid === 0}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
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
                      {edit.difference !== null && edit.difference !== 0 && (
                        <div
                          className={`font-bold text-lg ${
                            edit.difference > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {edit.difference > 0 ? '+' : ''}$
                          {edit.difference.toFixed(2)}
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
                        <div className="font-medium text-blue-900 mb-1">
                          Admin Notes:
                        </div>
                        <div className="text-blue-800">{edit.adminNotes}</div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>

      {/* Participant Form Modal */}
      <ParticipantFormModal
        isOpen={showParticipantModal}
        onClose={() => {
          setShowParticipantModal(false)
          setEditingParticipant(null)
        }}
        participant={editingParticipant}
        onSave={handleSaveParticipant}
      />

      {/* Refund Modal */}
      {registration && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          registrationId={registration.id}
          registrationType="group"
          currentBalance={registration.paymentBalance?.amountRemaining || 0}
          amountPaid={registration.paymentBalance?.amountPaid || 0}
          onRefundProcessed={() => {
            setShowRefundModal(false)
            onUpdate?.()
          }}
        />
      )}
    </Dialog>
  )
}
