'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import CreateEventClient from '../../new/CreateEventClient'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface FormData {
  name: string
  slug: string
  description: string
  startDate: string
  endDate: string
  locationName: string
  locationAddress: string
  timezone: string
  capacityTotal: string
  registrationOpenDate: string
  registrationCloseDate: string
  earlyBirdDeadline: string
  regularDeadline: string
  fullPaymentDeadline: string
  lateFeePercentage: string
  lateFeeAutoApply: boolean
  allowLoginWhenClosed: boolean
  groupRegistrationEnabled: boolean
  individualRegistrationEnabled: boolean
  liabilityFormsRequiredIndividual: boolean
  porosHousingEnabled: boolean
  tshirtsEnabled: boolean
  individualMealsEnabled: boolean
  salveCheckinEnabled: boolean
  raphaMedicalEnabled: boolean
  publicPortalEnabled: boolean
  staffRegistrationEnabled: boolean
  vendorRegistrationEnabled: boolean
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
  depositType: 'fixed' | 'percentage' | 'full' | 'none'
  depositPercentage: string
  depositAmount: string
  contactEmail: string
  contactPhone: string
  registrationInstructions: string
  confirmationEmailMessage: string
  checkPaymentEnabled: boolean
  checkPaymentPayableTo: string
  checkPaymentAddress: string
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
  // Landing page content
  faqContent: string
  scheduleContent: string
  includedContent: string
  bringContent: string
  contactInfo: string
  // Email options
  showFaqInEmail: boolean
  showBringInEmail: boolean
  showScheduleInEmail: boolean
  showIncludedInEmail: boolean
  showContactInEmail: boolean
  backgroundImageUrl: string
  primaryColor: string
  secondaryColor: string
  overlayColor: string
  overlayOpacity: string
}

