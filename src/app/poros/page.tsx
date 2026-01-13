'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface GroupInfo {
  groupName: string
  eventName: string
  eventDates: string
  accessCode: string
}

export default function PorosLandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)

  // Auto-fill access code from URL if provided
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setAccessCode(codeFromUrl.toUpperCase())
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCode.trim().toUpperCase() }),
      })

      if (!response.ok) {
        throw new Error('Invalid or expired access code')
      }

      const data = await response.json()
      setGroupInfo({
        groupName: data.groupName,
        eventName: data.eventName,
        eventDates: data.eventDates,
        accessCode: accessCode.trim().toUpperCase(),
      })
    } catch (err) {
      setError('Hey! Sorry this access code is invalid or has expired. Contact your group leader for more information!')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (groupInfo) {
      router.push(`/poros/${groupInfo.accessCode}`)
    }
  }

  const handleGoBack = () => {
    setGroupInfo(null)
    setAccessCode('')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "linear-gradient(rgba(30, 58, 95, 0.85), rgba(30, 58, 95, 0.9)), url('/ChiRho Event Logos/ChiRho events BG.png')" }}>
      {/* Header with Logo */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          <Link href="/">
            <Image
              src="/Poros logo.png"
              alt="Poros - ChiRho Events"
              width={400}
              height={120}
              className="h-20 md:h-28 w-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </Link>
          <p className="text-white/70 text-sm mt-2">by ChiRho Events</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          {!groupInfo ? (
            /* Access Code Entry Form */
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-navy mb-4">
                  Access Your Liability Forms
                </h1>
                <p className="text-xl text-gray-600">
                  Enter your group&apos;s access code to get started
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Access Code
                  </label>
                  <input
                    type="text"
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="M2K2026-STMARYS-ABC1"
                    className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors font-mono"
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !accessCode.trim()}
                  className="w-full bg-navy text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validating...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an access code? Contact your group leader.
                </p>
              </div>
            </div>
          ) : (
            /* Confirmation Modal */
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-navy mb-2">Is this your group?</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Group Name:</span>
                  <span className="text-navy font-semibold text-right">{groupInfo.groupName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Event:</span>
                  <span className="text-navy font-semibold text-right">{groupInfo.eventName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Dates:</span>
                  <span className="text-navy font-semibold">{groupInfo.eventDates}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  className="w-full bg-navy text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-navy/90 transition-colors shadow-lg hover:shadow-xl"
                >
                  Yes, Continue
                </button>
                <button
                  onClick={handleGoBack}
                  className="w-full bg-gray-200 text-gray-700 py-4 px-6 rounded-lg text-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  No, Go Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/20 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/80 text-sm">
            © 2025 ChiRho Events. All rights reserved.
          </p>
          <p className="text-white/60 text-xs mt-2">
            Powering Catholic youth events with excellence
          </p>
        </div>
      </div>
    </div>
  )
}
