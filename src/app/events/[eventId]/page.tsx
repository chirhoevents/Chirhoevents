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

  if (!event) {
    return {
      title: 'Event Not Found',
    }
  }

  const formattedDates = `${event.startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${event.endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`

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

  // Format dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const formatDateRange = (start: Date, end: Date) => {
    const isSameMonth = start.getMonth() === end.getMonth()
    const isSameYear = start.getFullYear() === end.getFullYear()

    if (isSameMonth && isSameYear) {
      return `${start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })} - ${end.toLocaleDateString('en-US', {
        day: 'numeric',
        year: 'numeric',
      })}`
    }

    return `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

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
      <section className="text-white py-16 md:py-24" style={heroStyle}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8">
            <div className="inline-block bg-white/10 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium">
                {event.organization.name}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
                {event.description}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center justify-center md:justify-start gap-3 bg-white/10 p-4 rounded-lg">
              <Calendar className="h-6 w-6 text-[#9C8466]" />
              <div>
                <div className="text-sm text-white/70">Date</div>
                <div className="font-semibold">{formatDateRange(event.startDate, event.endDate)}</div>
              </div>
            </div>

            {event.locationName && (
              <div className="flex items-center justify-center md:justify-start gap-3 bg-white/10 p-4 rounded-lg">
                <MapPin className="h-6 w-6 text-[#9C8466]" />
                <div>
                  <div className="text-sm text-white/70">Location</div>
                  <div className="font-semibold">{event.locationName}</div>
                </div>
              </div>
            )}

            {event.capacityTotal && (event.settings?.showCapacity !== false) && (
              <div className="flex items-center justify-center md:justify-start gap-3 bg-white/10 p-4 rounded-lg">
                <Users className="h-6 w-6 text-[#9C8466]" />
                <div>
                  <div className="text-sm text-white/70">Capacity</div>
                  <div className="font-semibold">{event.capacityTotal} attendees</div>
                </div>
              </div>
            )}
          </div>

          {/* Countdown in Hero (if enabled) */}
          {status.showCountdown &&
            status.countdownTarget &&
            event.settings?.countdownLocation === 'hero' && (
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl">
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
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Registration Section */}
        <Card className="mb-8 border-2 border-[#1E3A5F] bg-white">
          <CardContent className="p-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