// NOTE: Auth is handled by the layout with proper retry logic.
// Server Components using requireAdmin() cause redirect loops in production
// because Clerk's auth() can fail during initial session hydration.
export default function EditEventPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const { getToken } = useAuth()
  const [formData, setFormData] = useState<FormData | null>(null)
  const [organizationId, setOrganizationId] = useState<string>('')
  const [hasRegistrations, setHasRegistrations] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Validate eventId is a valid UUID
    if (!eventId || !UUID_REGEX.test(eventId)) {
      setError('Invalid event ID')
      setLoading(false)
      return
    }
    fetchEventData()
  }, [eventId])

  const fetchEventData = async () => {
    try {
      const token = await getToken()

      // Fetch event data
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (response.status === 404) {
        setError('Event not found')
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }

      const data = await response.json()
      const event = data.event
      const stats = data.stats

      // Check if event has registrations (to lock registration type)
      if (stats && stats.totalRegistrations > 0) {
        setHasRegistrations(true)
      }

      // Also fetch org info for organizationId
      const accessResponse = await fetch('/api/admin/check-access', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (accessResponse.ok) {
        const accessData = await accessResponse.json()
        setOrganizationId(accessData.organizationId)
      }

      // Transform event data to match form data structure
      const transformed: FormData = {
        // Step 1: Basic Information
        name: event.name,
        slug: event.slug,
        description: event.description || '',
        startDate: event.startDate ? event.startDate.split('T')[0] : '',
        endDate: event.endDate ? event.endDate.split('T')[0] : '',
        locationName: event.locationName || '',
        locationAddress: typeof event.locationAddress === 'string'
          ? event.locationAddress
          : event.locationAddress
            ? JSON.stringify(event.locationAddress)
            : '',
        timezone: event.timezone || 'America/New_York',
        capacityTotal: event.capacityTotal?.toString() || '1000',

        // Step 2: Registration Settings
        registrationOpenDate: event.registrationOpenDate
          ? new Date(event.registrationOpenDate).toISOString().slice(0, 16)
          : '',
        registrationCloseDate: event.registrationCloseDate
          ? new Date(event.registrationCloseDate).toISOString().slice(0, 16)
          : '',
        earlyBirdDeadline: event.pricing?.earlyBirdDeadline
          ? new Date(event.pricing.earlyBirdDeadline).toISOString().slice(0, 16)
          : '',
        regularDeadline: event.pricing?.regularDeadline
          ? new Date(event.pricing.regularDeadline).toISOString().slice(0, 16)
          : '',
        fullPaymentDeadline: event.pricing?.fullPaymentDeadline
          ? new Date(event.pricing.fullPaymentDeadline).toISOString().slice(0, 16)
          : '',
        lateFeePercentage: event.pricing?.lateFeePercentage?.toString() || '20',
        lateFeeAutoApply: event.pricing?.lateFeeAutoApply || false,
        allowLoginWhenClosed: event.settings?.allowLoginWhenClosed ?? true,

        // Step 3: Features & Modules
        groupRegistrationEnabled: event.settings?.groupRegistrationEnabled ?? true,
        individualRegistrationEnabled: event.settings?.individualRegistrationEnabled ?? false,
        liabilityFormsRequiredIndividual: event.settings?.liabilityFormsRequiredIndividual ?? false,
        porosHousingEnabled: event.settings?.porosHousingEnabled || false,
        tshirtsEnabled: event.settings?.tshirtsEnabled || false,
        individualMealsEnabled: event.settings?.individualMealsEnabled || false,
        salveCheckinEnabled: event.settings?.salveCheckinEnabled || false,
        raphaMedicalEnabled: event.settings?.raphaMedicalEnabled || false,
        publicPortalEnabled: event.settings?.publicPortalEnabled || false,
        staffRegistrationEnabled: event.settings?.staffRegistrationEnabled || false,
        vendorRegistrationEnabled: event.settings?.vendorRegistrationEnabled || false,
        allowOnCampus: event.settings?.allowOnCampus ?? true,
        allowOffCampus: event.settings?.allowOffCampus ?? true,
        allowDayPass: event.settings?.allowDayPass ?? false,
        allowIndividualDayPass: event.settings?.allowIndividualDayPass ?? false,
        allowSingleRoom: event.settings?.allowSingleRoom ?? true,
        allowDoubleRoom: event.settings?.allowDoubleRoom ?? true,
        allowTripleRoom: event.settings?.allowTripleRoom ?? true,
        allowQuadRoom: event.settings?.allowQuadRoom ?? true,
        singleRoomLabel: event.settings?.singleRoomLabel || '',
        doubleRoomLabel: event.settings?.doubleRoomLabel || '',
        tripleRoomLabel: event.settings?.tripleRoomLabel || '',
        quadRoomLabel: event.settings?.quadRoomLabel || '',
        // Add-ons
        addOn1Enabled: event.settings?.addOn1Enabled ?? false,
        addOn1Title: event.settings?.addOn1Title || '',
        addOn1Description: event.settings?.addOn1Description || '',
        addOn1Price: event.settings?.addOn1Price?.toString() || '',
        addOn2Enabled: event.settings?.addOn2Enabled ?? false,
        addOn2Title: event.settings?.addOn2Title || '',
        addOn2Description: event.settings?.addOn2Description || '',
        addOn2Price: event.settings?.addOn2Price?.toString() || '',
        addOn3Enabled: event.settings?.addOn3Enabled ?? false,
        addOn3Title: event.settings?.addOn3Title || '',
        addOn3Description: event.settings?.addOn3Description || '',
        addOn3Price: event.settings?.addOn3Price?.toString() || '',
        addOn4Enabled: event.settings?.addOn4Enabled ?? false,
        addOn4Title: event.settings?.addOn4Title || '',
        addOn4Description: event.settings?.addOn4Description || '',
        addOn4Price: event.settings?.addOn4Price?.toString() || '',

        // Step 4: Pricing
        youthEarlyBirdPrice: event.pricing?.youthEarlyBirdPrice?.toString() || '90',
        youthRegularPrice: event.pricing?.youthRegularPrice?.toString() || '100',
        youthLatePrice: event.pricing?.youthLatePrice?.toString() || '',
        chaperoneEarlyBirdPrice: event.pricing?.chaperoneEarlyBirdPrice?.toString() || '65',
        chaperoneRegularPrice: event.pricing?.chaperoneRegularPrice?.toString() || '75',
        chaperoneLatePrice: event.pricing?.chaperoneLatePrice?.toString() || '',
        priestPrice: event.pricing?.priestPrice?.toString() || '0',
        onCampusYouthPrice: event.pricing?.onCampusYouthPrice?.toString() || '',
        offCampusYouthPrice: event.pricing?.offCampusYouthPrice?.toString() || '75',
        dayPassYouthPrice: event.pricing?.dayPassYouthPrice?.toString() || '50',
        onCampusChaperonePrice: event.pricing?.onCampusChaperonePrice?.toString() || '',
        offCampusChaperonePrice: event.pricing?.offCampusChaperonePrice?.toString() || '50',
        dayPassChaperonePrice: event.pricing?.dayPassChaperonePrice?.toString() || '25',

        // Individual pricing
        individualEarlyBirdPrice: event.pricing?.individualEarlyBirdPrice?.toString() || '',
        individualBasePrice: event.pricing?.individualBasePrice?.toString() || '100',
        individualLatePrice: event.pricing?.individualLatePrice?.toString() || '',
        singleRoomPrice: event.pricing?.singleRoomPrice?.toString() || '100',
        doubleRoomPrice: event.pricing?.doubleRoomPrice?.toString() || '50',
        tripleRoomPrice: event.pricing?.tripleRoomPrice?.toString() || '40',
        quadRoomPrice: event.pricing?.quadRoomPrice?.toString() || '30',
        individualOffCampusPrice: event.pricing?.individualOffCampusPrice?.toString() || '100',
        individualDayPassPrice: event.pricing?.individualDayPassPrice?.toString() || '50',
        individualMealPackagePrice: event.pricing?.individualMealPackagePrice?.toString() || '50',

        // Deposit settings
        depositType: (event.pricing?.requireFullPayment
          ? 'full'
          : event.pricing?.depositPercentage
          ? 'percentage'
          : event.pricing?.depositAmount
          ? 'fixed'
          : 'none') as 'fixed' | 'percentage' | 'full' | 'none',
        depositPercentage: event.pricing?.depositPercentage?.toString() || '25',
        depositAmount: event.pricing?.depositAmount?.toString() || '500',

        // Step 5: Contact & Instructions
        contactEmail: event.settings?.registrationInstructions || '',
        contactPhone: '',
        registrationInstructions: event.settings?.registrationInstructions || '',
        confirmationEmailMessage: event.settings?.confirmationEmailMessage || '',
        checkPaymentEnabled: event.settings?.checkPaymentEnabled ?? true,
        checkPaymentPayableTo: event.settings?.checkPaymentPayableTo || '',
        checkPaymentAddress: event.settings?.checkPaymentAddress || '',

        // Step 6: Landing Page
        landingPageShowPrice: event.settings?.landingPageShowPrice ?? true,
        landingPageShowSchedule: event.settings?.landingPageShowSchedule ?? true,
        landingPageShowFaq: event.settings?.landingPageShowFaq ?? true,
        landingPageShowIncluded: event.settings?.landingPageShowIncluded ?? true,
        landingPageShowBring: event.settings?.landingPageShowBring ?? true,
        landingPageShowContact: event.settings?.landingPageShowContact ?? true,
        showAvailability: event.settings?.showAvailability ?? true,
        showCapacity: event.settings?.showCapacity ?? true,
        availabilityThreshold: event.settings?.availabilityThreshold?.toString() || '20',
        countdownLocation: (event.settings?.countdownLocation || 'hero') as 'hero' | 'sticky' | 'registration',
        countdownBeforeOpen: event.settings?.countdownBeforeOpen ?? true,
        countdownBeforeClose: event.settings?.countdownBeforeClose ?? true,
        enableWaitlist: event.enableWaitlist || false,
        waitlistCapacity: event.waitlistCapacity?.toString() || '',

        // Landing page content
        faqContent: event.settings?.faqContent || '',
        scheduleContent: event.settings?.scheduleContent || '',
        includedContent: event.settings?.includedContent || '',
        bringContent: event.settings?.bringContent || '',
        contactInfo: event.settings?.contactInfo || '',

        // Email options
        showFaqInEmail: event.settings?.showFaqInEmail ?? false,
        showBringInEmail: event.settings?.showBringInEmail ?? false,
        showScheduleInEmail: event.settings?.showScheduleInEmail ?? false,
        showIncludedInEmail: event.settings?.showIncludedInEmail ?? false,
        showContactInEmail: event.settings?.showContactInEmail ?? true,

        // Theme
        backgroundImageUrl: event.settings?.backgroundImageUrl || '',
        primaryColor: event.settings?.primaryColor || '#1E3A5F',
        secondaryColor: event.settings?.secondaryColor || '#9C8466',
        overlayColor: event.settings?.overlayColor || '#000000',
        overlayOpacity: event.settings?.overlayOpacity?.toString() || '40',
      }

      setFormData(transformed)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error === 'Event not found' || error === 'Invalid event ID') {
    notFound()
  }

  if (error || !formData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || 'Failed to load event'}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchEventData(); }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Edit Event</h1>
        <p className="text-[#6B7280]">Update your event details and settings</p>
      </div>
      <CreateEventClient
        organizationId={organizationId}
        eventId={eventId}
        initialData={formData}
        isEditMode={true}
        hasRegistrations={hasRegistrations}
      />
    </div>
  )
}
