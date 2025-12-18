'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Save } from 'lucide-react'

interface EditRegistrationModalProps {
  registrationId: string
  onClose: () => void
  onSaved: () => void
}

interface RegistrationData {
  groupName: string
  parishName: string | null
  dioceseName: string | null
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  groupLeaderStreet: string | null
  groupLeaderCity: string | null
  groupLeaderState: string | null
  groupLeaderZip: string | null
  alternativeContact1Name: string | null
  alternativeContact1Email: string | null
  alternativeContact1Phone: string | null
  alternativeContact2Name: string | null
  alternativeContact2Email: string | null
  alternativeContact2Phone: string | null
  youthCount: number
  chaperoneCount: number
  priestCount: number
  housingType: string
  specialRequests: string | null
  dietaryRestrictionsSummary: string | null
  adaAccommodationsSummary: string | null
}

export default function EditRegistrationModal({
  registrationId,
  onClose,
  onSaved,
}: EditRegistrationModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<RegistrationData | null>(null)

  useEffect(() => {
    const fetchRegistration = async () => {
      try {
        const response = await fetch(
          `/api/group-leader/registration?id=${registrationId}`
        )
        if (response.ok) {
          const regData = await response.json()
          setData(regData)
        }
      } catch (error) {
        console.error('Error fetching registration:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRegistration()
  }, [registrationId])

  const handleSave = async () => {
    if (!data) return

    setSaving(true)
    try {
      const response = await fetch('/api/group-leader/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: registrationId, ...data }),
      })

      if (response.ok) {
        onSaved()
      } else {
        alert('Failed to save changes')
      }
    } catch (error) {
      console.error('Error saving registration:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof RegistrationData, value: any) => {
    if (data) {
      setData({ ...data, [field]: value })
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-[#1E3A5F]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-600">Failed to load registration data</p>
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#1E3A5F]">
            Edit Registration Details
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1E3A5F]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Group Information */}
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Group Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  value={data.groupName}
                  onChange={(e) => updateField('groupName', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="parishName">Parish Name</Label>
                <Input
                  id="parishName"
                  value={data.parishName || ''}
                  onChange={(e) => updateField('parishName', e.target.value || null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dioceseName">Diocese Name</Label>
                <Input
                  id="dioceseName"
                  value={data.dioceseName || ''}
                  onChange={(e) => updateField('dioceseName', e.target.value || null)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Group Leader Contact */}
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Group Leader Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupLeaderName">Name *</Label>
                <Input
                  id="groupLeaderName"
                  value={data.groupLeaderName}
                  onChange={(e) => updateField('groupLeaderName', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="groupLeaderEmail">Email *</Label>
                <Input
                  id="groupLeaderEmail"
                  type="email"
                  value={data.groupLeaderEmail}
                  onChange={(e) => updateField('groupLeaderEmail', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="groupLeaderPhone">Phone *</Label>
                <Input
                  id="groupLeaderPhone"
                  value={data.groupLeaderPhone}
                  onChange={(e) => updateField('groupLeaderPhone', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="groupLeaderStreet">Street Address</Label>
                <Input
                  id="groupLeaderStreet"
                  value={data.groupLeaderStreet || ''}
                  onChange={(e) =>
                    updateField('groupLeaderStreet', e.target.value || null)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="groupLeaderCity">City</Label>
                <Input
                  id="groupLeaderCity"
                  value={data.groupLeaderCity || ''}
                  onChange={(e) =>
                    updateField('groupLeaderCity', e.target.value || null)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="groupLeaderState">State</Label>
                <Input
                  id="groupLeaderState"
                  value={data.groupLeaderState || ''}
                  onChange={(e) =>
                    updateField('groupLeaderState', e.target.value || null)
                  }
                  maxLength={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="groupLeaderZip">Zip Code</Label>
                <Input
                  id="groupLeaderZip"
                  value={data.groupLeaderZip || ''}
                  onChange={(e) =>
                    updateField('groupLeaderZip', e.target.value || null)
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Alternative Contacts */}
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Alternative Contacts
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="alt1Name">Contact 1 Name</Label>
                  <Input
                    id="alt1Name"
                    value={data.alternativeContact1Name || ''}
                    onChange={(e) =>
                      updateField('alternativeContact1Name', e.target.value || null)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="alt1Email">Contact 1 Email</Label>
                  <Input
                    id="alt1Email"
                    type="email"
                    value={data.alternativeContact1Email || ''}
                    onChange={(e) =>
                      updateField('alternativeContact1Email', e.target.value || null)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="alt1Phone">Contact 1 Phone</Label>
                  <Input
                    id="alt1Phone"
                    value={data.alternativeContact1Phone || ''}
                    onChange={(e) =>
                      updateField('alternativeContact1Phone', e.target.value || null)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="alt2Name">Contact 2 Name</Label>
                  <Input
                    id="alt2Name"
                    value={data.alternativeContact2Name || ''}
                    onChange={(e) =>
                      updateField('alternativeContact2Name', e.target.value || null)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="alt2Email">Contact 2 Email</Label>
                  <Input
                    id="alt2Email"
                    type="email"
                    value={data.alternativeContact2Email || ''}
                    onChange={(e) =>
                      updateField('alternativeContact2Email', e.target.value || null)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="alt2Phone">Contact 2 Phone</Label>
                  <Input
                    id="alt2Phone"
                    value={data.alternativeContact2Phone || ''}
                    onChange={(e) =>
                      updateField('alternativeContact2Phone', e.target.value || null)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Participant Counts */}
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-2">
              Participant Counts
            </h3>
            <div className="bg-[#F5F1E8] border border-[#9C8466] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#1E3A5F] font-medium mb-1">
                📋 Note: Participant counts cannot be changed here
              </p>
              <p className="text-xs text-[#6B7280]">
                To modify participant numbers (youth, chaperones, priests), please contact the event organization administrator. Changes affect payment calculations and liability requirements.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="youthCount">Youth</Label>
                <Input
                  id="youthCount"
                  type="number"
                  value={data.youthCount}
                  disabled
                  className="mt-1 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="chaperoneCount">Chaperones</Label>
                <Input
                  id="chaperoneCount"
                  type="number"
                  value={data.chaperoneCount}
                  disabled
                  className="mt-1 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="priestCount">Priests</Label>
                <Input
                  id="priestCount"
                  type="number"
                  value={data.priestCount}
                  disabled
                  className="mt-1 bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-sm text-[#6B7280] mt-2">
              Total Participants: {data.youthCount + data.chaperoneCount + data.priestCount}
            </p>
          </div>

          {/* Housing & Special Requests */}
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
              Housing & Special Requests
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="housingType">Housing Type *</Label>
                <Select
                  value={data.housingType}
                  onValueChange={(value) => updateField('housingType', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="host_family">Host Family</SelectItem>
                    <SelectItem value="camping">Camping</SelectItem>
                    <SelectItem value="commute">Commute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={data.specialRequests || ''}
                  onChange={(e) =>
                    updateField('specialRequests', e.target.value || null)
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions Summary</Label>
                <Textarea
                  id="dietaryRestrictions"
                  value={data.dietaryRestrictionsSummary || ''}
                  onChange={(e) =>
                    updateField('dietaryRestrictionsSummary', e.target.value || null)
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="adaAccommodations">ADA Accommodations Summary</Label>
                <Textarea
                  id="adaAccommodations"
                  value={data.adaAccommodationsSummary || ''}
                  onChange={(e) =>
                    updateField('adaAccommodationsSummary', e.target.value || null)
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-[#D1D5DB]"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
