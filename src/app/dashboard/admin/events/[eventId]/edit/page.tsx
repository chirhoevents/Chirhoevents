import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CreateEventClient from '../../new/CreateEventClient'

interface PageProps {
  params: {
    eventId: string
  }
}

export default async function EditEventPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId } = params

  // Fetch event with all related data
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
    include: {
      settings: true,
      pricing: true,
    },
  })

  if (!event) {
    notFound()
  }

  // Transform event data to match form data structure
  const formData = {
    // Step 1: Basic Information
    name: event.name,
    slug: event.slug,
    description: event.description || '',
    startDate: event.startDate.toISOString().split('T')[0],
    endDate: event.endDate.toISOString().split('T')[0],
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

    // Step 3: Features & Modules
    groupRegistrationEnabled: event.settings?.groupRegistrationEnabled ?? true,
    individualRegistrationEnabled: event.settings?.individualRegistrationEnabled ?? false,
    porosHousingEnabled: event.settings?.porosHousingEnabled || false,
    tshirtsEnabled: event.settings?.tshirtsEnabled || false,
    individualMealsEnabled: event.settings?.individualMealsEnabled || false,
    salveCheckinEnabled: event.settings?.salveCheckinEnabled || false,
    raphaMedicalEnabled: event.settings?.raphaMedicalEnabled || false,
    publicPortalEnabled: event.settings?.publicPortalEnabled || false,
    allowOnCampus: event.settings?.allowOnCampus ?? true,
    allowOffCampus: event.settings?.allowOffCampus ?? true,
    allowDayPass: event.settings?.allowDayPass ?? false,

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
    individualBasePrice: event.pricing?.individualBasePrice?.toString() || '100',
    singleRoomPrice: event.pricing?.singleRoomPrice?.toString() || '100',
    doubleRoomPrice: event.pricing?.doubleRoomPrice?.toString() || '50',
    tripleRoomPrice: event.pricing?.tripleRoomPrice?.toString() || '40',
    quadRoomPrice: event.pricing?.quadRoomPrice?.toString() || '30',
    individualOffCampusPrice: event.pricing?.individualOffCampusPrice?.toString() || '100',
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
    availabilityThreshold: event.settings?.availabilityThreshold?.toString() || '20',
    countdownLocation: event.settings?.countdownLocation || 'hero',
    countdownBeforeOpen: event.settings?.countdownBeforeOpen ?? true,
    countdownBeforeClose: event.settings?.countdownBeforeClose ?? true,
    enableWaitlist: event.enableWaitlist || false,
    waitlistCapacity: event.waitlistCapacity?.toString() || '',

    // Theme
    backgroundImageUrl: event.settings?.backgroundImageUrl || '',
    primaryColor: event.settings?.primaryColor || '#1E3A5F',
    secondaryColor: event.settings?.secondaryColor || '#9C8466',
    overlayColor: event.settings?.overlayColor || '#000000',
    overlayOpacity: event.settings?.overlayOpacity?.toString() || '40',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Edit Event</h1>
        <p className="text-[#6B7280]">Update your event details and settings</p>
      </div>
      <CreateEventClient
        organizationId={user.organizationId}
        eventId={eventId}
        initialData={formData}
        isEditMode={true}
      />
    </div>
  )
}
