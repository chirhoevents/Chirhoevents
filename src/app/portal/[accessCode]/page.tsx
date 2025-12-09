'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

interface GroupPortalData {
  groupId: string
  groupName: string
  eventName: string
  eventDates: string
  totalParticipants: number
  formsCompleted: number
  formsPending: number
}

export default function AccessCodePortal() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupData, setGroupData] = useState<GroupPortalData | null>(null)

  useEffect(() => {
    async function validateAccessCode() {
      try {
        const response = await fetch('/api/portal/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_code: accessCode }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Invalid access code')
        }

        const data = await response.json()
        setGroupData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to validate access code')
      } finally {
        setLoading(false)
      }
    }

    if (accessCode) {
      validateAccessCode()
    }
  }, [accessCode])

  const handleStartForms = () => {
    router.push(`/portal/${accessCode}/forms/new`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
          <p className="text-navy font-medium">Validating access code...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Invalid Access Code</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your access code and try again. Access codes are provided by your group leader after registration.
          </p>
        </div>
      </div>
    )
  }

  if (!groupData) return null

  const completionPercentage = groupData.totalParticipants > 0
    ? Math.round((groupData.formsCompleted / groupData.totalParticipants) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <div className="bg-navy py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Image
              src="/logo-horizontal.png"
              alt="ChiRho Events"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Welcome Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-navy mb-2">Liability Forms Portal</h1>
            <p className="text-gray-600 mb-6">
              Welcome! Use this portal to complete liability forms for your group.
            </p>

            <div className="bg-gold/10 border-l-4 border-gold p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-gold mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">
                    Access Code: <span className="font-mono font-bold text-navy">{accessCode}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Save this code - you'll need it to access forms later
                  </p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-navy mb-4">Event Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="text-lg font-medium text-navy">{groupData.eventName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="text-lg font-medium text-navy">{groupData.eventDates}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Group</p>
                  <p className="text-lg font-medium text-navy">{groupData.groupName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Participants</p>
                  <p className="text-lg font-medium text-navy">{groupData.totalParticipants}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Forms Progress Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-xl font-semibold text-navy mb-4">Liability Forms Status</h2>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{completionPercentage}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-gold to-yellow-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-green-600">{groupData.formsCompleted}</p>
                <p className="text-sm text-gray-600">Forms Completed</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-yellow-600">{groupData.formsPending}</p>
                <p className="text-sm text-gray-600">Forms Pending</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={handleStartForms}
              className="inline-flex items-center px-8 py-4 bg-navy text-white text-lg font-semibold rounded-lg hover:bg-navy/90 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Filling Out Forms
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © 2025 ChiRho Events. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Need help? Contact your event organizer.
          </p>
        </div>
      </div>
    </div>
  )
}
