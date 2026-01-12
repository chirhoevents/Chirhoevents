'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface CreateEventClientProps {
  organizationId: string
  eventId?: string
  initialData?: Partial<EventFormData>
  isEditMode?: boolean
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
  allowLoginWhenClosed: boolean

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

  // Individual Registration Pricing
  individualEarlyBirdPrice: string
  individualBasePrice: string
  individualLatePrice: string
  singleRoomPrice: string
  doubleRoomPrice: string
  tripleRoomPrice: string
  quadRoomPrice: string
  individualOffCampusPrice: string
  individualDayPassPrice: string
  individualMealPackagePrice: string

  // Step 3: Features & Modules (swapped with Pricing)
  groupRegistrationEnabled: boolean
  individualRegistrationEnabled: boolean
  liabilityFormsRequiredIndividual: boolean
  porosHousingEnabled: boolean
  tshirtsEnabled: boolean
  individualMealsEnabled: boolean
  salveCheckinEnabled: boolean
  raphaMedicalEnabled: boolean
  publicPortalEnabled: boolean
  allowOnCampus: boolean
  allowOffCampus: boolean
  allowDayPass: boolean
  allowIndividualDayPass: boolean
  allowSingleRoom: boolean
  allowDoubleRoom: boolean
  allowTripleRoom: boolean
  allowQuadRoom: boolean
  singleRoomLabel: string
  doubleRoomLabel: string
  tripleRoomLabel: string
  quadRoomLabel: string

  // Add-ons
  addOn1Enabled: boolean
  addOn1Title: string
  addOn1Description: string
  addOn1Price: string
  addOn2Enabled: boolean
  addOn2Title: string
  addOn2Description: string
  addOn2Price: string
  addOn3Enabled: boolean
  addOn3Title: string
  addOn3Description: string
  addOn3Price: string
  addOn4Enabled: boolean
  addOn4Title: string
  addOn4Description: string
  addOn4Price: string

  // Step 5: Contact & Instructions
  contactEmail: string
  contactPhone: string
  registrationInstructions: string
  confirmationEmailMessage: string
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
  showCapacity: boolean
  availabilityThreshold: string
  countdownLocation: 'hero' | 'sticky' | 'registration'
  countdownBeforeOpen: boolean
  countdownBeforeClose: boolean
  enableWaitlist: boolean
  waitlistCapacity: string

  // Landing page content fields
  faqContent: string
  scheduleContent: string
  includedContent: string
  bringContent: string
  contactInfo: string

  // Confirmation email options
  showFaqInEmail: boolean
  showBringInEmail: boolean
  showScheduleInEmail: boolean
  showIncludedInEmail: boolean
  showContactInEmail: boolean

  // Theme Customization
  backgroundImageUrl: string
  primaryColor: string
  secondaryColor: string
  overlayColor: string
  overlayOpacity: string

  // Staff/Vendor Registration
  staffRegistrationEnabled: boolean
  staffVolunteerPrice: string
  vendorStaffPrice: string
  staffRoles: string[] // Role options for dropdown
  vendorRegistrationEnabled: boolean
  vendorTiers: VendorTier[]
}

