'use client'

import { AlertCircle, Phone, Mail, X } from 'lucide-react'
import { useState } from 'react'

interface SubscriptionPausedBannerProps {
  pauseReason: string
  pauseReasonNote?: string | null
  pausedAt?: string | null
}

const pauseReasonLabels: Record<string, { title: string; description: string }> = {
  payment_overdue: {
    title: 'Payment Overdue',
    description: 'Your subscription payment is overdue. Please contact us to resolve this and continue your subscription.',
  },
  payment_failed: {
    title: 'Payment Failed',
    description: 'We were unable to process your payment. Please update your payment information or contact us.',
  },
  account_review: {
    title: 'Account Under Review',
    description: 'Your account is currently under review. We will contact you shortly with more information.',
  },
  user_requested: {
    title: 'Pause Requested',
    description: 'Your subscription has been paused as requested. Contact us when you are ready to resume.',
  },
  violation: {
    title: 'Terms Review',
    description: 'Your account has been paused pending review. Please contact us for more information.',
  },
  other: {
    title: 'Subscription Paused',
    description: 'Your subscription has been temporarily paused. Please contact us for more information.',
  },
}

export default function SubscriptionPausedBanner({
  pauseReason,
  pauseReasonNote,
  pausedAt,
}: SubscriptionPausedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) {
    return null
  }

  const reasonInfo = pauseReasonLabels[pauseReason] || pauseReasonLabels.other

  return (
    <div className="bg-orange-50 border-b border-orange-200">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-800">
                {reasonInfo.title}
              </h3>
              <p className="mt-1 text-sm text-orange-700">
                {reasonInfo.description}
              </p>
              {pauseReasonNote && (
                <p className="mt-2 text-sm text-orange-800 bg-orange-100 px-3 py-2 rounded-md">
                  <span className="font-medium">Note:</span> {pauseReasonNote}
                </p>
              )}
              <div className="mt-3 bg-white border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  Your events and registrations are still active!
                </p>
                <p className="text-sm text-gray-600">
                  People can still register for your events and all your event pages remain published.
                  This pause only affects billing.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                <a
                  href="mailto:support@chirhoevents.com"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-900"
                >
                  <Mail className="h-4 w-4" />
                  support@chirhoevents.com
                </a>
                <a
                  href="tel:+1234567890"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-900"
                >
                  <Phone className="h-4 w-4" />
                  Contact Support
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
