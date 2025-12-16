'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Edit } from 'lucide-react'

interface GroupRegistration {
  id: string
  groupName: string
  parishName: string
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  groupLeaderStreet?: string | null
  groupLeaderCity?: string | null
  groupLeaderState?: string | null
  groupLeaderZip?: string | null
  specialRequests?: string | null
}

interface EditMyRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  registration: GroupRegistration | null
  onSuccess: () => void
}

export default function EditMyRegistrationModal({
  isOpen,
  onClose,
  registration,
  onSuccess,
}: EditMyRegistrationModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    groupLeaderName: '',
    groupLeaderEmail: '',
    groupLeaderPhone: '',
    groupLeaderStreet: '',
    groupLeaderCity: '',
    groupLeaderState: '',
    groupLeaderZip: '',
    specialRequests: '',
  })

  useEffect(() => {
    if (registration) {
      setFormData({
        groupLeaderName: registration.groupLeaderName,
        groupLeaderEmail: registration.groupLeaderEmail,
        groupLeaderPhone: registration.groupLeaderPhone,
        groupLeaderStreet: registration.groupLeaderStreet || '',
        groupLeaderCity: registration.groupLeaderCity || '',
        groupLeaderState: registration.groupLeaderState || '',
        groupLeaderZip: registration.groupLeaderZip || '',
        specialRequests: registration.specialRequests || '',
      })
    }
  }, [registration])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!registration) return

    // Validate required fields
    if (!formData.groupLeaderName || !formData.groupLeaderEmail || !formData.groupLeaderPhone) {
      alert('Name, email, and phone are required fields')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/group-leader/registration/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: registration.id,
          ...formData,
        }),
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to update registration'}`)
      }
    } catch (error) {
      console.error('Error updating registration:', error)
      alert('Failed to update registration')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!registration) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <Edit className="h-5 w-5" />
            Edit My Registration Information
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Update your contact information and special requests for{' '}
            <span className="font-semibold">{registration.groupName}</span> from{' '}
            <span className="font-semibold">{registration.parishName}</span>.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Leader Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">
              Contact Information
            </h3>

            <div>
              <Label htmlFor="groupLeaderName">Your Name *</Label>
              <Input
                id="groupLeaderName"
                value={formData.groupLeaderName}
                onChange={(e) => handleInputChange('groupLeaderName', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupLeaderEmail">Email *</Label>
                <Input
                  id="groupLeaderEmail"
                  type="email"
                  value={formData.groupLeaderEmail}
                  onChange={(e) => handleInputChange('groupLeaderEmail', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderPhone">Phone *</Label>
                <Input
                  id="groupLeaderPhone"
                  type="tel"
                  value={formData.groupLeaderPhone}
                  onChange={(e) => handleInputChange('groupLeaderPhone', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">
              Mailing Address
            </h3>

            <div>
              <Label htmlFor="groupLeaderStreet">Street Address</Label>
              <Input
                id="groupLeaderStreet"
                value={formData.groupLeaderStreet}
                onChange={(e) => handleInputChange('groupLeaderStreet', e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="groupLeaderCity">City</Label>
                <Input
                  id="groupLeaderCity"
                  value={formData.groupLeaderCity}
                  onChange={(e) => handleInputChange('groupLeaderCity', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderState">State</Label>
                <Input
                  id="groupLeaderState"
                  value={formData.groupLeaderState}
                  onChange={(e) => handleInputChange('groupLeaderState', e.target.value)}
                  placeholder="e.g., CA"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="groupLeaderZip">ZIP Code</Label>
                <Input
                  id="groupLeaderZip"
                  value={formData.groupLeaderZip}
                  onChange={(e) => handleInputChange('groupLeaderZip', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">
              Special Requests
            </h3>

            <div>
              <Label htmlFor="specialRequests">Special Requests or Notes</Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                placeholder="Any special requests, dietary needs, accessibility requirements, or other notes for your group..."
                rows={4}
              />
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You can only update your contact information and special requests.
              To change group details, participant counts, or housing type, please contact the event organizers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
