import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getRegistrationStatus, getSpotsRemainingMessage } from '@/lib/registration-status'
import CountdownTimer from '@/components/CountdownTimer'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Users } from 'lucide-react'
import EventLandingClient from './EventLandingClient'

interface EventPageProps {
  params: Promise<{
    eventId: string
  }>
}

// Generate dynamic metadata for each event
export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { eventId } = await params
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

  const event = await prisma.event.findUnique({
    where: isUuid ? { id: eventId } : { slug: eventId },
    include: {
      organization: true,
      settings: true,
    },
  })

  // Fix #C1: Treat unpublished events and inactive-org events as not found, so
  // search engines and direct-link previews don't surface unfinished pages.
  // (isPublished, not status, is the public-visibility flag — status drives
  // registration availability and defaults to 'draft' on every new event.)
  if (!event || !event.isPublished || event.organization.status !== 'active') {
    return {
      title: 'Event Not Found',
    }
  }

  const [sy, sm, sd] = event.startDate.toISOString().split('T')[0].split('-').map(Number)
  const [ey, em, ed] = event.endDate.toISOString().split('T')[0].split('-').map(Number)
  const shortMonth = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
  const formattedDates = sy === ey && sm === em
    ? `${shortMonth(sm)} ${sd} - ${ed}, ${sy}`
    : sy === ey
      ? `${shortMonth(sm)} ${sd} - ${shortMonth(em)} ${ed}, ${sy}`
      : `${shortMonth(sm)} ${sd}, ${sy} - ${shortMonth(em)} ${ed}, ${ey}`

  const description = event.description
    ? `${event.description.slice(0, 150)}${event.description.length > 150 ? '...' : ''}`
    : `Register for ${event.name} by ${event.organization.name}. ${formattedDates}${event.locationName ? ` at ${event.locationName}` : ''}.`

  return {
    title: event.name,
    description,
    openGraph: {
      title: `${event.name} | ChiRho Events`,
      description,
      type: 'website',
      images: event.settings?.backgroundImageUrl
        ? [
            {
              url: event.settings.backgroundImageUrl,
              width: 1200,
              height: 630,
              alt: event.name,
            },
          ]
        : ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.name} | ChiRho Events`,
      description,
      images: event.settings?.backgroundImageUrl
        ? [event.settings.backgroundImageUrl]
        : ['/og-image.png'],
    },
  }
}

export default async function EventLandingPage({ params }: EventPageProps) {
  const { eventId } = await params

  // Check if eventId is a UUID (id) or a slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

  // Fetch event with all related data - try by id first, then by slug
  const event = await prisma.event.findUnique({
    where: isUuid ? { id: eventId } : { slug: eventId },
    include: {
      organization: true,
      settings: true,
      pricing: true,
    },
  })

  if (!event) {
    notFound()
  }

  // Fix #C1: 404 unpublished events and events owned by inactive orgs from the
  // public detail page. (isPublished is the visibility flag; the registration
  // status enum is independent — see registration-status.ts:62-64.)
  if (!event.isPublished || event.organization.status !== 'active') {
    notFound()
  }

  // Get registration status
  const status = getRegistrationStatus({
    status: event.status,
    closedMessage: event.settings?.registrationClosedMessage,
    startDate: event.startDate,
    endDate: event.endDate,
    registrationOpenDate: event.registrationOpenDate,
    registrationCloseDate: event.registrationCloseDate,
    capacityTotal: event.capacityTotal,
    capacityRemaining: event.capacityRemaining,
    enableWaitlist: event.enableWaitlist,
    settings: {
      countdownBeforeOpen: event.settings?.countdownBeforeOpen ?? true,
      countdownBeforeClose: event.settings?.countdownBeforeClose ?? true,
      waitlistEnabled: event.settings?.waitlistEnabled ?? event.enableWaitlist,
    },
  })

  const spotsMessage = getSpotsRemainingMessage(
    status.spotsRemaining,
    event.settings?.availabilityThreshold ?? 20
  )

  // Format dates — extract parts from ISO string to avoid UTC timezone offset
  const parseDateParts = (date: Date) => {
    const [y, m, d] = date.toISOString().split('T')[0].split('-').map(Number)
    return { y, m, d }
  }

  const monthName = (m: number, short = false) =>
    new Date(2000, m - 1, 1).toLocaleDateString('en-US', { month: short ? 'short' : 'long' })

  const formatDate = (date: Date) => {
    const { y, m, d } = parseDateParts(date)
    const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
    return `${weekday}, ${monthName(m)} ${d}, ${y}`
  }

  const formatDateRange = (start: Date, end: Date) => {
    const s = parseDateParts(start)
    const e = parseDateParts(end)

    const startISO = start.toISOString().split('T')[0]
    const endISO = end.toISOString().split('T')[0]

    if (startISO === endISO) {
      // Single day
      return `${monthName(s.m)} ${s.d}, ${s.y}`
    }
    if (s.m === e.m && s.y === e.y) {
      // Same month and year: "October 24 - 26, 2026"
      return `${monthName(s.m)} ${s.d} - ${e.d}, ${s.y}`
    }
    if (s.y === e.y) {
      // Different months, same year: "Feb 5 - Mar 7, 2027"
      return `${monthName(s.m, true)} ${s.d} - ${monthName(e.m, true)} ${e.d}, ${s.y}`
    }
    // Different years: "Dec 30, 2026 - Jan 2, 2027"
    return `${monthName(s.m, true)} ${s.d}, ${s.y} - ${monthName(e.m, true)} ${e.d}, ${e.y}`
  }

  // Build event start datetime target for "Event Starts In" countdown
  const eventStartTarget = (() => {
    const [y, m, d] = event.startDate.toISOString().split('T')[0].split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (event.startTime) {
      const [h, min] = event.startTime.split(':').map(Number)
      date.setHours(h, min, 0, 0)
    }
    return date
  })()
  const showEventCountdown =
    (event.settings?.showEventCountdown ?? false) && eventStartTarget > new Date()

  // Hero background styles
  const heroStyle: React.CSSProperties = event.settings?.backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(${parseInt(event.settings.overlayColor.slice(1, 3), 16)}, ${parseInt(event.settings.overlayColor.slice(3, 5), 16)}, ${parseInt(event.settings.overlayColor.slice(5, 7), 16)}, ${(event.settings.overlayOpacity || 40) / 100}), rgba(${parseInt(event.settings.overlayColor.slice(1, 3), 16)}, ${parseInt(event.settings.overlayColor.slice(3, 5), 16)}, ${parseInt(event.settings.overlayColor.slice(5, 7), 16)}, ${(event.settings.overlayOpacity || 40) / 100})), url(${event.settings.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: event.settings?.primaryColor
          ? `linear-gradient(to bottom right, ${event.settings.primaryColor}, ${event.settings.secondaryColor})`
          : 'linear-gradient(to bottom right, #1E3A5F, #2A4A6F)',
      }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero Section */}
      <section className="text-white py-10 md:py-16 lg:py-24" style={heroStyle}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-block bg-white/10 px-3 py-1.5 rounded-full mb-3">
              <span className="text-sm font-medium">
                {event.organization.name}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-base md:text-xl text-white/90 max-w-3xl mx-auto">
                {event.description}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3 bg-white/10 p-3 md:p-4 rounded-lg">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-[#9C8466] shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-white/70">Date</div>
                <div className="font-semibold text-sm md:text-base leading-tight">{formatDateRange(event.startDate, event.endDate)}</div>
              </div>
            </div>

            {event.locationName && (
              <div className="flex items-center gap-2 md:gap-3 bg-white/10 p-3 md:p-4 rounded-lg">
                <MapPin className="h-5 w-5 md:h-6 md:w-6 text-[#9C8466] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-white/70">Location</div>
                  <div className="font-semibold text-sm md:text-base leading-tight">{event.locationName}</div>
                </div>
              </div>
            )}

            {event.capacityTotal && (event.settings?.showCapacity !== false) && (
              <div className="flex items-center gap-2 md:gap-3 bg-white/10 p-3 md:p-4 rounded-lg col-span-2 md:col-span-1">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-[#9C8466] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-white/70">Capacity</div>
                  <div className="font-semibold text-sm md:text-base">{event.capacityTotal} attendees</div>
                </div>
              </div>
            )}
          </div>

          {/* Registration countdown in Hero (if enabled) */}
          {status.showCountdown &&
            status.countdownTarget &&
            event.settings?.countdownLocation === 'hero' && (
              <div className="bg-white/10 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-2xl mb-4">
                <CountdownTimer
                  targetDate={status.countdownTarget}
                  label={
                    status.status === 'not_yet_open'
                      ? 'Registration Opens In'
                      : 'Registration Closes In'
                  }
                  size="lg"
                />
              </div>
            )}

          {/* Event Starts In countdown (shown when registration is open or closed) */}
          {showEventCountdown &&
            status.status !== 'not_yet_open' &&
            event.settings?.countdownLocation === 'hero' && (
              <div className="bg-white/10 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-2xl">
                <CountdownTimer
                  targetDate={eventStartTarget}
                  label="Event Starts In"
                  size="lg"
                />
              </div>
            )}
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 md:py-12 max-w-6xl">
        {/* Registration Section */}
        <Card className="mb-6 md:mb-8 border-2 border-[#1E3A5F] bg-white">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <EventLandingClient
              eventId={event.id}
              eventName={event.name}
              status={status}
              settings={{
                groupRegistrationEnabled: event.settings?.groupRegistrationEnabled ?? true,
                individualRegistrationEnabled:
                  event.settings?.individualRegistrationEnabled ?? true,
                showAvailability: event.settings?.showAvailability ?? true,
                availabilityThreshold: event.settings?.availabilityThreshold ?? 20,
                countdownLocation: event.settings?.countdownLocation ?? 'hero',
                landingPageShowPrice: event.settings?.landingPageShowPrice ?? true,
              }}
              eventStartTarget={showEventCountdown ? eventStartTarget : null}
              pricing={
                event.pricing
                  ? {
                      earlyBirdDeadline: event.pricing.earlyBirdDeadline,
                    }
                  : null
              }
              spotsMessage={spotsMessage}
              earlyBirdMessage={
                event.pricing?.earlyBirdDeadline &&
                new Date() < event.pricing.earlyBirdDeadline
                  ? `🎉 Early Bird Pricing Available Until ${formatDate(
                      event.pricing.earlyBirdDeadline
                    )}`
                  : null
              }
            />
          </CardContent>
        </Card>

        {/* Content Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Schedule */}
          {event.settings?.landingPageShowSchedule && event.settings?.scheduleContent && (
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">Schedule</h3>
                <div className="text-[#6B7280] whitespace-pre-line">
                  {event.settings.scheduleContent}
                </div>
              </CardContent>
            </Card>
          )}

          {/* What's Included */}
          {event.settings?.landingPageShowIncluded && event.settings?.includedContent && (
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">What&apos;s Included</h3>
                <div className="text-[#6B7280] whitespace-pre-line">
                  {event.settings.includedContent}
                </div>
              </CardContent>
            </Card>
          )}

          {/* What to Bring */}
          {event.settings?.landingPageShowBring && event.settings?.bringContent && (
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">What to Bring</h3>
                <div className="text-[#6B7280] whitespace-pre-line">
                  {event.settings.bringContent}
                </div>
              </CardContent>
            </Card>
          )}

          {/* FAQ */}
          {event.settings?.landingPageShowFaq && event.settings?.faqContent && (
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">FAQ</h3>
                <div className="text-[#6B7280] whitespace-pre-line">
                  {event.settings.faqContent}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact Section */}
        {event.settings?.landingPageShowContact && (
          <Card className="bg-white border-[#D1D5DB]">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">
                Questions?
              </h3>
              {event.settings?.contactInfo ? (
                <div className="text-[#6B7280] whitespace-pre-line">
                  {event.settings.contactInfo}
                </div>
              ) : event.settings?.contactEmail ? (
                <>
                  <p className="text-[#6B7280] mb-2">
                    Contact {event.settings.contactName || event.organization.name} for more information:
                  </p>
                  <p className="text-[#1E3A5F] font-medium">
                    {event.settings.contactEmail}
                  </p>
                  {event.settings.contactPhone && (
                    <p className="text-[#1E3A5F] font-medium">
                      {event.settings.contactPhone}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[#6B7280] mb-2">
                    Contact {event.organization.name} for more information:
                  </p>
                  <p className="text-[#1E3A5F] font-medium">
                    {event.organization.contactEmail}
                  </p>
                  {event.organization.contactPhone && (
                    <p className="text-[#1E3A5F] font-medium">
                      {event.organization.contactPhone}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Staff & Vendor Registration Links - Only show when enabled */}
        {(event.settings?.staffRegistrationEnabled || event.settings?.vendorRegistrationEnabled) && (
          <div className="mt-8 text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-sm text-[#6B7280]">
              {event.settings?.staffRegistrationEnabled && (
                <a
                  href={`/events/${event.slug || event.id}/register-staff`}
                  className="hover:text-[#1E3A5F] hover:underline transition-colors"
                >
                  Register as staff
                </a>
              )}
              {event.settings?.staffRegistrationEnabled && event.settings?.vendorRegistrationEnabled && (
                <span className="text-[#D1D5DB]">|</span>
              )}
              {event.settings?.vendorRegistrationEnabled && (
                <a
                  href={`/events/${event.slug || event.id}/register-vendor`}
                  className="hover:text-[#1E3A5F] hover:underline transition-colors"
                >
                  Register vendor booth
                </a>
              )}
            </div>
          </div>
        )}

        {/* Powered by ChiRho Events */}
        <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-center">
          <a
            href="https://chirhoevents.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            Powered by ChiRho Events
          </a>
        </div>
      </div>
    </div>
  )
}
