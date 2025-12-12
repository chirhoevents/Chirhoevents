'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface CreateEventClientProps {
  organizationId: string
}

interface EventFormData {
  // Step 1: Basic Information
  name: string
  slug: string
  description: string
  startDate: string
  endDate: string
  locationName: string
  locationAddress: string
  timezone: string
  capacityTotal: string

  // Step 2: Registration Settings
  registrationOpenDate: string
  registrationCloseDate: string
  earlyBirdDeadline: string
  regularDeadline: string
  fullPaymentDeadline: string
  lateFeePercentage: string
  lateFeeAutoApply: boolean

  // Step 3: Pricing
  youthEarlyBirdPrice: string
  youthRegularPrice: string
  youthLatePrice: string
  chaperoneEarlyBirdPrice: string
  chaperoneRegularPrice: string
  chaperoneLatePrice: string
  priestPrice: string
  onCampusYouthPrice: string
  offCampusYouthPrice: string
  dayPassYouthPrice: string
  onCampusChaperonePrice: string
  offCampusChaperonePrice: string
  dayPassChaperonePrice: string
  depositType: 'percentage' | 'fixed' | 'full' | 'none'
  depositPercentage: string
  depositAmount: string

  // Step 3: Features & Modules (swapped with Pricing)
  groupRegistrationEnabled: boolean
  individualRegistrationEnabled: boolean
  porosHousingEnabled: boolean
  tshirtsEnabled: boolean
  salveCheckinEnabled: boolean
  raphaMedicalEnabled: boolean
  publicPortalEnabled: boolean
  allowOnCampus: boolean
  allowOffCampus: boolean
  allowDayPass: boolean

  // Step 5: Contact & Instructions
  contactEmail: string
  contactPhone: string
  registrationInstructions: string
  checkPaymentEnabled: boolean
  checkPaymentPayableTo: string
  checkPaymentAddress: string

  // Step 6: Landing Page Content
  landingPageShowPrice: boolean
  landingPageShowSchedule: boolean
  landingPageShowFaq: boolean
  landingPageShowIncluded: boolean
  landingPageShowBring: boolean
  landingPageShowContact: boolean
  showAvailability: boolean
  availabilityThreshold: string
  countdownLocation: 'hero' | 'sticky' | 'registration'
  countdownBeforeOpen: boolean
  countdownBeforeClose: boolean
  enableWaitlist: boolean
  waitlistCapacity: string
}

const STEPS = [
  { number: 1, title: 'Basic Information' },
  { number: 2, title: 'Registration Settings' },
  { number: 3, title: 'Features & Modules' },
  { number: 4, title: 'Pricing' },
  { number: 5, title: 'Contact & Instructions' },
  { number: 6, title: 'Landing Page' },
  { number: 7, title: 'Review & Publish' },
]

