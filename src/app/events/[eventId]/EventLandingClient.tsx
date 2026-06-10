'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import WaitlistModal from '@/components/WaitlistModal'
import Link from 'next/link'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import CountdownTimer from '@/components/CountdownTimer'
import type { RegistrationStatusResult } from '@/lib/registration-status'

interface EventLandingClientProps {
  eventId: string
  eventName: string
  status: RegistrationStatusResult
  settings: {
    groupRegistrationEnabled: boolean
    individualRegistrationEnabled: boolean
    showAvailability: boolean
    availabilityThreshold: number
    countdownLocation: string
    landingPageShowPrice: boolean
  }
  pricing: {
    earlyBirdDeadline: Date | null
  } | null
  spotsMessage: string | null
  earlyBirdMessage: string | null
  eventStartTarget: Date | null
  organizationContact?: {
    name: string
    email: string | null
    phone: string | null
  } | null
}

export default function EventLandingClient({
  eventId,
  eventName,
  status,
  settings,
  pricing,
  spotsMessage,
  earlyBirdMessage,
  eventStartTarget,
  organizationContact,
}: EventLandingClientProps) {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col items-center text-center">
        {/* Status Icon */}
        <div className="mb-3">
          {status.allowRegistration ? (
            <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-600" />
          ) : status.allowWaitlist ? (
            <Clock className="h-12 w-12 md:h-16 md:w-16 text-[#9C8466]" />
          ) : (
            <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-gray-400" />
          )}
        </div>

        {/* Status Message */}
        <h2
          className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 ${
            status.urgentStyle ? 'text-orange-600' : 'text-[#1E3A5F]'
          }`}
        >
          {status.message}
        </h2>

        {/* Spots Remaining */}
        {settings.showAvailability &&
          spotsMessage &&
          status.spotsRemaining !== null &&
          status.spotsRemaining > 0 && (
            <p
              className={`text-lg mb-6 ${
                status.spotsRemaining <= settings.availabilityThreshold
                  ? 'text-orange-600 font-semibold'
                  : 'text-[#6B7280]'
              }`}
            >
              {spotsMessage}
            </p>
          )}

        {/* Registration countdown in Registration Section */}
        {status.showCountdown &&
          status.countdownTarget &&
          settings.countdownLocation === 'registration' && (
            <div className="w-full mb-4">
              <CountdownTimer
                targetDate={status.countdownTarget}
                label={
                  status.status === 'not_yet_open'
                    ? 'Registration Opens In'
                    : 'Registration Closes In'
                }
                size="md"
              />
            </div>
          )}

        {/* Event Starts In countdown in Registration Section */}
        {eventStartTarget &&
          status.status !== 'not_yet_open' &&
          settings.countdownLocation === 'registration' && (
            <div className="w-full mb-6">
              <CountdownTimer
                targetDate={eventStartTarget}
                label="Event Starts In"
                size="md"
              />
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {status.allowRegistration && (
            <>
              {settings.groupRegistrationEnabled && (
                <Link href={`/events/${eventId}/register-group`}>
                  <Button
                    size="lg"
                    className={`w-full sm:w-auto ${
                      status.urgentStyle
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-[#1E3A5F] hover:bg-[#2A4A6F]'
                    } text-white px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg`}
                  >
                    Register as Group
                  </Button>
                </Link>
              )}
              {settings.individualRegistrationEnabled && (
                <Link href={`/events/${eventId}/register-individual`}>
                  <Button
                    size="lg"
                    className={`w-full sm:w-auto ${
                      status.urgentStyle
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-[#1E3A5F] hover:bg-[#2A4A6F]'
                    } text-white px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg`}
                  >
                    Register as Individual
                  </Button>
                </Link>
              )}
            </>
          )}

          {status.allowWaitlist && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsWaitlistModalOpen(true)}
              className="w-full sm:w-auto border-2 border-[#9C8466] text-[#9C8466] hover:bg-[#9C8466] hover:text-white px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg"
            >
              Join Waitlist
            </Button>
          )}

          {!status.allowRegistration && !status.allowWaitlist && (
            <Button
              size="lg"
              disabled
              className="w-full sm:w-auto px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg"
            >
              {status.status === 'not_yet_open'
                ? 'Registration Not Yet Open'
                : status.status === 'event_ended'
                ? 'Event Has Ended'
                : 'Registration Closed'}
            </Button>
          )}
        </div>

        {/* At-capacity helper: explain how to request additional spots when the
            event is full. Covers groups that need more than what's currently
            available and already-registered groups wanting to add people. */}
        {status.status === 'at_capacity' && organizationContact && (organizationContact.email || organizationContact.phone) && (
          <div className="mt-4 p-4 bg-[#F5F1E8] border border-[#9C8466] rounded-lg w-full text-left">
            <p className="text-sm font-semibold text-[#1E3A5F] mb-1">
              Need additional spots for your group?
            </p>
            <p className="text-sm text-[#6B7280] mb-2">
              If you&apos;re already registered or want more than what&apos;s available,
              contact {organizationContact.name} to request additional spots. Otherwise,
              join the waitlist above and you&apos;ll be notified by email as soon as a spot opens up.
            </p>
            <div className="text-sm space-y-1">
              {organizationContact.email && (
                <p>
                  <a href={`mailto:${organizationContact.email}`} className="text-[#1E3A5F] font-medium hover:underline">
                    {organizationContact.email}
                  </a>
                </p>
              )}
              {organizationContact.phone && (
                <p>
                  <a href={`tel:${organizationContact.phone}`} className="text-[#1E3A5F] font-medium hover:underline">
                    {organizationContact.phone}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Early Bird Pricing Info */}
        {earlyBirdMessage && settings.landingPageShowPrice && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg w-full">
            <p className="text-green-800 font-semibold">{earlyBirdMessage}</p>
          </div>
        )}
      </div>

      {/* Waitlist Modal */}
      <WaitlistModal
        eventId={eventId}
        eventName={eventName}
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />
    </>
  )
}
