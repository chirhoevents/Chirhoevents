'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle } from 'lucide-react'

type HousingType = 'on_campus' | 'off_campus' | 'day_pass'
type RoomType = 'single' | 'double' | 'triple' | 'quad'
type TicketType = 'general_admission' | 'day_pass'

export interface WaitlistPreferenceOptions {
  offerGeneralAdmission: boolean
  offerDayPass: boolean
  housingTypes: HousingType[]        // 'general_admission' housing options offered
  roomTypes: RoomType[]              // room types offered (for on_campus)
  dayPassOptions: Array<{ id: string; name: string }>
}

interface WaitlistModalProps {
  eventId: string
  eventName: string
  isOpen: boolean
  onClose: () => void
  preferences?: WaitlistPreferenceOptions
}

const HOUSING_LABEL: Record<HousingType, string> = {
  on_campus: 'On Campus',
  off_campus: 'Off Campus',
  day_pass: 'Day Pass',
}

const ROOM_LABEL: Record<RoomType, string> = {
  single: 'Single Room',
  double: 'Double Room',
  triple: 'Triple Room',
  quad: 'Quad Room',
}

export default function WaitlistModal({
  eventId,
  eventName,
  isOpen,
  onClose,
  preferences,
}: WaitlistModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bothTicketTypes =
    !!preferences && preferences.offerGeneralAdmission && preferences.offerDayPass
  const showTicketType = bothTicketTypes
  const defaultTicketType: TicketType = preferences?.offerGeneralAdmission
    ? 'general_admission'
    : preferences?.offerDayPass
    ? 'day_pass'
    : 'general_admission'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    partySize: '1',
    notes: '',
    registrationType: '' as '' | 'group' | 'individual',
    preferredTicketType: defaultTicketType,
    preferredHousingType: '' as '' | HousingType,
    preferredRoomType: '' as '' | RoomType,
    preferredDayPassOptionId: '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({ ...prev, preferredTicketType: defaultTicketType }))
    }
    // defaultTicketType only changes when preferences change, safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const housingTypes = preferences?.housingTypes ?? []
  const roomTypes = preferences?.roomTypes ?? []
  const dayPassOptions = preferences?.dayPassOptions ?? []

  const showHousing =
    formData.preferredTicketType === 'general_admission' && housingTypes.length > 1
  const showRoom =
    formData.preferredTicketType === 'general_admission' &&
    formData.preferredHousingType === 'on_campus' &&
    roomTypes.length > 1
  const showDayPass =
    formData.preferredTicketType === 'day_pass' && dayPassOptions.length > 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          partySize: parseInt(formData.partySize),
          notes: formData.notes || null,
          registrationType: formData.registrationType || null,
          preferredTicketType: preferences ? formData.preferredTicketType : null,
          preferredHousingType: formData.preferredHousingType || null,
          preferredRoomType: formData.preferredRoomType || null,
          preferredDayPassOptionId: formData.preferredDayPassOptionId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      setIsSuccess(true)

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        partySize: '1',
        notes: '',
        registrationType: '',
        preferredTicketType: defaultTicketType,
        preferredHousingType: '',
        preferredRoomType: '',
        preferredDayPassOptionId: '',
      })

      // Close modal after 3 seconds
      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false)
      setError(null)
      onClose()
    }
  }

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <DialogTitle className="text-2xl font-bold text-[#1E3A5F] mb-2">
              You&apos;re on the Waitlist!
            </DialogTitle>
            <DialogDescription className="text-base">
              We&apos;ll notify you via email if a spot becomes available for {eventName}.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#1E3A5F]">
                Join Waitlist
              </DialogTitle>
              <DialogDescription>
                Enter your information below and we&apos;ll contact you if a spot opens up
                for {eventName}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#1E3A5F] font-medium">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1"
                  placeholder="John Doe"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-[#1E3A5F] font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1"
                  placeholder="john@example.com"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-[#1E3A5F] font-medium">
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="mt-1"
                  placeholder="(555) 123-4567"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="partySize" className="text-[#1E3A5F] font-medium">
                  Party Size <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="partySize"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={formData.partySize}
                  onChange={(e) =>
                    setFormData({ ...formData, partySize: e.target.value })
                  }
                  className="mt-1"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-[#6B7280] mt-1">
                  How many people need spots?
                </p>
              </div>

              {parseInt(formData.partySize || '1') > 1 && (
                <div>
                  <Label htmlFor="registrationType" className="text-[#1E3A5F] font-medium">
                    Registration Type
                  </Label>
                  <select
                    id="registrationType"
                    className={`${selectClass} mt-1`}
                    value={formData.registrationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationType: e.target.value as '' | 'group' | 'individual',
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Not sure</option>
                    <option value="group">Group</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              )}

              {showTicketType && (
                <div>
                  <Label htmlFor="ticketType" className="text-[#1E3A5F] font-medium">
                    Ticket Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="ticketType"
                    className={`${selectClass} mt-1`}
                    value={formData.preferredTicketType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredTicketType: e.target.value as TicketType,
                        // Reset dependent selections when ticket type changes
                        preferredHousingType: '',
                        preferredRoomType: '',
                        preferredDayPassOptionId: '',
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="general_admission">General Admission (with housing)</option>
                    <option value="day_pass">Day Pass</option>
                  </select>
                </div>
              )}

              {showHousing && (
                <div>
                  <Label htmlFor="housingType" className="text-[#1E3A5F] font-medium">
                    Preferred Housing <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="housingType"
                    className={`${selectClass} mt-1`}
                    required
                    value={formData.preferredHousingType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredHousingType: e.target.value as '' | HousingType,
                        preferredRoomType: '',
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Select housing...</option>
                    {housingTypes.map((h) => (
                      <option key={h} value={h}>
                        {HOUSING_LABEL[h]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[#6B7280] mt-1">
                    We&apos;ll only contact you when a spot opens up for this option.
                  </p>
                </div>
              )}

              {showRoom && (
                <div>
                  <Label htmlFor="roomType" className="text-[#1E3A5F] font-medium">
                    Preferred Room Type
                  </Label>
                  <select
                    id="roomType"
                    className={`${selectClass} mt-1`}
                    value={formData.preferredRoomType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredRoomType: e.target.value as '' | RoomType,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">No preference</option>
                    {roomTypes.map((r) => (
                      <option key={r} value={r}>
                        {ROOM_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showDayPass && (
                <div>
                  <Label htmlFor="dayPassOption" className="text-[#1E3A5F] font-medium">
                    Preferred Day Pass <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="dayPassOption"
                    className={`${selectClass} mt-1`}
                    required
                    value={formData.preferredDayPassOptionId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredDayPassOptionId: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Select day pass...</option>
                    {dayPassOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-[#1E3A5F] font-medium">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="mt-1"
                  rows={3}
                  placeholder="Any special requirements or questions..."
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Waitlist'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
