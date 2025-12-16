'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, User, Save } from 'lucide-react'

interface LiabilityFormData {
  participantPhone?: string
  medicalConditions?: string
  medications?: string
  allergies?: string
  dietaryRestrictions?: string
  adaAccommodations?: string
  emergencyContact1Name?: string
  emergencyContact1Phone?: string
  emergencyContact1Relation?: string
  emergencyContact2Name?: string
  emergencyContact2Phone?: string
  emergencyContact2Relation?: string
  insuranceProvider?: string
  insurancePolicyNumber?: string
  insuranceGroupNumber?: string
  parentEmail?: string
}

interface Participant {
  id?: string
  firstName: string
  lastName: string
  preferredName?: string
  email?: string
  age: number
  gender: 'male' | 'female' | 'other'
  participantType: 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'
  tShirtSize?: string
  liabilityFormCompleted?: boolean
  liabilityForm?: LiabilityFormData
}

interface EditParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  participant: Participant | null
  onSuccess: () => void
}

export default function EditParticipantModal({
  isOpen,
  onClose,
  participant,
  onSuccess,
}: EditParticipantModalProps) {
  const [saving, setSaving] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [formData, setFormData] = useState({
    // Basic Info
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    age: '',
    gender: 'male' as 'male' | 'female' | 'other',
    participantType: 'youth_u18' as 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest',
    tShirtSize: '',

    // Contact Info (from liability form)
    participantPhone: '',

    // Medical Info
    medicalConditions: '',
    medications: '',
    allergies: '',
    dietaryRestrictions: '',
    adaAccommodations: '',

    // Emergency Contacts
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relation: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relation: '',

    // Insurance
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceGroupNumber: '',

    // Parent/Guardian (for youth under 18)
    parentEmail: '',

    // Admin notes
    adminNotes: '',
  })

  useEffect(() => {
    if (participant && isOpen) {
      setFormData({
        firstName: participant.firstName || '',
        lastName: participant.lastName || '',
        preferredName: participant.preferredName || '',
        email: participant.email || '',
        age: participant.age?.toString() || '',
        gender: participant.gender || 'male',
        participantType: participant.participantType || 'youth_u18',
        tShirtSize: participant.tShirtSize || '',

        participantPhone: participant.liabilityForm?.participantPhone || '',

        medicalConditions: participant.liabilityForm?.medicalConditions || '',
        medications: participant.liabilityForm?.medications || '',
        allergies: participant.liabilityForm?.allergies || '',
        dietaryRestrictions: participant.liabilityForm?.dietaryRestrictions || '',
        adaAccommodations: participant.liabilityForm?.adaAccommodations || '',

        emergencyContact1Name: participant.liabilityForm?.emergencyContact1Name || '',
        emergencyContact1Phone: participant.liabilityForm?.emergencyContact1Phone || '',
        emergencyContact1Relation: participant.liabilityForm?.emergencyContact1Relation || '',
        emergencyContact2Name: participant.liabilityForm?.emergencyContact2Name || '',
        emergencyContact2Phone: participant.liabilityForm?.emergencyContact2Phone || '',
        emergencyContact2Relation: participant.liabilityForm?.emergencyContact2Relation || '',

        insuranceProvider: participant.liabilityForm?.insuranceProvider || '',
        insurancePolicyNumber: participant.liabilityForm?.insurancePolicyNumber || '',
        insuranceGroupNumber: participant.liabilityForm?.insuranceGroupNumber || '',

        parentEmail: participant.liabilityForm?.parentEmail || '',

        adminNotes: '',
      })
    }
  }, [participant, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!participant || !participant.id) return

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.age) {
      alert('First name, last name, and age are required')
      return
    }

    const age = parseInt(formData.age)
    if (isNaN(age) || age < 1 || age > 120) {
      alert('Please enter a valid age between 1 and 120')
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/admin/participants/${participant.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Participant fields
          firstName: formData.firstName,
          lastName: formData.lastName,
          preferredName: formData.preferredName || null,
          email: formData.email || null,
          age,
          gender: formData.gender,
          participantType: formData.participantType,
          tShirtSize: formData.tShirtSize || null,

          // Liability form fields (will create/update liability form if participant has one)
          liabilityFormData: {
            participantPhone: formData.participantPhone || null,
            medicalConditions: formData.medicalConditions || null,
            medications: formData.medications || null,
            allergies: formData.allergies || null,
            dietaryRestrictions: formData.dietaryRestrictions || null,
            adaAccommodations: formData.adaAccommodations || null,
            emergencyContact1Name: formData.emergencyContact1Name || null,
            emergencyContact1Phone: formData.emergencyContact1Phone || null,
            emergencyContact1Relation: formData.emergencyContact1Relation || null,
            emergencyContact2Name: formData.emergencyContact2Name || null,
            emergencyContact2Phone: formData.emergencyContact2Phone || null,
            emergencyContact2Relation: formData.emergencyContact2Relation || null,
            insuranceProvider: formData.insuranceProvider || null,
            insurancePolicyNumber: formData.insurancePolicyNumber || null,
            insuranceGroupNumber: formData.insuranceGroupNumber || null,
            parentEmail: formData.parentEmail || null,
          },

          adminNotes: formData.adminNotes || null,
          sendEmail,
        }),
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to update participant'}`)
      }
    } catch (error) {
      console.error('Error updating participant:', error)
      alert('Failed to update participant')
    } finally {
      setSaving(false)
    }
  }

  if (!participant) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <User className="h-5 w-5" />
            Edit Participant Information
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferredName">Preferred Name</Label>
                <Input
                  id="preferredName"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                  min="1"
                  max="120"
                />
              </div>

              <div>
                <Label htmlFor="gender">Gender *</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  required
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
                  onChange={(e) => setFormData({ ...formData, tShirtSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                >
                  <option value="">Select size</option>
                  <option value="YS">Youth Small</option>
                  <option value="YM">Youth Medium</option>
                  <option value="YL">Youth Large</option>
                  <option value="AS">Adult Small</option>
                  <option value="AM">Adult Medium</option>
                  <option value="AL">Adult Large</option>
                  <option value="AXL">Adult XL</option>
                  <option value="A2XL">Adult 2XL</option>
                  <option value="A3XL">Adult 3XL</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="participantType">Participant Type *</Label>
                <select
                  id="participantType"
                  value={formData.participantType}
                  onChange={(e) => setFormData({ ...formData, participantType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  required
                >
                  <option value="youth_u18">Youth Under 18</option>
                  <option value="youth_o18">Youth Over 18</option>
                  <option value="chaperone">Chaperone</option>
                  <option value="priest">Priest</option>
                </select>
              </div>

              <div>
                <Label htmlFor="participantPhone">Phone</Label>
                <Input
                  id="participantPhone"
                  type="tel"
                  value={formData.participantPhone}
                  onChange={(e) => setFormData({ ...formData, participantPhone: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">Medical Information</h3>

            <div>
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Textarea
                id="medicalConditions"
                value={formData.medicalConditions}
                onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                placeholder="List any medical conditions"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="medications">Current Medications</Label>
              <Textarea
                id="medications"
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                placeholder="List any current medications"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="List any allergies"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                  placeholder="List any dietary restrictions"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="adaAccommodations">ADA Accommodations</Label>
                <Textarea
                  id="adaAccommodations"
                  value={formData.adaAccommodations}
                  onChange={(e) => setFormData({ ...formData, adaAccommodations: e.target.value })}
                  placeholder="List any ADA accommodations needed"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">Emergency Contacts</h3>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Primary Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergencyContact1Name">Name</Label>
                  <Input
                    id="emergencyContact1Name"
                    value={formData.emergencyContact1Name}
                    onChange={(e) => setFormData({ ...formData, emergencyContact1Name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact1Phone">Phone</Label>
                  <Input
                    id="emergencyContact1Phone"
                    type="tel"
                    value={formData.emergencyContact1Phone}
                    onChange={(e) => setFormData({ ...formData, emergencyContact1Phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact1Relation">Relationship</Label>
                  <Input
                    id="emergencyContact1Relation"
                    value={formData.emergencyContact1Relation}
                    onChange={(e) => setFormData({ ...formData, emergencyContact1Relation: e.target.value })}
                    placeholder="e.g., Parent, Spouse"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Secondary Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergencyContact2Name">Name</Label>
                  <Input
                    id="emergencyContact2Name"
                    value={formData.emergencyContact2Name}
                    onChange={(e) => setFormData({ ...formData, emergencyContact2Name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact2Phone">Phone</Label>
                  <Input
                    id="emergencyContact2Phone"
                    type="tel"
                    value={formData.emergencyContact2Phone}
                    onChange={(e) => setFormData({ ...formData, emergencyContact2Phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact2Relation">Relationship</Label>
                  <Input
                    id="emergencyContact2Relation"
                    value={formData.emergencyContact2Relation}
                    onChange={(e) => setFormData({ ...formData, emergencyContact2Relation: e.target.value })}
                    placeholder="e.g., Parent, Spouse"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">Insurance Information</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  placeholder="e.g., Blue Cross"
                />
              </div>
              <div>
                <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                <Input
                  id="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="insuranceGroupNumber">Group Number</Label>
                <Input
                  id="insuranceGroupNumber"
                  value={formData.insuranceGroupNumber}
                  onChange={(e) => setFormData({ ...formData, insuranceGroupNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Parent/Guardian Info (for youth under 18) */}
          {(formData.participantType === 'youth_u18' || parseInt(formData.age) < 18) && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">Parent/Guardian Information</h3>

              <div>
                <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  placeholder="For youth under 18"
                />
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-[#1E3A5F] border-b pb-2">Admin Notes</h3>

            <div>
              <Label htmlFor="adminNotes">Notes about this edit</Label>
              <Textarea
                id="adminNotes"
                value={formData.adminNotes}
                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                placeholder="Add any notes about why these changes were made"
                rows={2}
              />
            </div>
          </div>

          {/* Email Notification */}
          <div className="flex items-center space-x-2 border-t pt-4">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
            />
            <Label htmlFor="sendEmail" className="cursor-pointer">
              Send notification email to group leader about these changes
            </Label>
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
                  <Save className="h-4 w-4 mr-2" />
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