interface VendorTier {
  id: string
  name: string
  price: string
  description: string
  active: boolean
  quantityLimit: string
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
  eventId,
  initialData,
  isEditMode = false,
}: CreateEventClientProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Use initialData if provided (edit mode), otherwise use defaults
  const defaultFormData: EventFormData = {
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
    allowLoginWhenClosed: true,

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

    // Individual Registration Pricing
    individualEarlyBirdPrice: '',
    individualBasePrice: '100',
    individualLatePrice: '',
    singleRoomPrice: '100',
    doubleRoomPrice: '50',
    tripleRoomPrice: '40',
    quadRoomPrice: '30',
    individualOffCampusPrice: '100',
    individualDayPassPrice: '50',
    individualMealPackagePrice: '50',

    // Step 3: Features
    groupRegistrationEnabled: true,
    individualRegistrationEnabled: false,
    liabilityFormsRequiredIndividual: false,
    porosHousingEnabled: false,
    tshirtsEnabled: false,
    individualMealsEnabled: false,
    salveCheckinEnabled: false,
    raphaMedicalEnabled: false,
    publicPortalEnabled: false,
    allowOnCampus: true,
    allowOffCampus: true,
    allowDayPass: false,
    allowIndividualDayPass: false,
    allowSingleRoom: true,
    allowDoubleRoom: true,
    allowTripleRoom: true,
    allowQuadRoom: true,
    singleRoomLabel: '',
    doubleRoomLabel: '',
    tripleRoomLabel: '',
    quadRoomLabel: '',

    // Add-ons
    addOn1Enabled: false,
    addOn1Title: '',
    addOn1Description: '',
    addOn1Price: '',
    addOn2Enabled: false,
    addOn2Title: '',
    addOn2Description: '',
    addOn2Price: '',
    addOn3Enabled: false,
    addOn3Title: '',
    addOn3Description: '',
    addOn3Price: '',
    addOn4Enabled: false,
    addOn4Title: '',
    addOn4Description: '',
    addOn4Price: '',

    // Step 5
    contactEmail: '',
    contactPhone: '',
    registrationInstructions: '',
    confirmationEmailMessage: '',
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
    showCapacity: true,
    availabilityThreshold: '20',
    countdownLocation: 'hero',
    countdownBeforeOpen: true,
    countdownBeforeClose: true,
    enableWaitlist: false,
    waitlistCapacity: '',

    // Landing page content
    faqContent: '',
    scheduleContent: '',
    includedContent: '',
    bringContent: '',
    contactInfo: '',

    // Confirmation email options
    showFaqInEmail: false,
    showBringInEmail: false,
    showScheduleInEmail: false,
    showIncludedInEmail: false,
    showContactInEmail: true,

    // Theme Customization
    backgroundImageUrl: '',
    primaryColor: '#1E3A5F', // Default navy
    secondaryColor: '#9C8466', // Default gold
    overlayColor: '#000000', // Default black overlay
    overlayOpacity: '40', // 40% opacity

    // Staff/Vendor Registration
    staffRegistrationEnabled: false,
    staffVolunteerPrice: '0',
    vendorStaffPrice: '0',
    staffRoles: ['Registration Desk', 'Setup Crew', 'Kitchen Staff', 'Security', 'Emcee', 'General Volunteer'],
    vendorRegistrationEnabled: false,
    vendorTiers: [
      { id: '1', name: 'Small Booth', price: '200', description: '10x10, no electricity', active: true, quantityLimit: '' },
      { id: '2', name: 'Medium Booth', price: '350', description: '10x20, includes electricity', active: true, quantityLimit: '' },
      { id: '3', name: 'Large Booth', price: '500', description: '20x20, includes electricity', active: false, quantityLimit: '' },
    ],
  }

  const [formData, setFormData] = useState<EventFormData>({
    ...defaultFormData,
    ...initialData,
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
      const token = await getToken()
      const url = isEditMode
        ? `/api/admin/events/${eventId}`
        : '/api/admin/events/create'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          organizationId,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save draft')
      }

      const { event } = await response.json()
      // Redirect to event detail page
      router.push(`/dashboard/admin/events/${event.id}`)
    } catch (error) {
      console.error('Error saving draft:', error)
      alert(error instanceof Error ? error.message : 'Failed to save draft. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      const url = isEditMode
        ? `/api/admin/events/${eventId}`
        : '/api/admin/events/create'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          organizationId,
          status: 'published',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish event')
      }

      const { event } = await response.json()
      // Redirect to event detail page
      router.push(`/dashboard/admin/events/${event.id}`)
    } catch (error) {
      console.error('Error publishing event:', error)
      alert(error instanceof Error ? error.message : 'Failed to publish event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!isEditMode && (
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            Create New Event
          </h1>
          <p className="text-[#6B7280]">
            Fill in the details below to create your event
          </p>
        </div>
      )}

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
                {/* Registration Type - FIRST QUESTION */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    📝 Registration Type <span className="text-red-500">*</span>
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

                    {/* Youth Event Toggle - Only show when Individual Registration is selected */}
                    {formData.individualRegistrationEnabled && (
                      <div className="ml-7 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            id="liabilityFormsRequiredIndividual"
                            checked={formData.liabilityFormsRequiredIndividual}
                            onChange={(e) =>
                              updateFormData({
                                liabilityFormsRequiredIndividual: e.target.checked,
                              })
                            }
                            className="w-4 h-4 mt-1 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="liabilityFormsRequiredIndividual"
                              className="mb-0 font-medium text-amber-900 cursor-pointer"
                            >
                              📋 Youth Event (Participants Under 18)
                            </Label>
                            <p className="text-sm text-amber-700 mt-1">
                              Enable this if your event includes participants under 18 years old.
                              This will require liability forms with parental consent for minors.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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

                {/* Late Fee Settings - Only for Group Registration */}
                {formData.groupRegistrationEnabled && (
                  <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-2">
                      💰 Late Fee Settings (Group Registration Only)
                    </h3>
                    <p className="text-sm text-orange-800 mb-3">
                      Late fees apply to groups that select &quot;pay later&quot; deposit options
                    </p>

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
                )}

                {/* Login Access When Registration Closed */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    🔐 Access Settings
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowLoginWhenClosed"
                      checked={formData.allowLoginWhenClosed}
                      onChange={(e) =>
                        updateFormData({ allowLoginWhenClosed: e.target.checked })
                      }
                      className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                    />
                    <Label htmlFor="allowLoginWhenClosed" className="mb-0">
                      Allow group leaders to login when registration is closed
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500 ml-6 mt-2">
                    When enabled, group leaders can still access their dashboard to manage participants, even after registration closes
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Features & Modules */}
          {currentStep === 3 && (
            <>
              <div className="space-y-6">
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

                {/* Individual Meals Package - Only for Individual Registration */}
                {formData.individualRegistrationEnabled && (
                  <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-3">
                      🍽️ Individual Meal Packages
                    </h3>
                    <p className="text-sm text-orange-800 mb-3">
                      Only for individual registration (groups include meals automatically)
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="individualMealsEnabled"
                        checked={formData.individualMealsEnabled}
                        onChange={(e) =>
                          updateFormData({ individualMealsEnabled: e.target.checked })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="individualMealsEnabled" className="mb-0 font-medium">
                        Enable Individual Meal Package Add-On
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 ml-6 mt-2">
                      Individuals can add a meal package during registration (with dietary restrictions option)
                    </p>
                  </div>
                )}

                {/* Day Pass Ticket for Individual Registration */}
                {formData.individualRegistrationEnabled && (
                  <div className="bg-cyan-50 p-4 rounded-lg border-2 border-cyan-200">
                    <h3 className="font-semibold text-cyan-900 mb-3">
                      🎫 Day Pass Ticket Option
                    </h3>
                    <p className="text-sm text-cyan-800 mb-3">
                      Allow individuals to register for a day pass (attending without overnight stay or housing)
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="allowIndividualDayPass"
                        checked={formData.allowIndividualDayPass}
                        onChange={(e) =>
                          updateFormData({ allowIndividualDayPass: e.target.checked })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="allowIndividualDayPass" className="mb-0 font-medium">
                        Enable Day Pass as a Ticket Option
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 ml-6 mt-2">
                      Day pass is a ticket type - individuals choose between General Admission or Day Pass during registration
                    </p>
                  </div>
                )}

                {/* Add-ons Section - Primarily for Individual Registration */}
                {formData.individualRegistrationEnabled && (
                  <div className="bg-violet-50 p-4 rounded-lg border-2 border-violet-200">
                    <h3 className="font-semibold text-violet-900 mb-3">
                      ✨ Event Add-Ons
                    </h3>
                    <p className="text-sm text-violet-800 mb-4">
                      Add optional items that individuals can purchase during registration (up to 4 add-ons)
                    </p>

                    {/* Add-on 1 */}
                    <div className="border-l-4 border-violet-400 pl-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="addOn1Enabled"
                          checked={formData.addOn1Enabled}
                          onChange={(e) => updateFormData({ addOn1Enabled: e.target.checked })}
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        <Label htmlFor="addOn1Enabled" className="font-semibold cursor-pointer">
                          Add-On 1
                        </Label>
                      </div>
                      {formData.addOn1Enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                          <div>
                            <Label htmlFor="addOn1Title" className="text-sm">Title</Label>
                            <Input
                              id="addOn1Title"
                              type="text"
                              value={formData.addOn1Title}
                              onChange={(e) => updateFormData({ addOn1Title: e.target.value })}
                              placeholder="e.g., Event T-Shirt"
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Label htmlFor="addOn1Price" className="text-sm">Price</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="addOn1Price"
                                type="number"
                                value={formData.addOn1Price}
                                onChange={(e) => updateFormData({ addOn1Price: e.target.value })}
                                placeholder="25"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <Label htmlFor="addOn1Description" className="text-sm">Description</Label>
                            <Input
                              id="addOn1Description"
                              type="text"
                              value={formData.addOn1Description}
                              onChange={(e) => updateFormData({ addOn1Description: e.target.value })}
                              placeholder="Optional description..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add-on 2 */}
                    <div className="border-l-4 border-violet-400 pl-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="addOn2Enabled"
                          checked={formData.addOn2Enabled}
                          onChange={(e) => updateFormData({ addOn2Enabled: e.target.checked })}
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        <Label htmlFor="addOn2Enabled" className="font-semibold cursor-pointer">
                          Add-On 2
                        </Label>
                      </div>
                      {formData.addOn2Enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                          <div>
                            <Label htmlFor="addOn2Title" className="text-sm">Title</Label>
                            <Input
                              id="addOn2Title"
                              type="text"
                              value={formData.addOn2Title}
                              onChange={(e) => updateFormData({ addOn2Title: e.target.value })}
                              placeholder="e.g., Parking Pass"
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Label htmlFor="addOn2Price" className="text-sm">Price</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="addOn2Price"
                                type="number"
                                value={formData.addOn2Price}
                                onChange={(e) => updateFormData({ addOn2Price: e.target.value })}
                                placeholder="15"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <Label htmlFor="addOn2Description" className="text-sm">Description</Label>
                            <Input
                              id="addOn2Description"
                              type="text"
                              value={formData.addOn2Description}
                              onChange={(e) => updateFormData({ addOn2Description: e.target.value })}
                              placeholder="Optional description..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add-on 3 */}
                    <div className="border-l-4 border-violet-400 pl-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="addOn3Enabled"
                          checked={formData.addOn3Enabled}
                          onChange={(e) => updateFormData({ addOn3Enabled: e.target.checked })}
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        <Label htmlFor="addOn3Enabled" className="font-semibold cursor-pointer">
                          Add-On 3
                        </Label>
                      </div>
                      {formData.addOn3Enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                          <div>
                            <Label htmlFor="addOn3Title" className="text-sm">Title</Label>
                            <Input
                              id="addOn3Title"
                              type="text"
                              value={formData.addOn3Title}
                              onChange={(e) => updateFormData({ addOn3Title: e.target.value })}
                              placeholder="e.g., Extra Materials"
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Label htmlFor="addOn3Price" className="text-sm">Price</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="addOn3Price"
                                type="number"
                                value={formData.addOn3Price}
                                onChange={(e) => updateFormData({ addOn3Price: e.target.value })}
                                placeholder="10"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <Label htmlFor="addOn3Description" className="text-sm">Description</Label>
                            <Input
                              id="addOn3Description"
                              type="text"
                              value={formData.addOn3Description}
                              onChange={(e) => updateFormData({ addOn3Description: e.target.value })}
                              placeholder="Optional description..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add-on 4 */}
                    <div className="border-l-4 border-violet-400 pl-4">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="addOn4Enabled"
                          checked={formData.addOn4Enabled}
                          onChange={(e) => updateFormData({ addOn4Enabled: e.target.checked })}
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        <Label htmlFor="addOn4Enabled" className="font-semibold cursor-pointer">
                          Add-On 4
                        </Label>
                      </div>
                      {formData.addOn4Enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                          <div>
                            <Label htmlFor="addOn4Title" className="text-sm">Title</Label>
                            <Input
                              id="addOn4Title"
                              type="text"
                              value={formData.addOn4Title}
                              onChange={(e) => updateFormData({ addOn4Title: e.target.value })}
                              placeholder="e.g., Photo Package"
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Label htmlFor="addOn4Price" className="text-sm">Price</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="addOn4Price"
                                type="number"
                                value={formData.addOn4Price}
                                onChange={(e) => updateFormData({ addOn4Price: e.target.value })}
                                placeholder="35"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <Label htmlFor="addOn4Description" className="text-sm">Description</Label>
                            <Input
                              id="addOn4Description"
                              type="text"
                              value={formData.addOn4Description}
                              onChange={(e) => updateFormData({ addOn4Description: e.target.value })}
                              placeholder="Optional description..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

                {/* Staff/Vendor Registration */}
                <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-200">
                  <h3 className="font-semibold text-emerald-900 mb-3">
                    👷 Staff & Vendor Registration
                  </h3>
                  <p className="text-sm text-emerald-800 mb-4">
                    Enable registration for event staff, volunteers, and vendors (separate from attendees)
                  </p>

                  {/* Staff/Volunteer Registration Toggle */}
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-emerald-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="staffRegistrationEnabled"
                          checked={formData.staffRegistrationEnabled}
                          onChange={(e) =>
                            updateFormData({
                              staffRegistrationEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                        />
                        <Label htmlFor="staffRegistrationEnabled" className="mb-0 font-medium">
                          Enable Staff/Volunteer Registration
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 ml-6 mb-3">
                        Create a separate registration link for staff and volunteers working the event
                      </p>

                      {formData.staffRegistrationEnabled && (
                        <div className="ml-6 space-y-4 pt-3 border-t border-emerald-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="staffVolunteerPrice">General Staff/Volunteer Price</Label>
                              <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <Input
                                  id="staffVolunteerPrice"
                                  type="number"
                                  value={formData.staffVolunteerPrice}
                                  onChange={(e) => updateFormData({ staffVolunteerPrice: e.target.value })}
                                  placeholder="0"
                                  className="pl-7"
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Set to 0 for free registration</p>
                            </div>
                            <div>
                              <Label htmlFor="vendorStaffPrice">Vendor Booth Staff Price</Label>
                              <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <Input
                                  id="vendorStaffPrice"
                                  type="number"
                                  value={formData.vendorStaffPrice}
                                  onChange={(e) => updateFormData({ vendorStaffPrice: e.target.value })}
                                  placeholder="0"
                                  className="pl-7"
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Price for people working vendor booths</p>
                            </div>
                          </div>

                          {/* Staff Roles */}
                          <div>
                            <Label className="mb-2 block">Staff Roles (for dropdown)</Label>
                            <div className="flex flex-wrap gap-2">
                              {formData.staffRoles.map((role, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800"
                                >
                                  {role}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newRoles = formData.staffRoles.filter((_, i) => i !== index)
                                      updateFormData({ staffRoles: newRoles })
                                    }}
                                    className="ml-1 text-emerald-600 hover:text-emerald-900"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Input
                                id="newStaffRole"
                                placeholder="Add new role..."
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const input = e.target as HTMLInputElement
                                    if (input.value.trim()) {
                                      updateFormData({ staffRoles: [...formData.staffRoles, input.value.trim()] })
                                      input.value = ''
                                    }
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const input = document.getElementById('newStaffRole') as HTMLInputElement
                                  if (input?.value.trim()) {
                                    updateFormData({ staffRoles: [...formData.staffRoles, input.value.trim()] })
                                    input.value = ''
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Vendor Registration Toggle */}
                    <div className="bg-white p-4 rounded-lg border border-emerald-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="vendorRegistrationEnabled"
                          checked={formData.vendorRegistrationEnabled}
                          onChange={(e) =>
                            updateFormData({
                              vendorRegistrationEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                        />
                        <Label htmlFor="vendorRegistrationEnabled" className="mb-0 font-medium">
                          Enable Vendor Registration
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 ml-6 mb-3">
                        Allow businesses to register for vendor booths at your event
                      </p>

                      {formData.vendorRegistrationEnabled && (
                        <div className="ml-6 space-y-4 pt-3 border-t border-emerald-200">
                          <Label className="mb-2 block font-medium">Vendor Tiers</Label>
                          <p className="text-xs text-gray-500 mb-3">
                            Define booth options and pricing. Vendors select a tier when registering. You can adjust pricing when creating their invoice.
                          </p>

                          {formData.vendorTiers.map((tier, index) => (
                            <div key={tier.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={tier.active}
                                    onChange={(e) => {
                                      const newTiers = [...formData.vendorTiers]
                                      newTiers[index] = { ...tier, active: e.target.checked }
                                      updateFormData({ vendorTiers: newTiers })
                                    }}
                                    className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                                  />
                                  <span className={`text-sm font-medium ${tier.active ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {tier.active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTiers = formData.vendorTiers.filter((_, i) => i !== index)
                                    updateFormData({ vendorTiers: newTiers })
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-xs">Tier Name</Label>
                                  <Input
                                    value={tier.name}
                                    onChange={(e) => {
                                      const newTiers = [...formData.vendorTiers]
                                      newTiers[index] = { ...tier, name: e.target.value }
                                      updateFormData({ vendorTiers: newTiers })
                                    }}
                                    placeholder="Small Booth"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Price</Label>
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                      type="number"
                                      value={tier.price}
                                      onChange={(e) => {
                                        const newTiers = [...formData.vendorTiers]
                                        newTiers[index] = { ...tier, price: e.target.value }
                                        updateFormData({ vendorTiers: newTiers })
                                      }}
                                      placeholder="200"
                                      className="pl-7"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Description</Label>
                                  <Input
                                    value={tier.description}
                                    onChange={(e) => {
                                      const newTiers = [...formData.vendorTiers]
                                      newTiers[index] = { ...tier, description: e.target.value }
                                      updateFormData({ vendorTiers: newTiers })
                                    }}
                                    placeholder="10x10, no electricity"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Quantity Limit</Label>
                                  <Input
                                    type="number"
                                    value={tier.quantityLimit}
                                    onChange={(e) => {
                                      const newTiers = [...formData.vendorTiers]
                                      newTiers[index] = { ...tier, quantityLimit: e.target.value }
                                      updateFormData({ vendorTiers: newTiers })
                                    }}
                                    placeholder="Unlimited"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const newTier: VendorTier = {
                                id: String(Date.now()),
                                name: '',
                                price: '',
                                description: '',
                                active: true,
                                quantityLimit: '',
                              }
                              updateFormData({ vendorTiers: [...formData.vendorTiers, newTier] })
                            }}
                            className="w-full"
                          >
                            + Add Vendor Tier
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Pricing - Different based on registration type */}
          {currentStep === 4 && (
            <>
              <div className="space-y-6">
                {/* Show which registration type they selected */}
                <div className="bg-blue-100 border-2 border-blue-300 p-4 rounded-lg">
                  <p className="text-blue-900 font-medium">
                    💡 Pricing for:{' '}
                    <span className="font-bold">
                      {formData.groupRegistrationEnabled
                        ? 'Group Registration'
                        : 'Individual Registration'}
                    </span>
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {formData.groupRegistrationEnabled
                      ? 'Configure pricing for groups, housing types, and deposits'
                      : 'Configure individual pricing and room type modifiers'}
                  </p>
                </div>

                {/* GROUP REGISTRATION PRICING */}
                {formData.groupRegistrationEnabled && (
                  <>
                    {/* Base Pricing - On-Campus (Full Price) */}
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        🏫 On-Campus Housing Pricing (Base Price)
                      </h3>
                      <p className="text-sm text-blue-800 mb-4">
                        Base prices for participants staying on-campus (includes housing, meals, materials)
                      </p>

                      {/* Youth Pricing */}
                      <div className="mb-4">
                        <h4 className="font-medium text-blue-900 mb-2">Youth Pricing</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="youthEarlyBirdPrice">Early Bird</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="youthEarlyBirdPrice"
                                type="number"
                                value={formData.youthEarlyBirdPrice}
                                onChange={(e) => updateFormData({ youthEarlyBirdPrice: e.target.value })}
                                placeholder="90"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="youthRegularPrice">Regular <span className="text-red-500">*</span></Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="youthRegularPrice"
                                type="number"
                                value={formData.youthRegularPrice}
                                onChange={(e) => updateFormData({ youthRegularPrice: e.target.value })}
                                placeholder="100"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="youthLatePrice">Late</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="youthLatePrice"
                                type="number"
                                value={formData.youthLatePrice}
                                onChange={(e) => updateFormData({ youthLatePrice: e.target.value })}
                                placeholder="120"
                                className="pl-7"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chaperone Pricing */}
                      <div className="mb-4">
                        <h4 className="font-medium text-blue-900 mb-2">Chaperone Pricing (Ages 21+)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="chaperoneEarlyBirdPrice">Early Bird</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="chaperoneEarlyBirdPrice"
                                type="number"
                                value={formData.chaperoneEarlyBirdPrice}
                                onChange={(e) => updateFormData({ chaperoneEarlyBirdPrice: e.target.value })}
                                placeholder="65"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="chaperoneRegularPrice">Regular <span className="text-red-500">*</span></Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="chaperoneRegularPrice"
                                type="number"
                                value={formData.chaperoneRegularPrice}
                                onChange={(e) => updateFormData({ chaperoneRegularPrice: e.target.value })}
                                placeholder="75"
                                className="pl-7"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="chaperoneLatePrice">Late</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="chaperoneLatePrice"
                                type="number"
                                value={formData.chaperoneLatePrice}
                                onChange={(e) => updateFormData({ chaperoneLatePrice: e.target.value })}
                                placeholder="90"
                                className="pl-7"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Clergy Pricing */}
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">Clergy Pricing</h4>
                        <div className="max-w-xs">
                          <Label htmlFor="priestPrice">Priest/Deacon Price</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="priestPrice"
                              type="number"
                              value={formData.priestPrice}
                              onChange={(e) => updateFormData({ priestPrice: e.target.value })}
                              placeholder="0"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Typically free ($0) for clergy</p>
                        </div>
                      </div>
                    </div>

                    {/* Housing Type Pricing Modifiers */}
                    {formData.porosHousingEnabled && (
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <h3 className="font-semibold text-green-900 mb-2">
                          🏠 Alternative Housing Pricing
                        </h3>
                        <p className="text-sm text-green-800 mb-4">
                          Set different prices for off-campus and day pass options (if enabled in Features)
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.allowOffCampus && (
                            <>
                              <div>
                                <Label htmlFor="offCampusYouthPrice">Off-Campus Youth</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    id="offCampusYouthPrice"
                                    type="number"
                                    value={formData.offCampusYouthPrice}
                                    onChange={(e) => updateFormData({ offCampusYouthPrice: e.target.value })}
                                    placeholder="75"
                                    className="pl-7"
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Staying at hotel/home</p>
                              </div>
                              <div>
                                <Label htmlFor="offCampusChaperonePrice">Off-Campus Chaperone</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    id="offCampusChaperonePrice"
                                    type="number"
                                    value={formData.offCampusChaperonePrice}
                                    onChange={(e) => updateFormData({ offCampusChaperonePrice: e.target.value })}
                                    placeholder="50"
                                    className="pl-7"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {formData.allowDayPass && (
                            <>
                              <div>
                                <Label htmlFor="dayPassYouthPrice">Day Pass Youth</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    id="dayPassYouthPrice"
                                    type="number"
                                    value={formData.dayPassYouthPrice}
                                    onChange={(e) => updateFormData({ dayPassYouthPrice: e.target.value })}
                                    placeholder="50"
                                    className="pl-7"
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Attending sessions only</p>
                              </div>
                              <div>
                                <Label htmlFor="dayPassChaperonePrice">Day Pass Chaperone</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    id="dayPassChaperonePrice"
                                    type="number"
                                    value={formData.dayPassChaperonePrice}
                                    onChange={(e) => updateFormData({ dayPassChaperonePrice: e.target.value })}
                                    placeholder="25"
                                    className="pl-7"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deposit Settings - Groups Only */}
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        💰 Deposit Settings (Groups Only)
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        How much groups must pay upfront when registering
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="depositPercentage"
                            name="depositType"
                            value="percentage"
                            checked={formData.depositType === 'percentage'}
                            onChange={() => updateFormData({ depositType: 'percentage' })}
                            className="w-4 h-4 text-[#1E3A5F]"
                          />
                          <Label htmlFor="depositPercentage" className="mb-0">Percentage-based:</Label>
                          <Input
                            type="number"
                            value={formData.depositPercentage}
                            onChange={(e) => updateFormData({ depositPercentage: e.target.value })}
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
                            onChange={() => updateFormData({ depositType: 'fixed' })}
                            className="w-4 h-4 text-[#1E3A5F]"
                          />
                          <Label htmlFor="depositFixed" className="mb-0">Fixed amount: $</Label>
                          <Input
                            type="number"
                            value={formData.depositAmount}
                            onChange={(e) => updateFormData({ depositAmount: e.target.value })}
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
                            onChange={() => updateFormData({ depositType: 'full' })}
                            className="w-4 h-4 text-[#1E3A5F]"
                          />
                          <Label htmlFor="depositFull" className="mb-0">Full payment required</Label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="depositNone"
                            name="depositType"
                            value="none"
                            checked={formData.depositType === 'none'}
                            onChange={() => updateFormData({ depositType: 'none' })}
                            className="w-4 h-4 text-[#1E3A5F]"
                          />
                          <Label htmlFor="depositNone" className="mb-0">No deposit (pay later)</Label>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* INDIVIDUAL REGISTRATION PRICING */}
                {formData.individualRegistrationEnabled && (
                  <>
                    {/* Individual Base Pricing */}
                    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                      <h3 className="font-semibold text-purple-900 mb-2">
                        🧑 Individual General Admission Pricing
                      </h3>
                      <p className="text-sm text-purple-800 mb-4">
                        Base price for event attendance only (does NOT include housing or meals). Set early bird and late pricing based on your registration deadlines.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="individualEarlyBirdPrice">Early Bird</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="individualEarlyBirdPrice"
                              type="number"
                              value={formData.individualEarlyBirdPrice}
                              onChange={(e) => updateFormData({ individualEarlyBirdPrice: e.target.value })}
                              placeholder="80"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Before early bird deadline</p>
                        </div>
                        <div>
                          <Label htmlFor="individualBasePrice">
                            Regular <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="individualBasePrice"
                              type="number"
                              value={formData.individualBasePrice}
                              onChange={(e) => updateFormData({ individualBasePrice: e.target.value })}
                              placeholder="100"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Standard pricing</p>
                        </div>
                        <div>
                          <Label htmlFor="individualLatePrice">Late</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="individualLatePrice"
                              type="number"
                              value={formData.individualLatePrice}
                              onChange={(e) => updateFormData({ individualLatePrice: e.target.value })}
                              placeholder="120"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">After regular deadline</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Includes event attendance and materials only. Housing and meals are separate add-ons.
                      </p>
                    </div>

                    {/* Day Pass Pricing - Only if Day Pass is enabled */}
                    {formData.allowIndividualDayPass && (
                      <div className="bg-cyan-50 p-4 rounded-lg border-2 border-cyan-200">
                        <h3 className="font-semibold text-cyan-900 mb-2">
                          🎫 Day Pass Pricing
                        </h3>
                        <p className="text-sm text-cyan-800 mb-4">
                          Price for attending without overnight stay (no housing required)
                        </p>

                        <div className="max-w-md">
                          <Label htmlFor="individualDayPassPrice">
                            Day Pass Price <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="individualDayPassPrice"
                              type="number"
                              value={formData.individualDayPassPrice}
                              onChange={(e) => updateFormData({ individualDayPassPrice: e.target.value })}
                              placeholder="50"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Day pass attendees select this as their ticket type (no housing or overnight stay)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Room Type Add-Ons */}
                    {formData.porosHousingEnabled && formData.allowOnCampus && (
                      <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                        <h3 className="font-semibold text-indigo-900 mb-2">
                          🛏️ On-Campus Housing Add-On (Optional)
                        </h3>
                        <p className="text-sm text-indigo-800 mb-4">
                          Additional cost if staying on-campus. Select which room types are available and optionally customize their labels.
                        </p>

                        <div className="space-y-6">
                          {/* Single Room */}
                          <div className="border-l-4 border-indigo-400 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="checkbox"
                                id="allowSingleRoom"
                                checked={formData.allowSingleRoom}
                                onChange={(e) => updateFormData({ allowSingleRoom: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <Label htmlFor="allowSingleRoom" className="font-semibold text-base cursor-pointer">
                                Enable Single Room
                              </Label>
                            </div>
                            {formData.allowSingleRoom && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                                <div>
                                  <Label htmlFor="singleRoomLabel" className="text-sm">Custom Label (optional)</Label>
                                  <Input
                                    id="singleRoomLabel"
                                    type="text"
                                    value={formData.singleRoomLabel}
                                    onChange={(e) => updateFormData({ singleRoomLabel: e.target.value })}
                                    placeholder="e.g., Single with A/C"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="singleRoomPrice" className="text-sm">Price (add-on)</Label>
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                      id="singleRoomPrice"
                                      type="number"
                                      value={formData.singleRoomPrice}
                                      onChange={(e) => updateFormData({ singleRoomPrice: e.target.value })}
                                      placeholder="100"
                                      className="pl-7"
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Total: ${formData.individualBasePrice || '100'} + ${formData.singleRoomPrice || '100'} = <span className="font-semibold">${(parseFloat(formData.individualBasePrice || '100') + parseFloat(formData.singleRoomPrice || '100')).toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Double Room */}
                          <div className="border-l-4 border-indigo-400 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="checkbox"
                                id="allowDoubleRoom"
                                checked={formData.allowDoubleRoom}
                                onChange={(e) => updateFormData({ allowDoubleRoom: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <Label htmlFor="allowDoubleRoom" className="font-semibold text-base cursor-pointer">
                                Enable Double Room
                              </Label>
                            </div>
                            {formData.allowDoubleRoom && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                                <div>
                                  <Label htmlFor="doubleRoomLabel" className="text-sm">Custom Label (optional)</Label>
                                  <Input
                                    id="doubleRoomLabel"
                                    type="text"
                                    value={formData.doubleRoomLabel}
                                    onChange={(e) => updateFormData({ doubleRoomLabel: e.target.value })}
                                    placeholder="e.g., Double without A/C"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="doubleRoomPrice" className="text-sm">Price (add-on)</Label>
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                      id="doubleRoomPrice"
                                      type="number"
                                      value={formData.doubleRoomPrice}
                                      onChange={(e) => updateFormData({ doubleRoomPrice: e.target.value })}
                                      placeholder="50"
                                      className="pl-7"
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Total: ${formData.individualBasePrice || '100'} + ${formData.doubleRoomPrice || '50'} = <span className="font-semibold">${(parseFloat(formData.individualBasePrice || '100') + parseFloat(formData.doubleRoomPrice || '50')).toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Triple Room */}
                          <div className="border-l-4 border-indigo-400 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="checkbox"
                                id="allowTripleRoom"
                                checked={formData.allowTripleRoom}
                                onChange={(e) => updateFormData({ allowTripleRoom: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <Label htmlFor="allowTripleRoom" className="font-semibold text-base cursor-pointer">
                                Enable Triple Room
                              </Label>
                            </div>
                            {formData.allowTripleRoom && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                                <div>
                                  <Label htmlFor="tripleRoomLabel" className="text-sm">Custom Label (optional)</Label>
                                  <Input
                                    id="tripleRoomLabel"
                                    type="text"
                                    value={formData.tripleRoomLabel}
                                    onChange={(e) => updateFormData({ tripleRoomLabel: e.target.value })}
                                    placeholder="e.g., Triple shared"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="tripleRoomPrice" className="text-sm">Price (add-on)</Label>
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                      id="tripleRoomPrice"
                                      type="number"
                                      value={formData.tripleRoomPrice}
                                      onChange={(e) => updateFormData({ tripleRoomPrice: e.target.value })}
                                      placeholder="40"
                                      className="pl-7"
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Total: ${formData.individualBasePrice || '100'} + ${formData.tripleRoomPrice || '40'} = <span className="font-semibold">${(parseFloat(formData.individualBasePrice || '100') + parseFloat(formData.tripleRoomPrice || '40')).toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quad Room */}
                          <div className="border-l-4 border-indigo-400 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="checkbox"
                                id="allowQuadRoom"
                                checked={formData.allowQuadRoom}
                                onChange={(e) => updateFormData({ allowQuadRoom: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <Label htmlFor="allowQuadRoom" className="font-semibold text-base cursor-pointer">
                                Enable Quad Room
                              </Label>
                            </div>
                            {formData.allowQuadRoom && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                                <div>
                                  <Label htmlFor="quadRoomLabel" className="text-sm">Custom Label (optional)</Label>
                                  <Input
                                    id="quadRoomLabel"
                                    type="text"
                                    value={formData.quadRoomLabel}
                                    onChange={(e) => updateFormData({ quadRoomLabel: e.target.value })}
                                    placeholder="e.g., Quad shared"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="quadRoomPrice" className="text-sm">Price (add-on)</Label>
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                      id="quadRoomPrice"
                                      type="number"
                                      value={formData.quadRoomPrice}
                                      onChange={(e) => updateFormData({ quadRoomPrice: e.target.value })}
                                      placeholder="30"
                                      className="pl-7"
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Total: ${formData.individualBasePrice || '100'} + ${formData.quadRoomPrice || '30'} = <span className="font-semibold">${(parseFloat(formData.individualBasePrice || '100') + parseFloat(formData.quadRoomPrice || '30')).toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Individual Off-Campus Option */}
                    {formData.porosHousingEnabled && formData.allowOffCampus && (
                      <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                        <h3 className="font-semibold text-amber-900 mb-2">
                          🏨 Not Staying On-Campus
                        </h3>
                        <p className="text-sm text-amber-800 mb-4">
                          Price for individuals staying off-campus or commuting (typically same as general admission)
                        </p>

                        <div className="max-w-md">
                          <Label htmlFor="individualOffCampusPrice">Off-Campus Price</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="individualOffCampusPrice"
                              type="number"
                              value={formData.individualOffCampusPrice}
                              onChange={(e) => updateFormData({ individualOffCampusPrice: e.target.value })}
                              placeholder="100"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Usually equals general admission price (${formData.individualBasePrice || '100'}) since no housing is included
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Individual Meal Package Add-On */}
                    {formData.individualMealsEnabled && (
                      <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                        <h3 className="font-semibold text-orange-900 mb-2">
                          🍽️ Meal Package Add-On
                        </h3>
                        <p className="text-sm text-orange-800 mb-4">
                          Optional meal package for individuals (includes dietary restrictions option)
                        </p>

                        <div className="max-w-md">
                          <Label htmlFor="individualMealPackagePrice">
                            Meal Package Price
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="individualMealPackagePrice"
                              type="number"
                              value={formData.individualMealPackagePrice}
                              onChange={(e) => updateFormData({ individualMealPackagePrice: e.target.value })}
                              placeholder="50"
                              className="pl-7"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Add-on for all event meals. Example: ${formData.individualBasePrice || '100'} + ${formData.individualMealPackagePrice || '50'} = <span className="font-semibold">${(parseFloat(formData.individualBasePrice || '100') + parseFloat(formData.individualMealPackagePrice || '50')).toFixed(2)}</span>
                          </p>
                          <p className="text-sm text-orange-700 mt-2 font-medium">
                            💡 If meal package is selected, individuals will be asked for dietary restrictions during registration
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Note about no deposits */}
                    <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
                      <p className="text-blue-900 font-medium">
                        ℹ️ Note: Individual registrants pay the full amount at time of registration
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        Unlike group registrations, individuals cannot use the deposit system - they must pay in full when they register.
                      </p>
                    </div>
                  </>
                )}
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

                <div>
                  <Label htmlFor="confirmationEmailMessage">
                    Confirmation Email Custom Message
                  </Label>
                  <Textarea
                    id="confirmationEmailMessage"
                    value={formData.confirmationEmailMessage}
                    onChange={(e) =>
                      updateFormData({
                        confirmationEmailMessage: e.target.value,
                      })
                    }
                    placeholder="We're excited to have your group join us! Please complete liability forms as soon as possible..."
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This message will appear in the confirmation email sent to group leaders after registration. Leave blank to use the standard template.
                  </p>
                </div>

                {/* Check Payment Settings - Only for Group Registration */}
                {formData.groupRegistrationEnabled && (
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <h3 className="font-semibold text-green-900 mb-3">
                      💳 Check Payment Settings (Group Registration Only)
                    </h3>
                    <p className="text-sm text-green-800 mb-3">
                      Allow groups to pay by check instead of credit card (for deposit or balance)
                    </p>
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
                )}
              </div>
            </>
          )}

          {/* Step 6: Landing Page Content */}
          {currentStep === 6 && (
            <>
              <div className="space-y-6">
                {/* Landing Page Content Sections */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Landing Page Content Sections
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Toggle which sections appear on your landing page and customize their content
                  </p>

                  {/* Show Price */}
                  <div className="border-b border-blue-200 pb-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
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
                      <Label htmlFor="landingPageShowPrice" className="mb-0 font-medium">
                        Show Price
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">Pricing is configured in the Pricing step</p>
                  </div>

                  {/* Show Schedule */}
                  <div className="border-b border-blue-200 pb-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
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
                        <Label htmlFor="landingPageShowSchedule" className="mb-0 font-medium">
                          Show Schedule
                        </Label>
                      </div>
                      {formData.landingPageShowSchedule && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showScheduleInEmail"
                            checked={formData.showScheduleInEmail}
                            onChange={(e) => updateFormData({ showScheduleInEmail: e.target.checked })}
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="showScheduleInEmail" className="mb-0 text-xs text-gray-600">
                            Include in confirmation email
                          </Label>
                        </div>
                      )}
                    </div>
                    {formData.landingPageShowSchedule && (
                      <div className="ml-6">
                        <Textarea
                          id="scheduleContent"
                          value={formData.scheduleContent}
                          onChange={(e) => updateFormData({ scheduleContent: e.target.value })}
                          placeholder="Day 1: Check-in at 2pm, Welcome Mass at 5pm, Dinner at 6pm&#10;Day 2: Breakfast at 8am, Sessions at 9am..."
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>

                  {/* Show FAQ */}
                  <div className="border-b border-blue-200 pb-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
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
                        <Label htmlFor="landingPageShowFaq" className="mb-0 font-medium">
                          Show FAQ
                        </Label>
                      </div>
                      {formData.landingPageShowFaq && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showFaqInEmail"
                            checked={formData.showFaqInEmail}
                            onChange={(e) => updateFormData({ showFaqInEmail: e.target.checked })}
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="showFaqInEmail" className="mb-0 text-xs text-gray-600">
                            Include in confirmation email
                          </Label>
                        </div>
                      )}
                    </div>
                    {formData.landingPageShowFaq && (
                      <div className="ml-6">
                        <Textarea
                          id="faqContent"
                          value={formData.faqContent}
                          onChange={(e) => updateFormData({ faqContent: e.target.value })}
                          placeholder="Q: What should I bring?&#10;A: Pack comfortable clothes, toiletries, and a Bible.&#10;&#10;Q: Can I arrive early?&#10;A: Check-in begins at 2pm on the first day."
                          rows={4}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Format as Q: and A: for best display</p>
                      </div>
                    )}
                  </div>

                  {/* Show What's Included */}
                  <div className="border-b border-blue-200 pb-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
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
                        <Label htmlFor="landingPageShowIncluded" className="mb-0 font-medium">
                          Show What&apos;s Included
                        </Label>
                      </div>
                      {formData.landingPageShowIncluded && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showIncludedInEmail"
                            checked={formData.showIncludedInEmail}
                            onChange={(e) => updateFormData({ showIncludedInEmail: e.target.checked })}
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="showIncludedInEmail" className="mb-0 text-xs text-gray-600">
                            Include in confirmation email
                          </Label>
                        </div>
                      )}
                    </div>
                    {formData.landingPageShowIncluded && (
                      <div className="ml-6">
                        <Textarea
                          id="includedContent"
                          value={formData.includedContent}
                          onChange={(e) => updateFormData({ includedContent: e.target.value })}
                          placeholder="- Lodging for 3 nights&#10;- All meals (Friday dinner through Sunday lunch)&#10;- Event t-shirt&#10;- Conference materials&#10;- Access to all sessions"
                          rows={4}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Use bullet points (-) for list items</p>
                      </div>
                    )}
                  </div>

                  {/* Show What to Bring */}
                  <div className="border-b border-blue-200 pb-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
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
                        <Label htmlFor="landingPageShowBring" className="mb-0 font-medium">
                          Show What to Bring
                        </Label>
                      </div>
                      {formData.landingPageShowBring && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showBringInEmail"
                            checked={formData.showBringInEmail}
                            onChange={(e) => updateFormData({ showBringInEmail: e.target.checked })}
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="showBringInEmail" className="mb-0 text-xs text-gray-600">
                            Include in confirmation email
                          </Label>
                        </div>
                      )}
                    </div>
                    {formData.landingPageShowBring && (
                      <div className="ml-6">
                        <Textarea
                          id="bringContent"
                          value={formData.bringContent}
                          onChange={(e) => updateFormData({ bringContent: e.target.value })}
                          placeholder="- Comfortable clothes for activities&#10;- Toiletries and personal items&#10;- Bible and notebook&#10;- Sleeping bag or bedding (if camping)&#10;- Modest swimwear (if pool available)"
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>

                  {/* Show Contact Information */}
                  <div className="border-b border-blue-200 pb-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
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
                        <Label htmlFor="landingPageShowContact" className="mb-0 font-medium">
                          Show Contact Information
                        </Label>
                      </div>
                      {formData.landingPageShowContact && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showContactInEmail"
                            checked={formData.showContactInEmail}
                            onChange={(e) => updateFormData({ showContactInEmail: e.target.checked })}
                            className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                          />
                          <Label htmlFor="showContactInEmail" className="mb-0 text-xs text-gray-600">
                            Include in confirmation email
                          </Label>
                        </div>
                      )}
                    </div>
                    {formData.landingPageShowContact && (
                      <div className="ml-6">
                        <Textarea
                          id="contactInfo"
                          value={formData.contactInfo}
                          onChange={(e) => updateFormData({ contactInfo: e.target.value })}
                          placeholder="For questions about registration, contact:&#10;Email: info@example.com&#10;Phone: (555) 123-4567&#10;Office hours: Monday-Friday, 9am-5pm"
                          rows={3}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave blank to use the contact info from Step 5</p>
                      </div>
                    )}
                  </div>

                  {/* Show Capacity */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showCapacity"
                        checked={formData.showCapacity}
                        onChange={(e) =>
                          updateFormData({
                            showCapacity: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded"
                      />
                      <Label htmlFor="showCapacity" className="mb-0 font-medium">
                        Show Event Capacity
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6 mt-1">
                      Display the total event capacity (e.g., &quot;1000 attendees&quot;) on the landing page
                    </p>
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

                {/* Theme Customization */}
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3">
                    🎨 Theme Customization
                  </h3>
                  <p className="text-sm text-purple-800 mb-4">
                    Customize the look and feel of your event landing page
                  </p>

                  <div className="space-y-4">
                    {/* Background Image */}
                    <div>
                      <Label htmlFor="backgroundImageUrl">
                        Background Image URL
                      </Label>
                      <Input
                        id="backgroundImageUrl"
                        type="url"
                        value={formData.backgroundImageUrl}
                        onChange={(e) =>
                          updateFormData({
                            backgroundImageUrl: e.target.value,
                          })
                        }
                        placeholder="https://example.com/image.jpg"
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Enter the URL of your hero background image (recommended: 1920x1080px)
                      </p>
                    </div>

                    {/* Color Pickers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">
                          Primary Color (Navy)
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <input
                            id="primaryColor"
                            type="color"
                            value={formData.primaryColor}
                            onChange={(e) =>
                              updateFormData({ primaryColor: e.target.value })
                            }
                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={formData.primaryColor}
                            onChange={(e) =>
                              updateFormData({ primaryColor: e.target.value })
                            }
                            placeholder="#1E3A5F"
                            className="flex-1"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Main color for buttons and headers
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="secondaryColor">
                          Secondary Color (Gold)
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <input
                            id="secondaryColor"
                            type="color"
                            value={formData.secondaryColor}
                            onChange={(e) =>
                              updateFormData({ secondaryColor: e.target.value })
                            }
                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={formData.secondaryColor}
                            onChange={(e) =>
                              updateFormData({ secondaryColor: e.target.value })
                            }
                            placeholder="#9C8466"
                            className="flex-1"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Accent color for highlights and borders
                        </p>
                      </div>
                    </div>

                    {/* Overlay Settings */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-purple-900 mb-3">
                        Background Overlay (Filter)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="overlayColor">Overlay Color</Label>
                          <div className="flex gap-2 mt-1">
                            <input
                              id="overlayColor"
                              type="color"
                              value={formData.overlayColor}
                              onChange={(e) =>
                                updateFormData({ overlayColor: e.target.value })
                              }
                              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={formData.overlayColor}
                              onChange={(e) =>
                                updateFormData({ overlayColor: e.target.value })
                              }
                              placeholder="#000000"
                              className="flex-1"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Color of the overlay on top of background image
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="overlayOpacity">
                            Overlay Opacity ({formData.overlayOpacity}%)
                          </Label>
                          <Input
                            id="overlayOpacity"
                            type="range"
                            min="0"
                            max="100"
                            value={formData.overlayOpacity}
                            onChange={(e) =>
                              updateFormData({ overlayOpacity: e.target.value })
                            }
                            className="mt-1 w-full"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Adjust darkness/lightness of background (0% = no overlay, 100% = solid color)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="border-t pt-4">
                      <Label className="mb-2 block">Color Preview</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className="h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: formData.primaryColor }}
                        >
                          Primary Color
                        </div>
                        <div
                          className="h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: formData.secondaryColor }}
                        >
                          Secondary Color
                        </div>
                      </div>
                    </div>
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
                    {isEditMode ? 'Updating...' : 'Publishing...'}
                  </>
                ) : (
                  isEditMode ? 'Update Event' : 'Publish Event'
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
