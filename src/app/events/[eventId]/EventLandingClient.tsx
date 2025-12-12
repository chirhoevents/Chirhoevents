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
}

export default function EventLandingClient({
  eventId,
  eventName,
  status,
  settings,
  pricing,
  spotsMessage,
  earlyBirdMessage,
}: EventLandingClientProps) {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col items-center text-center">
        {/* Status Icon */}
        <div className="mb-4">
          {status.allowRegistration ? (
            <CheckCircle className="h-16 w-16 text-green-600" />
          ) : status.allowWaitlist ? (
            <Clock className="h-16 w-16 text-[#9C8466]" />
          ) : (
            <AlertCircle className="h-16 w-16 text-gray-400" />
          )}
        </div>

        {/* Status Message */}
        <h2
          className={`text-2xl md:text-3xl font-bold mb-2 ${
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

        {/* Countdown in Registration Section */}
        {status.showCountdown &&
          status.countdownTarget &&
          settings.countdownLocation === 'registration' && (
            <div className="w-full mb-6">
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
                    } text-white px-8 py-6 text-lg`}
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
                    } text-white px-8 py-6 text-lg`}
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
              className="w-full sm:w-auto border-2 border-[#9C8466] text-[#9C8466] hover:bg-[#9C8466] hover:text-white px-8 py-6 text-lg"
            >
              Join Waitlist
            </Button>
          )}

          {!status.allowRegistration && !status.allowWaitlist && (
            <Button
              size="lg"
              disabled
              className="w-full sm:w-auto px-8 py-6 text-lg"
            >
              {status.status === 'not_yet_open'
                ? 'Registration Not Yet Open'
                : status.status === 'event_ended'
                ? 'Event Has Ended'
                : 'Registration Closed'}
            </Button>
          )}
        </div>

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
