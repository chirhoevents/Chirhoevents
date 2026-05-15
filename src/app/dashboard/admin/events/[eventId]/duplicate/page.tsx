'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useAdminContext } from '@/contexts/AdminContext'
import CreateEventClient from '../../new/CreateEventClient'
import { Loader2 } from 'lucide-react'

function shiftDateStr(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  d.setFullYear(d.getFullYear() + 1)
  // Return YYYY-MM-DD for date inputs
  return d.toISOString().split('T')[0]
}

function shiftDateTimeStr(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  d.setFullYear(d.getFullYear() + 1)
  // Return YYYY-MM-DD for datetime-local inputs (strip time portion)
  return d.toISOString().split('T')[0]
}

function decimalToStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

export default function DuplicateEventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { organizationId } = useAdminContext()
  const { getToken } = useAuth()
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return

    const fetchSource = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/admin/events/${eventId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!res.ok) throw new Error('Failed to load source event')

        const { event } = await res.json()
        const s = event.settings
        const p = event.pricing

        // Transform the DB record into the EventFormData shape expected by
        // CreateEventClient, shifting all dates forward by one year.
        const data: Record<string, unknown> = {
          // ── Basic info ───────────────────────────────────────────────────
          name: event.name,
          slug: event.slug,
          description: event.description ?? '',
          startDate: shiftDateStr(event.startDate),
          endDate: shiftDateStr(event.endDate),
          startTime: event.startTime ?? '',
          endTime: event.endTime ?? '',
          locationName: event.locationName ?? '',
          locationAddress:
            typeof event.locationAddress === 'object' && event.locationAddress
              ? (event.locationAddress as Record<string, string>).formatted ?? ''
              : String(event.locationAddress ?? ''),
          timezone: event.timezone ?? 'America/New_York',
          capacityTotal: String(event.capacityTotal ?? '1000'),

          // ── Registration settings ─────────────────────────────────────────
          registrationOpenDate: shiftDateTimeStr(event.registrationOpenDate),
          registrationCloseDate: shiftDateTimeStr(event.registrationCloseDate),
          earlyBirdDeadline: p ? shiftDateTimeStr(p.earlyBirdDeadline) : '',
          regularDeadline: p ? shiftDateTimeStr(p.regularDeadline) : '',
          fullPaymentDeadline: p ? shiftDateTimeStr(p.fullPaymentDeadline) : '',
          lateFeePercentage: p ? decimalToStr(p.lateFeePercentage) : '',
          lateFeeAutoApply: p?.lateFeeAutoApply ?? false,
          allowLoginWhenClosed: s?.allowLoginWhenClosed ?? true,

          // ── Pricing ───────────────────────────────────────────────────────
          youthEarlyBirdPrice: p ? decimalToStr(p.youthEarlyBirdPrice) : '',
          youthRegularPrice: p ? decimalToStr(p.youthRegularPrice) : '100',
          youthLatePrice: p ? decimalToStr(p.youthLatePrice) : '',
          chaperoneEarlyBirdPrice: p ? decimalToStr(p.chaperoneEarlyBirdPrice) : '',
          chaperoneRegularPrice: p ? decimalToStr(p.chaperoneRegularPrice) : '75',
          chaperoneLatePrice: p ? decimalToStr(p.chaperoneLatePrice) : '',
          priestPrice: p ? decimalToStr(p.priestPrice) : '0',
          onCampusYouthPrice: p ? decimalToStr(p.onCampusYouthPrice) : '',
          offCampusYouthPrice: p ? decimalToStr(p.offCampusYouthPrice) : '',
          dayPassYouthPrice: p ? decimalToStr(p.dayPassYouthPrice) : '',
          onCampusChaperonePrice: p ? decimalToStr(p.onCampusChaperonePrice) : '',
          offCampusChaperonePrice: p ? decimalToStr(p.offCampusChaperonePrice) : '',
          dayPassChaperonePrice: p ? decimalToStr(p.dayPassChaperonePrice) : '',
          depositType: p
            ? p.requireFullPayment
              ? 'full'
              : p.depositPercentage
              ? 'percentage'
              : p.depositAmount
              ? 'fixed'
              : 'none'
            : 'percentage',
          depositPercentage: p ? decimalToStr(p.depositPercentage) : '25',
          depositAmount: p ? decimalToStr(p.depositAmount) : '',

          // Individual pricing
          individualEarlyBirdPrice: p ? decimalToStr(p.individualEarlyBirdPrice) : '',
          individualBasePrice: p ? decimalToStr(p.individualBasePrice) : '',
          individualLatePrice: p ? decimalToStr(p.individualLatePrice) : '',
          singleRoomPrice: p ? decimalToStr(p.singleRoomPrice) : '',
          doubleRoomPrice: p ? decimalToStr(p.doubleRoomPrice) : '',
          tripleRoomPrice: p ? decimalToStr(p.tripleRoomPrice) : '',
          quadRoomPrice: p ? decimalToStr(p.quadRoomPrice) : '',
          individualOffCampusPrice: p ? decimalToStr(p.individualOffCampusPrice) : '',
          individualDayPassPrice: p ? decimalToStr((p as Record<string, unknown>).individualDayPassPrice) : '',
          individualMealPackagePrice: p ? decimalToStr(p.individualMealPackagePrice) : '',

          // ── Features / modules ────────────────────────────────────────────
          groupRegistrationEnabled: s?.groupRegistrationEnabled ?? true,
          individualRegistrationEnabled: s?.individualRegistrationEnabled ?? true,
          liabilityFormsRequiredIndividual: s?.liabilityFormsRequiredIndividual ?? false,
          porosHousingEnabled: s?.porosHousingEnabled ?? false,
          tshirtsEnabled: s?.tshirtsEnabled ?? false,
          individualMealsEnabled: s?.individualMealsEnabled ?? false,
          salveCheckinEnabled: s?.salveCheckinEnabled ?? false,
          raphaMedicalEnabled: s?.raphaMedicalEnabled ?? false,
          publicPortalEnabled: s?.publicPortalEnabled ?? false,
          allowOnCampus: s?.allowOnCampus ?? true,
          allowOffCampus: s?.allowOffCampus ?? true,
          allowDayPass: s?.allowDayPass ?? true,
          allowIndividualDayPass: s?.allowIndividualDayPass ?? false,
          allowSingleRoom: s?.allowSingleRoom ?? true,
          allowDoubleRoom: s?.allowDoubleRoom ?? true,
          allowTripleRoom: s?.allowTripleRoom ?? true,
          allowQuadRoom: s?.allowQuadRoom ?? true,
          singleRoomLabel: s?.singleRoomLabel ?? '',
          doubleRoomLabel: s?.doubleRoomLabel ?? '',
          tripleRoomLabel: s?.tripleRoomLabel ?? '',
          quadRoomLabel: s?.quadRoomLabel ?? '',
          onCampusCapacity: String(s?.onCampusCapacity ?? ''),
          offCampusCapacity: String(s?.offCampusCapacity ?? ''),
          dayPassCapacity: String(s?.dayPassCapacity ?? ''),
          singleRoomCapacity: String(s?.singleRoomCapacity ?? ''),
          doubleRoomCapacity: String(s?.doubleRoomCapacity ?? ''),
          tripleRoomCapacity: String(s?.tripleRoomCapacity ?? ''),
          quadRoomCapacity: String(s?.quadRoomCapacity ?? ''),

          // Add-ons
          addOn1Enabled: s?.addOn1Enabled ?? false,
          addOn1Title: s?.addOn1Title ?? '',
          addOn1Description: s?.addOn1Description ?? '',
          addOn1Price: decimalToStr(s?.addOn1Price),
          addOn2Enabled: s?.addOn2Enabled ?? false,
          addOn2Title: s?.addOn2Title ?? '',
          addOn2Description: s?.addOn2Description ?? '',
          addOn2Price: decimalToStr(s?.addOn2Price),
          addOn3Enabled: s?.addOn3Enabled ?? false,
          addOn3Title: s?.addOn3Title ?? '',
          addOn3Description: s?.addOn3Description ?? '',
          addOn3Price: decimalToStr(s?.addOn3Price),
          addOn4Enabled: s?.addOn4Enabled ?? false,
          addOn4Title: s?.addOn4Title ?? '',
          addOn4Description: s?.addOn4Description ?? '',
          addOn4Price: decimalToStr(s?.addOn4Price),

          // ── Contact & instructions ────────────────────────────────────────
          contactName: s?.contactName ?? '',
          contactEmail: s?.contactEmail ?? '',
          contactPhone: s?.contactPhone ?? '',
          registrationInstructions: s?.registrationInstructions ?? '',
          confirmationEmailMessage: s?.confirmationEmailMessage ?? '',
          checkPaymentEnabled: s?.checkPaymentEnabled ?? true,
          checkPaymentPayableTo: s?.checkPaymentPayableTo ?? '',
          checkPaymentAddress: s?.checkPaymentAddress ?? '',

          // ── Landing page ──────────────────────────────────────────────────
          landingPageShowPrice: s?.landingPageShowPrice ?? true,
          landingPageShowSchedule: s?.landingPageShowSchedule ?? true,
          landingPageShowFaq: s?.landingPageShowFaq ?? true,
          landingPageShowIncluded: s?.landingPageShowIncluded ?? true,
          landingPageShowBring: s?.landingPageShowBring ?? true,
          landingPageShowContact: s?.landingPageShowContact ?? true,
          showAvailability: s?.showAvailability ?? true,
          showCapacity: s?.showCapacity ?? true,
          availabilityThreshold: String(s?.availabilityThreshold ?? 20),
          countdownLocation: s?.countdownLocation ?? 'hero',
          countdownBeforeOpen: s?.countdownBeforeOpen ?? true,
          countdownBeforeClose: s?.countdownBeforeClose ?? true,
          showEventCountdown: s?.showEventCountdown ?? false,
          enableWaitlist: event.enableWaitlist ?? false,
          waitlistCapacity: String(event.waitlistCapacity ?? ''),
          faqContent: s?.faqContent ?? '',
          scheduleContent: s?.scheduleContent ?? '',
          includedContent: s?.includedContent ?? '',
          bringContent: s?.bringContent ?? '',
          contactInfo: s?.contactInfo ?? '',
          showFaqInEmail: s?.showFaqInEmail ?? false,
          showBringInEmail: s?.showBringInEmail ?? false,
          showScheduleInEmail: s?.showScheduleInEmail ?? false,
          showIncludedInEmail: s?.showIncludedInEmail ?? false,
          showContactInEmail: s?.showContactInEmail ?? true,

          // ── Theme ─────────────────────────────────────────────────────────
          backgroundImageUrl: s?.backgroundImageUrl ?? '',
          primaryColor: s?.primaryColor ?? '#1E3A5F',
          secondaryColor: s?.secondaryColor ?? '#9C8466',
          overlayColor: s?.overlayColor ?? '#000000',
          overlayOpacity: String(s?.overlayOpacity ?? 40),

          // ── Staff / vendor / coupons ──────────────────────────────────────
          staffRegistrationEnabled: s?.staffRegistrationEnabled ?? false,
          staffVolunteerPrice: decimalToStr(s?.staffVolunteerPrice),
          vendorStaffPrice: decimalToStr(s?.vendorStaffPrice),
          staffRoles: Array.isArray(s?.staffRoles) ? s.staffRoles : [],
          vendorRegistrationEnabled: s?.vendorRegistrationEnabled ?? false,
          vendorTiers: Array.isArray(s?.vendorTiers) ? s.vendorTiers : [],
          couponsEnabled: s?.couponsEnabled ?? false,

          // Day pass options: shift dates, reset remaining
          dayPassOptions: Array.isArray(event.dayPassOptions)
            ? event.dayPassOptions.map((opt: Record<string, unknown>) => ({
                id: String(opt.id),
                date: shiftDateStr(opt.date as string),
                name: String(opt.name ?? 'Day Pass'),
                capacity: String(opt.capacity ?? '0'),
                price: decimalToStr(opt.price),
                youthPrice: decimalToStr(opt.youthPrice),
                chaperonePrice: decimalToStr(opt.chaperonePrice),
                isActive: Boolean(opt.isActive ?? true),
              }))
            : [],
        }

        setInitialData(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load source event. Please go back and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchSource()
  }, [eventId, getToken])

  if (loading || !organizationId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <CreateEventClient
      organizationId={organizationId}
      initialData={initialData ?? undefined}
      sourceEventId={eventId}
    />
  )
}