export default function CreateEventClient({
  organizationId,
}: CreateEventClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    // Step 1
    name: '',
    slug: '',
    description: '',
    startDate: '',
    endDate: '',
    locationName: '',
    locationAddress: '',
    timezone: 'America/New_York',
    capacityTotal: '1000',

    // Step 2
    registrationOpenDate: '',
    registrationCloseDate: '',
    earlyBirdDeadline: '',
    regularDeadline: '',
    fullPaymentDeadline: '',
    lateFeePercentage: '20',
    lateFeeAutoApply: false,

    // Step 3
    youthEarlyBirdPrice: '90',
    youthRegularPrice: '100',
    youthLatePrice: '',
    chaperoneEarlyBirdPrice: '65',
    chaperoneRegularPrice: '75',
    chaperoneLatePrice: '',
    priestPrice: '0',
    onCampusYouthPrice: '',
    offCampusYouthPrice: '75',
    dayPassYouthPrice: '50',
    onCampusChaperonePrice: '',
    offCampusChaperonePrice: '50',
    dayPassChaperonePrice: '25',
    depositType: 'percentage',
    depositPercentage: '25',
    depositAmount: '500',

    // Step 3: Features
    groupRegistrationEnabled: true,
    individualRegistrationEnabled: true,
    porosHousingEnabled: false,
    tshirtsEnabled: false,
    salveCheckinEnabled: false,
    raphaMedicalEnabled: false,
    publicPortalEnabled: false,
    allowOnCampus: true,
    allowOffCampus: true,
    allowDayPass: false,

    // Step 5
    contactEmail: '',
    contactPhone: '',
    registrationInstructions: '',
    checkPaymentEnabled: true,
    checkPaymentPayableTo: '',
    checkPaymentAddress: '',

    // Step 6
    landingPageShowPrice: true,
    landingPageShowSchedule: true,
    landingPageShowFaq: true,
    landingPageShowIncluded: true,
    landingPageShowBring: true,
    landingPageShowContact: true,
    showAvailability: true,
    availabilityThreshold: '20',
    countdownLocation: 'hero',
    countdownBeforeOpen: true,
    countdownBeforeClose: true,
    enableWaitlist: false,
    waitlistCapacity: '',
  })

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (name: string) => {
    updateFormData({
      name,
      slug: generateSlug(name),
    })
  }

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      const { event } = await response.json()
      router.push(`/dashboard/admin/events/${event.id}`)
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Failed to save draft. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          status: 'published',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to publish event')
      }

      const { event } = await response.json()
      router.push(`/dashboard/admin/events`)
    } catch (error) {
      console.error('Error publishing event:', error)
      alert('Failed to publish event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Create New Event
        </h1>
        <p className="text-[#6B7280]">
          Fill in the details below to create your event
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  currentStep > step.number
                    ? 'bg-green-500 border-green-500 text-white'
                    : currentStep === step.number
                    ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs mt-2 text-center hidden md:block ${
                  currentStep === step.number
                    ? 'text-[#1E3A5F] font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 transition-colors ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-xl text-[#1E3A5F]">
            {STEPS[currentStep - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Event Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Mount 2000 Summer 2026"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    The public-facing name of your event
                  </p>
                </div>

                <div>
                  <Label htmlFor="slug">
                    URL Slug <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      updateFormData({ slug: e.target.value })
                    }
                    placeholder="mount2000-2026"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Your event will be accessible at:
                    chirhoevents.com/events/{formData.slug || 'your-event'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Event Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      updateFormData({ description: e.target.value })
                    }
                    placeholder="Brief description of your event..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        updateFormData({ startDate: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        updateFormData({ endDate: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="locationName">
                    Location Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="locationName"
                    value={formData.locationName}
                    onChange={(e) =>
                      updateFormData({ locationName: e.target.value })
                    }
                    placeholder="Mount St. Mary's University"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="locationAddress">Location Address</Label>
                  <Input
                    id="locationAddress"
                    value={formData.locationAddress}
                    onChange={(e) =>
                      updateFormData({ locationAddress: e.target.value })
                    }
                    placeholder="16300 Old Emmitsburg Rd, Emmitsburg, MD 21727"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) =>
                        updateFormData({ timezone: e.target.value })
                      }
                      className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="America/New_York">
                        Eastern Time (ET)
                      </option>
                      <option value="America/Chicago">
                        Central Time (CT)
                      </option>
                      <option value="America/Denver">
                        Mountain Time (MT)
                      </option>
                      <option value="America/Los_Angeles">
                        Pacific Time (PT)
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="capacityTotal">Total Capacity</Label>
                    <Input
                      id="capacityTotal"
                      type="number"
                      value={formData.capacityTotal}
                      onChange={(e) =>
                        updateFormData({ capacityTotal: e.target.value })
                      }
                      placeholder="1000"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum number of participants
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Registration Settings */}
          {currentStep === 2 && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationOpenDate">
                      Registration Opens <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="registrationOpenDate"
                      type="datetime-local"
                      value={formData.registrationOpenDate}
                      onChange={(e) =>
                        updateFormData({
                          registrationOpenDate: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="registrationCloseDate">
                      Registration Closes{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="registrationCloseDate"
                      type="datetime-local"
                      value={formData.registrationCloseDate}
                      onChange={(e) =>
                        updateFormData({
                          registrationCloseDate: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Pricing Deadlines (Optional)
                  </h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Set deadlines for early bird pricing and late fees
                  </p>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="earlyBirdDeadline">
                        Early Bird Deadline
                      </Label>
                      <Input
                        id="earlyBirdDeadline"
                        type="datetime-local"
                        value={formData.earlyBirdDeadline}
                        onChange={(e) =>
                          updateFormData({
                            earlyBirdDeadline: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Register before this date for discounted pricing
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="regularDeadline">Regular Deadline</Label>
                      <Input
                        id="regularDeadline"
                        type="datetime-local"
                        value={formData.regularDeadline}
                        onChange={(e) =>
                          updateFormData({ regularDeadline: e.target.value })
                        }
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        After this date, late fees may apply
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="fullPaymentDeadline">
                        Full Payment Deadline
                      </Label>
                      <Input
                        id="fullPaymentDeadline"
                        type="datetime-local"
                        value={formData.fullPaymentDeadline}
                        onChange={(e) =>
                          updateFormData({
                            fullPaymentDeadline: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Final date for all balances to be paid
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2">
                    Late Fee Settings
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="lateFeePercentage">
                        Late Fee Percentage (%)
                      </Label>
                      <Input
                        id="lateFeePercentage"
                        type="number"
                        value={formData.lateFeePercentage}
                        onChange={(e) =>
                          updateFormData({ lateFeePercentage: e.target.value })
                        }
                        placeholder="20"
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Percentage to add for late registrations/payments
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="lateFeeAutoApply"
                        checked={formData.lateFeeAutoApply}
                        onChange={(e) =>
                          updateFormData({ lateFeeAutoApply: e.target.checked })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="lateFeeAutoApply" className="mb-0">
                        Automatically apply late fees after deadline
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Features & Modules */}
          {currentStep === 3 && (
            <>
              <div className="space-y-6">
                {/* Registration Types - FIRST - Radio buttons (mutually exclusive) */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    📝 Registration Type
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Choose ONE registration type for this event (you cannot enable both)
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="registrationType-group"
                        name="registrationType"
                        checked={formData.groupRegistrationEnabled && !formData.individualRegistrationEnabled}
                        onChange={() =>
                          updateFormData({
                            groupRegistrationEnabled: true,
                            individualRegistrationEnabled: false,
                          })
                        }
                        className="w-4 h-4 mt-1 text-[#1E3A5F] border-gray-300"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="registrationType-group"
                          className="mb-0 font-medium text-blue-900 cursor-pointer"
                        >
                          👥 Group Registration
                        </Label>
                        <p className="text-sm text-blue-700 mt-1">
                          Allow parishes and youth groups to register multiple participants together. Group leaders can manage their entire team.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="registrationType-individual"
                        name="registrationType"
                        checked={!formData.groupRegistrationEnabled && formData.individualRegistrationEnabled}
                        onChange={() =>
                          updateFormData({
                            groupRegistrationEnabled: false,
                            individualRegistrationEnabled: true,
                          })
                        }
                        className="w-4 h-4 mt-1 text-[#1E3A5F] border-gray-300"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="registrationType-individual"
                          className="mb-0 font-medium text-blue-900 cursor-pointer"
                        >
                          🧑 Individual Registration
                        </Label>
                        <p className="text-sm text-blue-700 mt-1">
                          Allow individuals to register on their own without being part of a youth group or parish.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Housing & Logistics */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">
                    🏠 Housing & Logistics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="porosHousingEnabled"
                        checked={formData.porosHousingEnabled}
                        onChange={(e) =>
                          updateFormData({
                            porosHousingEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="porosHousingEnabled" className="mb-0 font-medium">
                        Enable Poros Portal (Housing Management System)
                      </Label>
                    </div>

                    {/* Conditional housing options - only show if Poros is enabled */}
                    {formData.porosHousingEnabled && (
                      <div className="ml-6 pl-4 border-l-2 border-green-300 space-y-3">
                        <p className="text-sm text-green-800 font-medium">
                          Housing Options:
                        </p>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="allowOnCampus"
                            checked={formData.allowOnCampus}
                            onChange={(e) =>
                              updateFormData({ allowOnCampus: e.target.checked })
                            }
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="allowOnCampus" className="mb-0">
                            Allow On-Campus Housing
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="allowOffCampus"
                            checked={formData.allowOffCampus}
                            onChange={(e) =>
                              updateFormData({ allowOffCampus: e.target.checked })
                            }
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="allowOffCampus" className="mb-0">
                            Allow Off-Campus Housing (staying elsewhere)
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="allowDayPass"
                            checked={formData.allowDayPass}
                            onChange={(e) =>
                              updateFormData({ allowDayPass: e.target.checked })
                            }
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="allowDayPass" className="mb-0">
                            Allow Day Pass Only (attending but not staying overnight)
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* T-Shirts */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-3">
                    👕 T-Shirts
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="tshirtsEnabled"
                      checked={formData.tshirtsEnabled}
                      onChange={(e) =>
                        updateFormData({ tshirtsEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                    />
                    <Label htmlFor="tshirtsEnabled" className="mb-0 font-medium">
                      Enable T-Shirt Sales
                    </Label>
                  </div>
                  <p className="text-sm text-gray-600 ml-6 mt-2">
                    Allow participants to order event t-shirts during registration
                  </p>
                </div>

                {/* Check-In & Medical */}
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-amber-900 mb-3">
                    ✅ Check-In & Medical
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="salveCheckinEnabled"
                        checked={formData.salveCheckinEnabled}
                        onChange={(e) =>
                          updateFormData({
                            salveCheckinEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="salveCheckinEnabled" className="mb-0">
                        Enable SALVE Check-In System
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">
                      QR code scanning and digital check-in for event day
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="raphaMedicalEnabled"
                        checked={formData.raphaMedicalEnabled}
                        onChange={(e) =>
                          updateFormData({
                            raphaMedicalEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="raphaMedicalEnabled" className="mb-0">
                        Enable Rapha Medical Platform
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">
                      Medical incident tracking and first aid management
                    </p>
                  </div>
                </div>

                {/* Public Portal */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🌐 Public Portal
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="publicPortalEnabled"
                      checked={formData.publicPortalEnabled}
                      onChange={(e) =>
                        updateFormData({
                          publicPortalEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                    />
                    <Label htmlFor="publicPortalEnabled" className="mb-0">
                      Enable Public Resource Portal
                    </Label>
                  </div>
                  <p className="text-sm text-gray-600 ml-6 mt-2">
                    Allows group leaders to view seating, meal times, and schedule
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Pricing (moved from Step 3) */}
          {currentStep === 4 && (
            <>
              <div className="space-y-6">
                {/* Youth Pricing */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Youth Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="youthEarlyBirdPrice">
                        Early Bird Price
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="youthEarlyBirdPrice"
                          type="number"
                          value={formData.youthEarlyBirdPrice}
                          onChange={(e) =>
                            updateFormData({
                              youthEarlyBirdPrice: e.target.value,
                            })
                          }
                          placeholder="90"
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="youthRegularPrice">
                        Regular Price <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="youthRegularPrice"
                          type="number"
                          value={formData.youthRegularPrice}
                          onChange={(e) =>
                            updateFormData({
                              youthRegularPrice: e.target.value,
                            })
                          }
                          placeholder="100"
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="youthLatePrice">Late Price</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="youthLatePrice"
                          type="number"
                          value={formData.youthLatePrice}
                          onChange={(e) =>
                            updateFormData({ youthLatePrice: e.target.value })
                          }
                          placeholder="120"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chaperone Pricing */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">
                    Chaperone Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="chaperoneEarlyBirdPrice">
                        Early Bird Price
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="chaperoneEarlyBirdPrice"
                          type="number"
                          value={formData.chaperoneEarlyBirdPrice}
                          onChange={(e) =>
                            updateFormData({
                              chaperoneEarlyBirdPrice: e.target.value,
                            })
                          }
                          placeholder="65"
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="chaperoneRegularPrice">
                        Regular Price <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="chaperoneRegularPrice"
                          type="number"
                          value={formData.chaperoneRegularPrice}
                          onChange={(e) =>
                            updateFormData({
                              chaperoneRegularPrice: e.target.value,
                            })
                          }
                          placeholder="75"
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="chaperoneLatePrice">Late Price</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="chaperoneLatePrice"
                          type="number"
                          value={formData.chaperoneLatePrice}
                          onChange={(e) =>
                            updateFormData({
                              chaperoneLatePrice: e.target.value,
                            })
                          }
                          placeholder="90"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clergy Pricing */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-3">
                    Clergy Pricing
                  </h3>
                  <div className="max-w-xs">
                    <Label htmlFor="priestPrice">Priest/Deacon Price</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="priestPrice"
                        type="number"
                        value={formData.priestPrice}
                        onChange={(e) =>
                          updateFormData({ priestPrice: e.target.value })
                        }
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Typically free ($0) for clergy
                    </p>
                  </div>
                </div>

                {/* Housing Type Pricing */}
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-amber-900 mb-3">
                    Housing Type Pricing (Optional)
                  </h3>
                  <p className="text-sm text-amber-800 mb-4">
                    Set different prices for on-campus, off-campus, and day pass
                    options
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="offCampusYouthPrice">
                          Off-Campus Youth Price
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="offCampusYouthPrice"
                            type="number"
                            value={formData.offCampusYouthPrice}
                            onChange={(e) =>
                              updateFormData({
                                offCampusYouthPrice: e.target.value,
                              })
                            }
                            placeholder="75"
                            className="pl-7"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="dayPassYouthPrice">
                          Day Pass Youth Price
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="dayPassYouthPrice"
                            type="number"
                            value={formData.dayPassYouthPrice}
                            onChange={(e) =>
                              updateFormData({
                                dayPassYouthPrice: e.target.value,
                              })
                            }
                            placeholder="50"
                            className="pl-7"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="offCampusChaperonePrice">
                          Off-Campus Chaperone Price
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="offCampusChaperonePrice"
                            type="number"
                            value={formData.offCampusChaperonePrice}
                            onChange={(e) =>
                              updateFormData({
                                offCampusChaperonePrice: e.target.value,
                              })
                            }
                            placeholder="50"
                            className="pl-7"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="dayPassChaperonePrice">
                          Day Pass Chaperone Price
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="dayPassChaperonePrice"
                            type="number"
                            value={formData.dayPassChaperonePrice}
                            onChange={(e) =>
                              updateFormData({
                                dayPassChaperonePrice: e.target.value,
                              })
                            }
                            placeholder="25"
                            className="pl-7"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deposit Settings */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Deposit Settings
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="depositPercentage"
                        name="depositType"
                        value="percentage"
                        checked={formData.depositType === 'percentage'}
                        onChange={(e) =>
                          updateFormData({ depositType: 'percentage' })
                        }
                        className="w-4 h-4 text-[#1E3A5F]"
                      />
                      <Label htmlFor="depositPercentage" className="mb-0">
                        Percentage-based deposit:
                      </Label>
                      <Input
                        type="number"
                        value={formData.depositPercentage}
                        onChange={(e) =>
                          updateFormData({ depositPercentage: e.target.value })
                        }
                        placeholder="25"
                        className="w-20"
                        disabled={formData.depositType !== 'percentage'}
                      />
                      <span className="text-gray-600">%</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="depositFixed"
                        name="depositType"
                        value="fixed"
                        checked={formData.depositType === 'fixed'}
                        onChange={(e) =>
                          updateFormData({ depositType: 'fixed' })
                        }
                        className="w-4 h-4 text-[#1E3A5F]"
                      />
                      <Label htmlFor="depositFixed" className="mb-0">
                        Fixed deposit amount: $
                      </Label>
                      <Input
                        type="number"
                        value={formData.depositAmount}
                        onChange={(e) =>
                          updateFormData({ depositAmount: e.target.value })
                        }
                        placeholder="500"
                        className="w-32"
                        disabled={formData.depositType !== 'fixed'}
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="depositFull"
                        name="depositType"
                        value="full"
                        checked={formData.depositType === 'full'}
                        onChange={(e) =>
                          updateFormData({ depositType: 'full' })
                        }
                        className="w-4 h-4 text-[#1E3A5F]"
                      />
                      <Label htmlFor="depositFull" className="mb-0">
                        Full payment required (no deposit)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="depositNone"
                        name="depositType"
                        value="none"
                        checked={formData.depositType === 'none'}
                        onChange={(e) =>
                          updateFormData({ depositType: 'none' })
                        }
                        className="w-4 h-4 text-[#1E3A5F]"
                      />
                      <Label htmlFor="depositNone" className="mb-0">
                        No deposit required (pay later)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}


          {/* Step 5: Contact & Instructions */}
          {currentStep === 5 && (
            <>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contactEmail">
                        Contact Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) =>
                          updateFormData({ contactEmail: e.target.value })
                        }
                        placeholder="info@mount2000.org"
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Main contact email for event inquiries
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) =>
                          updateFormData({ contactPhone: e.target.value })
                        }
                        placeholder="(301) 447-5000"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="registrationInstructions">
                    Registration Instructions
                  </Label>
                  <Textarea
                    id="registrationInstructions"
                    value={formData.registrationInstructions}
                    onChange={(e) =>
                      updateFormData({
                        registrationInstructions: e.target.value,
                      })
                    }
                    placeholder="Welcome to Mount 2000! After registering, you will receive a confirmation email with your access code..."
                    rows={6}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    These instructions will appear on the invoice page before
                    payment
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">
                    Check Payment Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="checkPaymentEnabled"
                        checked={formData.checkPaymentEnabled}
                        onChange={(e) =>
                          updateFormData({
                            checkPaymentEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="checkPaymentEnabled" className="mb-0">
                        Allow payment by check
                      </Label>
                    </div>

                    {formData.checkPaymentEnabled && (
                      <>
                        <div>
                          <Label htmlFor="checkPaymentPayableTo">
                            Make Check Payable To
                          </Label>
                          <Input
                            id="checkPaymentPayableTo"
                            value={formData.checkPaymentPayableTo}
                            onChange={(e) =>
                              updateFormData({
                                checkPaymentPayableTo: e.target.value,
                              })
                            }
                            placeholder="Mount Saint Mary Seminary"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="checkPaymentAddress">
                            Mail Checks To
                          </Label>
                          <Textarea
                            id="checkPaymentAddress"
                            value={formData.checkPaymentAddress}
                            onChange={(e) =>
                              updateFormData({
                                checkPaymentAddress: e.target.value,
                              })
                            }
                            placeholder="Mount Saint Mary Seminary&#10;16300 Old Emmitsburg Rd&#10;Emmitsburg, MD 21727"
                            rows={4}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 6: Landing Page Content */}
          {currentStep === 6 && (
            <>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Landing Page Visibility Toggles
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Choose what sections to show on your public event landing
                    page
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="landingPageShowPrice"
                        checked={formData.landingPageShowPrice}
                        onChange={(e) =>
                          updateFormData({
                            landingPageShowPrice: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="landingPageShowPrice" className="mb-0">
                        Show Price
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="landingPageShowSchedule"
                        checked={formData.landingPageShowSchedule}
                        onChange={(e) =>
                          updateFormData({
                            landingPageShowSchedule: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label
                        htmlFor="landingPageShowSchedule"
                        className="mb-0"
                      >
                        Show Schedule
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="landingPageShowFaq"
                        checked={formData.landingPageShowFaq}
                        onChange={(e) =>
                          updateFormData({
                            landingPageShowFaq: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="landingPageShowFaq" className="mb-0">
                        Show FAQ
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="landingPageShowIncluded"
                        checked={formData.landingPageShowIncluded}
                        onChange={(e) =>
                          updateFormData({
                            landingPageShowIncluded: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label
                        htmlFor="landingPageShowIncluded"
                        className="mb-0"
                      >
                        Show What&apos;s Included
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="landingPageShowBring"
                        checked={formData.landingPageShowBring}
                        onChange={(e) =>
                          updateFormData({
                            landingPageShowBring: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="landingPageShowBring" className="mb-0">
                        Show What to Bring
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="landingPageShowContact"
                        checked={formData.landingPageShowContact}
                        onChange={(e) =>
                          updateFormData({
                            landingPageShowContact: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="landingPageShowContact" className="mb-0">
                        Show Contact Information
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">
                    Countdown Timer Settings
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="countdownLocation">
                        Countdown Timer Location
                      </Label>
                      <select
                        id="countdownLocation"
                        value={formData.countdownLocation}
                        onChange={(e) =>
                          updateFormData({
                            countdownLocation: e.target.value as
                              | 'hero'
                              | 'sticky'
                              | 'registration',
                          })
                        }
                        className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hero">Hero Section (Top)</option>
                        <option value="sticky">Sticky Top Bar</option>
                        <option value="registration">
                          Registration Section
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="countdownBeforeOpen"
                        checked={formData.countdownBeforeOpen}
                        onChange={(e) =>
                          updateFormData({
                            countdownBeforeOpen: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="countdownBeforeOpen" className="mb-0">
                        Show countdown before registration opens
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="countdownBeforeClose"
                        checked={formData.countdownBeforeClose}
                        onChange={(e) =>
                          updateFormData({
                            countdownBeforeClose: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="countdownBeforeClose" className="mb-0">
                        Show countdown before registration closes
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-amber-900 mb-3">
                    Availability & Waitlist
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showAvailability"
                        checked={formData.showAvailability}
                        onChange={(e) =>
                          updateFormData({ showAvailability: e.target.checked })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="showAvailability" className="mb-0">
                        Show spots remaining on landing page
                      </Label>
                    </div>

                    {formData.showAvailability && (
                      <div>
                        <Label htmlFor="availabilityThreshold">
                          Show availability when fewer than X spots remain
                        </Label>
                        <Input
                          id="availabilityThreshold"
                          type="number"
                          value={formData.availabilityThreshold}
                          onChange={(e) =>
                            updateFormData({
                              availabilityThreshold: e.target.value,
                            })
                          }
                          placeholder="20"
                          className="mt-1 max-w-xs"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableWaitlist"
                        checked={formData.enableWaitlist}
                        onChange={(e) =>
                          updateFormData({ enableWaitlist: e.target.checked })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="enableWaitlist" className="mb-0">
                        Enable waitlist when event is full
                      </Label>
                    </div>

                    {formData.enableWaitlist && (
                      <div>
                        <Label htmlFor="waitlistCapacity">
                          Maximum waitlist entries (optional)
                        </Label>
                        <Input
                          id="waitlistCapacity"
                          type="number"
                          value={formData.waitlistCapacity}
                          onChange={(e) =>
                            updateFormData({
                              waitlistCapacity: e.target.value,
                            })
                          }
                          placeholder="Leave empty for unlimited"
                          className="mt-1 max-w-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 7: Review & Publish */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✨ Ready to Launch!
                </h3>
                <p className="text-green-800">
                  Review your event details below and publish when ready.
                </p>
              </div>

              {/* Summary of all steps */}
              <div className="space-y-4">
                <div className="border-l-4 border-[#9C8466] pl-4">
                  <h4 className="font-semibold text-[#1E3A5F]">
                    Basic Information
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formData.name || 'Untitled Event'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formData.startDate && formData.endDate
                      ? `${formData.startDate} to ${formData.endDate}`
                      : 'Dates not set'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formData.locationName || 'Location not set'}
                  </p>
                </div>

                <div className="border-l-4 border-[#9C8466] pl-4">
                  <h4 className="font-semibold text-[#1E3A5F]">
                    Registration Window
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formData.registrationOpenDate && formData.registrationCloseDate
                      ? `${formData.registrationOpenDate} to ${formData.registrationCloseDate}`
                      : 'Registration window not set'}
                  </p>
                </div>

                <div className="border-l-4 border-[#9C8466] pl-4">
                  <h4 className="font-semibold text-[#1E3A5F]">Pricing</h4>
                  <p className="text-sm text-gray-600">
                    Youth: ${formData.youthRegularPrice || '0'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Chaperone: ${formData.chaperoneRegularPrice || '0'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Priest: ${formData.priestPrice || '0'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="border-[#1E3A5F] text-[#1E3A5F]"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {currentStep === 7 ? (
            <>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving}
                className="border-[#9C8466] text-[#9C8466]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save as Draft'
                )}
              </Button>
              <Button
                onClick={handlePublish}
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Event'
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
