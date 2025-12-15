'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Participant {
  id?: string
  firstName: string
  lastName: string
  age: number
  gender?: 'male' | 'female' | 'other'
  participantType: 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'
  liabilityFormCompleted?: boolean
}

interface ParticipantFormModalProps {
  isOpen: boolean
  onClose: () => void
  participant: Participant | null
  onSave: (participant: Participant) => void
}

export default function ParticipantFormModal({
  isOpen,
  onClose,
  participant,
  onSave,
}: ParticipantFormModalProps) {
  const [formData, setFormData] = useState<Participant>({
    firstName: '',
    lastName: '',
    age: 16,
    gender: 'other',
    participantType: 'youth_u18',
  })
  const [isSaving, setSaving] = useState(false)

  useEffect(() => {
    if (participant) {
      setFormData({ ...participant, gender: participant.gender || 'other' })
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        age: 16,
        gender: 'other',
        participantType: 'youth_u18',
      })
    }
  }, [participant, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Validate
    if (!formData.firstName || !formData.lastName || !formData.age) {
      alert('Please fill in all required fields')
      setSaving(false)
      return
    }

    // Auto-set participant type based on age if needed
    if (formData.age < 18 && formData.participantType === 'youth_o18') {
      formData.participantType = 'youth_u18'
    }

    onSave(formData)
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[#1E3A5F]">
            {participant?.id ? 'Edit Participant' : 'Add Participant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="age">
                Age <span className="text-red-500">*</span>
              </Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: parseInt(e.target.value) })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="gender">
                Gender <span className="text-red-500">*</span>
              </Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gender: e.target.value as 'male' | 'female' | 'other',
                  })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other/Prefer not to say</option>
              </select>
            </div>

            <div>
              <Label htmlFor="participantType">
                Participant Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="participantType"
                value={formData.participantType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    participantType: e.target.value as Participant['participantType'],
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="youth_u18">Youth (Under 18)</option>
                <option value="youth_o18">Youth (18+)</option>
                <option value="chaperone">Chaperone</option>
                <option value="priest">Priest</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {participant?.id ? 'Update' : 'Add'} Participant
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
