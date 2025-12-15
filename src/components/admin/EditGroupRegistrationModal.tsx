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
import { Loader2, User, DollarSign, FileText, AlertCircle } from 'lucide-react'
import {
  calculateRegistrationPrice,
  type EventPricing,
} from '@/lib/registration-price-calculator'
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
  const [participantCounts, setParticipantCounts] = useState({
    youth_u18: 0,
    youth_o18: 0,
    chaperone: 0,
    priest: 0,
  })
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

  // Fetch full registration data including participants
  const [fullRegistration, setFullRegistration] = useState<GroupRegistration | null>(null)
  const [loadingRegistration, setLoadingRegistration] = useState(false)

  useEffect(() => {
    if (registration && isOpen) {
      setLoadingRegistration(true)
      fetch(`/api/admin/registrations/group/${registration.id}`)
        .then(res => res.json())
        .then(data => {
          setFullRegistration(data.registration)
          setLoadingRegistration(false)
        })
        .catch(err => {
          console.error('Error fetching registration:', err)
          setLoadingRegistration(false)
        })
    }
  }, [registration, isOpen])

  // Initialize form data when registration changes
  useEffect(() => {
    const regData = fullRegistration || registration
    if (regData) {
      setFormData({
        groupName: regData.groupName,
        parishName: regData.parishName,
        groupLeaderName: regData.groupLeaderName,
        groupLeaderEmail: regData.groupLeaderEmail,
        groupLeaderPhone: regData.groupLeaderPhone,
        housingType: regData.housingType,
        adminNotes: '',
      })

      // Count participants by type - handle case where participants might be undefined
      if (regData.participants && Array.isArray(regData.participants)) {
        const counts = {
          youth_u18: regData.participants.filter((p: Participant) => p.participantType === 'youth_u18').length,
          youth_o18: regData.participants.filter((p: Participant) => p.participantType === 'youth_o18').length,
          chaperone: regData.participants.filter((p: Participant) => p.participantType === 'chaperone').length,
          priest: regData.participants.filter((p: Participant) => p.participantType === 'priest').length,
        }
        setParticipantCounts(counts)
      } else {
        // If no participants array, reset counts to 0
        setParticipantCounts({
          youth_u18: 0,
          youth_o18: 0,
          chaperone: 0,
          priest: 0,
        })
      }

      const total = regData.paymentBalance?.totalAmountDue || 0
      setOriginalTotal(total)
      setNewTotal(total)
    }
  }, [fullRegistration, registration])

  // Recalculate price when housing type or participant counts change
  useEffect(() => {
    const totalCount = participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest

    if (eventPricing && totalCount > 0) {
      // Create temporary participant objects for price calculation
      const tempParticipants: Participant[] = []

      // Add youth under 18
      for (let i = 0; i < participantCounts.youth_u18; i++) {
        tempParticipants.push({
          firstName: 'Youth',
          lastName: `U18-${i + 1}`,
          age: 16,
          participantType: 'youth_u18',
        })
      }

      // Add youth over 18
      for (let i = 0; i < participantCounts.youth_o18; i++) {
        tempParticipants.push({
          firstName: 'Youth',
          lastName: `O18-${i + 1}`,
          age: 19,
          participantType: 'youth_o18',
        })
      }

      // Add chaperones
      for (let i = 0; i < participantCounts.chaperone; i++) {
        tempParticipants.push({
          firstName: 'Chaperone',
          lastName: `${i + 1}`,
          age: 30,
          participantType: 'chaperone',
        })
      }

      // Add priests
      for (let i = 0; i < participantCounts.priest; i++) {
        tempParticipants.push({
          firstName: 'Priest',
          lastName: `${i + 1}`,
          age: 40,
          participantType: 'priest',
        })
      }

      const calculation = calculateRegistrationPrice({
        participants: tempParticipants,
        housingType: formData.housingType,
        pricing: eventPricing,
        registrationDate: registration ? new Date(registration.registeredAt) : new Date(),
      })
      setNewTotal(calculation.total)
      setPriceBreakdown(calculation.breakdown)
    } else if (totalCount === 0) {
      setNewTotal(0)
      setPriceBreakdown([])
    }
  }, [formData.housingType, participantCounts, eventPricing, registration])

  const handleSave = async () => {
    if (!registration) return

    const newTotalParticipants = participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest

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
            totalParticipants: newTotalParticipants,
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
              Participants ({participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest})
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-[#1E3A5F]">
                Total Participants: {participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest}
              </h3>
              <div className="text-sm text-gray-600">
                Original: {registration.totalParticipants}
              </div>
            </div>

            {/* Warning if count reduced */}
            {(participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest) < registration.totalParticipants && (
              <Card className="p-4 bg-yellow-50 border-yellow-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900">Participant Count Reduced</div>
                    <div className="text-sm text-yellow-800 mt-1">
                      You are reducing the participant count from {registration.totalParticipants} to {participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest}. A refund may be needed based on the updated balance.
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Counter Interface */}
            <Card className="p-6">
              <div className="space-y-4">
                {/* Youth Under 18 */}
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <div className="font-medium text-[#1E3A5F]">Youth Under 18</div>
                    <div className="text-xs text-gray-500">Ages 17 and under</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, youth_u18: Math.max(0, prev.youth_u18 - 1)}))}
                      disabled={participantCounts.youth_u18 === 0}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">
                      {participantCounts.youth_u18}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, youth_u18: prev.youth_u18 + 1}))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Youth Over 18 */}
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <div className="font-medium text-[#1E3A5F]">Youth Over 18</div>
                    <div className="text-xs text-gray-500">Ages 18+</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, youth_o18: Math.max(0, prev.youth_o18 - 1)}))}
                      disabled={participantCounts.youth_o18 === 0}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">
                      {participantCounts.youth_o18}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, youth_o18: prev.youth_o18 + 1}))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Chaperones */}
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <div className="font-medium text-[#1E3A5F]">Chaperones</div>
                    <div className="text-xs text-gray-500">Adult supervisors</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, chaperone: Math.max(0, prev.chaperone - 1)}))}
                      disabled={participantCounts.chaperone === 0}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">
                      {participantCounts.chaperone}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, chaperone: prev.chaperone + 1}))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Priests */}
                <div className="flex justify-between items-center py-3">
                  <div>
                    <div className="font-medium text-[#1E3A5F]">Priests</div>
                    <div className="text-xs text-gray-500">Clergy members</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, priest: Math.max(0, prev.priest - 1)}))}
                      disabled={participantCounts.priest === 0}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">
                      {participantCounts.priest}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParticipantCounts(prev => ({...prev, priest: prev.priest + 1}))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Note about existing participants */}
            <div className="text-xs text-gray-500 italic">
              Note: Individual participant records are maintained separately for liability and housing purposes. This counter only updates the total participant count for payment calculations.
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
                    {edit.oldTotal !== null && edit.oldTotal !== undefined && edit.newTotal !== null && edit.newTotal !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        Price: ${Number(edit.oldTotal).toFixed(2)} → ${Number(edit.newTotal).toFixed(2)}
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
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>

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
