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
import { Loader2, User, DollarSign, FileText, X, Plus, Pencil, Trash2 } from 'lucide-react'

interface Participant {
  id: string
  firstName: string
  lastName: string
  age: number
  participantType: string
  liabilityFormCompleted: boolean
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
  housingType: string
  registeredAt: string
  participants: Participant[]
  paymentBalance?: PaymentBalance
}

interface EditGroupRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  registration: GroupRegistration | null
  eventId: string
  onUpdate?: () => void
}

export default function EditGroupRegistrationModal({
  isOpen,
  onClose,
  registration,
  eventId,
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
    housingType: '',
    adminNotes: '',
  })
  const [originalTotal, setOriginalTotal] = useState(0)
  const [newTotal, setNewTotal] = useState(0)

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
      const total = registration.paymentBalance?.totalAmountDue || 0
      setOriginalTotal(total)
      setNewTotal(total)
    }
  }, [registration])

  const handleSave = async () => {
    if (!registration) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/group/${registration.id}/edit`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
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

            {/* Price Change Summary */}
            {difference !== 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">Price Change</div>
                    <div className="text-xs text-gray-600">
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
              </Card>
            )}
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-[#1E3A5F]">
                Participants ({registration.participants.length})
              </h3>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            </div>

            <div className="space-y-2">
              {registration.participants.map((participant) => (
                <Card key={participant.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">
                        {participant.firstName} {participant.lastName}
                      </div>
                      <div className="text-sm text-gray-600">
                        Age: {participant.age} • Type: {participant.participantType}
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
                      <Button size="sm" variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
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

            <Button variant="outline" className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              No updates yet
            </div>
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
    </Dialog>
  )
}
