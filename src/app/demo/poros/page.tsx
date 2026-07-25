'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

// DEMO: hardcoded valid access codes
const CODES: Record<string, { registrationType: 'group' | 'individual' | 'staff'; displayName: string; eventName: string; eventDates: string; autoFormType?: string }> = {
  'M2K2026-STMARY-ABC1': { registrationType: 'group', displayName: "St. Mary's Youth Group", eventName: 'Summer Youth Retreat 2026', eventDates: 'July 15 - 18, 2026' },
  'M2K2026-SJP2-XYZ2': { registrationType: 'group', displayName: 'St. John Paul II Parish', eventName: 'Summer Youth Retreat 2026', eventDates: 'July 15 - 18, 2026' },
  'IND-EMMA-2026': { registrationType: 'individual', displayName: 'Emma Johnson (age 16)', eventName: 'Summer Youth Retreat 2026', eventDates: 'July 15 - 18, 2026', autoFormType: 'youth-u18' },
  'IND-TOM-2026': { registrationType: 'individual', displayName: 'Thomas Wright (age 34)', eventName: "Men's Silent Retreat", eventDates: 'September 11 - 13, 2026', autoFormType: 'youth-o18-chaperone' },
  'STF-KELLY-2026': { registrationType: 'staff', displayName: 'Kelly Rivera (staff)', eventName: 'Summer Youth Retreat 2026', eventDates: 'July 15 - 18, 2026', autoFormType: 'youth-o18-chaperone' },
}

export default function PorosLandingPage() {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupInfo, setGroupInfo] = useState<any>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    setTimeout(() => {
      const info = CODES[accessCode.trim().toUpperCase()]
      if (!info) {
        setError('Hey! Sorry this access code is invalid or has expired. Try one of the demo codes below.')
        setLoading(false)
        return
      }
      setGroupInfo({ ...info, accessCode: accessCode.trim().toUpperCase() })
      setLoading(false)
    }, 400)
  }

  const handleConfirm = () => {
    if (groupInfo) {
      router.push(`/demo/poros/${groupInfo.accessCode}`)
    }
  }

  const handleGoBack = () => {
    setGroupInfo(null)
    setAccessCode('')
    setError(null)
  }

  return (
    <div className="min-h-[calc(100vh-36px)]" style={{ background: 'linear-gradient(rgba(30, 58, 95, 0.85), rgba(30, 58, 95, 0.9))' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          <Link href="/demo">
            <Image
              src="/light-logo-horizontal.png"
              alt="ChiRho Events"
              width={300}
              height={90}
              className="h-16 md:h-20 w-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </Link>
          <p className="text-white/80 text-lg mt-3 font-semibold">Poros Liability Platform</p>
          <p className="text-white/60 text-xs">by ChiRho Events</p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          {!groupInfo ? (
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A5F] mb-4">
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
                    placeholder="M2K2026-STMARY-ABC1"
                    className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466] transition-colors font-mono"
                    required
                    disabled={loading}
                  />
                </div>

                <p className="text-xs text-gray-500 -mt-4">
                  Staff &amp; volunteer codes begin with <strong>STF-</strong> · Individual codes begin with <strong>IND-</strong> · Group codes look like <strong>EX2026-GROUPNAME-XXXX</strong>
                </p>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !accessCode.trim()}
                  className="w-full bg-[#1E3A5F] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-[#2A4A6F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Validating...' : 'Continue'}
                </button>
              </form>

              <div className="mt-8 p-4 bg-[#F5F1E8] border border-[#E1D5BA] rounded-lg">
                <p className="text-sm font-semibold text-navy mb-2">Demo access codes — click to try:</p>
                <div className="space-y-1 text-xs">
                  {Object.entries(CODES).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() => setAccessCode(code)}
                      className="block text-left hover:text-navy hover:underline"
                    >
                      <code className="font-mono font-semibold">{code}</code>
                      <span className="text-slate-600"> — {info.displayName} ({info.registrationType})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an access code? Contact your group leader.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">Is this your group?</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">
                    {groupInfo.registrationType === 'staff' ? 'Name:' : groupInfo.registrationType === 'individual' ? 'Participant:' : 'Group Name:'}
                  </span>
                  <span className="text-[#1E3A5F] font-semibold text-right">{groupInfo.displayName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Event:</span>
                  <span className="text-[#1E3A5F] font-semibold text-right">{groupInfo.eventName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Dates:</span>
                  <span className="text-[#1E3A5F] font-semibold">{groupInfo.eventDates}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  className="w-full bg-[#1E3A5F] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-[#2A4A6F] transition-colors shadow-lg hover:shadow-xl"
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

      <div className="border-t border-white/20 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/80 text-sm">© 2026 ChiRho Events. All rights reserved.</p>
          <p className="text-white/60 text-xs mt-2">Powering Catholic youth events with excellence</p>
        </div>
      </div>
    </div>
  )
}
