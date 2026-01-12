'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface GroupData {
  registrationType: 'group'
  groupName: string
  eventName: string
  eventDates: string
  priestCount: number
}

interface IndividualData {
  registrationType: 'individual'
  individualId: string
  participantName: string
  participantEmail: string
  participantAge: number | null
  eventName: string
  eventDates: string
  formCompleted: boolean
  autoFormType: 'youth_u18' | 'youth_o18_chaperone'
}

type PortalData = GroupData | IndividualData

export default function PorosRoleSelection() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalData, setPortalData] = useState<PortalData | null>(null)

  useEffect(() => {
    async function validateAccessCode() {
      try {
        const response = await fetch('/api/portal/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_code: accessCode }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Invalid access code')
        }

        if (data.registrationType === 'individual') {
          // For individual registrations, check if form is already completed
          if (data.formCompleted) {
            setError('Your liability form has already been completed.')
            setLoading(false)
            return
          }

          // Store the individual data
          setPortalData({
            registrationType: 'individual',
            individualId: data.individualId,
            participantName: data.participantName,
            participantEmail: data.participantEmail,
            participantAge: data.participantAge,
            eventName: data.eventName,
            eventDates: data.eventDates,
            formCompleted: data.formCompleted,
            autoFormType: data.autoFormType,
          })
        } else {
          // Group registration
          setPortalData({
            registrationType: 'group',
            groupName: data.groupName,
            eventName: data.eventName,
            eventDates: data.eventDates,
            priestCount: data.priestCount || 0,
          })
        }
      } catch (err: any) {
        setError(err.message || 'Invalid or expired access code')
      } finally {
        setLoading(false)
      }
    }

    if (accessCode) {
      validateAccessCode()
    }
  }, [accessCode])

  const roles = [
    {
      type: 'youth-u18',
      title: 'Youth Under 18',
      description: 'Ages 12-17',
      details: 'Parent consent required',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400',
      iconColor: 'text-blue-600',
    },
    {
      type: 'youth-o18-chaperone',
      title: 'Youth 18+ or Chaperone',
      description: 'Ages 18+',
      details: 'Self-completion',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:border-green-400',
      iconColor: 'text-green-600',
    },
    {
      type: 'clergy',
      title: 'Priest/Deacon/Bishop',
      description: 'Clergy form',
      details: 'Special form for clergy',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:border-purple-400',
      iconColor: 'text-purple-600',
    },
  ]

  const handleRoleSelect = (roleType: string) => {
    if (!portalData || portalData.registrationType !== 'group') return

    // Check if clergy form is allowed
    if (roleType === 'clergy' && portalData.priestCount === 0) {
      setError('Your group registration does not include any clergy members. Please select a different form type.')
      return
    }
    router.push(`/poros/${accessCode}/forms/${roleType}/new`)
  }

  const handleIndividualContinue = () => {
    if (!portalData || portalData.registrationType !== 'individual') return

    // Convert form type format for URL (youth_u18 -> youth-u18)
    const formTypeUrl = portalData.autoFormType.replace('_', '-')
    router.push(`/poros/${accessCode}/forms/${formTypeUrl}/new?individual=true`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center" style={{ backgroundImage: "linear-gradient(rgba(30, 58, 95, 0.85), rgba(30, 58, 95, 0.9)), url('/ChiRho Event Logos/ChiRho events BG.png')" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center p-4" style={{ backgroundImage: "linear-gradient(rgba(30, 58, 95, 0.85), rgba(30, 58, 95, 0.9)), url('/ChiRho Event Logos/ChiRho events BG.png')" }}>
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">
            {error?.includes('already been completed') ? 'Form Already Completed' : 'Invalid Access Code'}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/poros')}
            className="bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy/90 transition-colors"
          >
            {error?.includes('already been completed') ? 'Return Home' : 'Try Again'}
          </button>
        </div>
      </div>
    )
  }

  // Individual Registration Flow - Show a simpler UI and proceed directly
  if (portalData.registrationType === 'individual') {
    const isUnder18 = portalData.autoFormType === 'youth_u18'

    return (
      <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "linear-gradient(rgba(30, 58, 95, 0.85), rgba(30, 58, 95, 0.9)), url('/ChiRho Event Logos/ChiRho events BG.png')" }}>
        {/* Header with Logo */}
        <div className="bg-navy py-6 shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <Link href="/poros">
                <Image
                  src="/Poros logo.png"
                  alt="Poros - ChiRho Events"
                  width={350}
                  height={105}
                  className="h-16 md:h-20 w-auto cursor-pointer hover:opacity-90 transition-opacity"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Title Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-navy mb-3">
                Liability Form
              </h1>
              <p className="text-xl text-gray-700 mb-2">{portalData.eventName}</p>
              <p className="text-lg text-gray-600">{portalData.eventDates}</p>
            </div>

            {/* Participant Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-navy mb-1">{portalData.participantName}</h2>
                <p className="text-gray-600">{portalData.participantEmail}</p>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${isUnder18 ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isUnder18 ? (
                    <>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="font-semibold text-blue-900">Youth Under 18</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-semibold text-green-900">Adult (18+)</span>
                    </>
                  )}
                </div>
                <p className={`text-sm text-center ${isUnder18 ? 'text-blue-700' : 'text-green-700'}`}>
                  {isUnder18
                    ? 'A parent or guardian will need to complete and sign this form.'
                    : 'You can complete this form yourself.'}
                </p>
              </div>

              <button
                onClick={handleIndividualContinue}
                className="w-full bg-navy text-white py-4 rounded-lg font-semibold text-lg hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Form
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

            {/* Help Text for Under 18 */}
            {isUnder18 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Parent/Guardian Required</h3>
                    <p className="text-sm text-amber-700">
                      Since you are under 18, you will enter your parent or guardian&apos;s email address on the next page.
                      They will receive a link to complete and sign the liability form on your behalf.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-500">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Group Registration Flow - Show role selection
  const isClergyAllowed = portalData.priestCount > 0

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "linear-gradient(rgba(30, 58, 95, 0.85), rgba(30, 58, 95, 0.9)), url('/ChiRho Event Logos/ChiRho events BG.png')" }}>
      {/* Header with Logo */}
      <div className="bg-navy py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Link href="/poros">
              <Image
                src="/Poros logo.png"
                alt="Poros - ChiRho Events"
                width={350}
                height={105}
                className="h-16 md:h-20 w-auto cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy mb-3">
              Fill Out Your Liability Form
            </h1>
            <p className="text-xl text-gray-700 mb-2">{portalData.eventName}</p>
            <p className="text-lg text-gray-600">Group: {portalData.groupName}</p>
          </div>

          {/* Question */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-navy">Who are you?</h2>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => {
              const isClergy = role.type === 'clergy'
              const isDisabled = isClergy && !isClergyAllowed

              return (
                <div key={role.type} className="relative">
                  <button
                    onClick={() => handleRoleSelect(role.type)}
                    disabled={isDisabled}
                    className={`w-full ${role.bgColor} border-2 ${role.borderColor} ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : `${role.hoverColor} hover:shadow-lg transform hover:-translate-y-1`
                    } rounded-xl p-8 text-center transition-all duration-200`}
                  >
                    <div className={`flex justify-center ${role.iconColor} mb-4`}>
                      {role.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-navy mb-2">{role.title}</h3>
                    <p className="text-gray-700 font-medium mb-1">{role.description}</p>
                    <p className="text-sm text-gray-600 mb-6">{role.details}</p>
                    <div className="flex items-center justify-center text-navy font-medium">
                      {isDisabled ? 'Not Available' : 'Select'}
                      {!isDisabled && (
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      )}
                    </div>
                  </button>
                  {isDisabled && (
                    <div className="mt-2 text-sm text-red-600 text-center">
                      Your group registration does not include clergy
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Help Text */}
          <div className="mt-12 bg-gold/10 border border-gold rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-navy mb-2">Need Help Choosing?</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>Youth Under 18:</strong> If the participant is between ages 12-17, select this option. A parent will need to complete and sign the form.</li>
                  <li><strong>Youth 18+ or Chaperone:</strong> If the participant is 18 or older (including adult chaperones), select this option. The participant can complete the form themselves.</li>
                  <li><strong>Priest/Deacon/Bishop:</strong> Only for clergy members attending the event. This form has specialized fields for clergy information.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © 2025 ChiRho Events. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
