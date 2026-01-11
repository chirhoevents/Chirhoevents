'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Store, Loader2 } from 'lucide-react'

interface VendorInfo {
  businessName: string
  eventName: string
  eventDates: string
  accessCode: string
  status: string
}

function VendorPortalLandingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null)

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
      const response = await fetch(`/api/vendor/portal?code=${encodeURIComponent(accessCode.trim())}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid access code')
      }

      const data = await response.json()
      setVendorInfo({
        businessName: data.vendor.businessName,
        eventName: data.event.name,
        eventDates: data.event.dates,
        accessCode: accessCode.trim().toUpperCase(),
        status: data.vendor.status,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired access code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (vendorInfo) {
      router.push(`/dashboard/vendor?code=${vendorInfo.accessCode}`)
    }
  }

  const handleGoBack = () => {
    setVendorInfo(null)
    setAccessCode('')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#1E3A5F]/90">
      {/* Header with Logo */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <Link href="/">
            <Image
              src="/light-logo-horizontal.png"
              alt="ChiRho Events"
              width={200}
              height={60}
              className="h-16 md:h-20 w-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          {!vendorInfo ? (
            /* Access Code Entry Form */
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#9C8466]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-[#9C8466]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4">
                  Vendor Portal
                </h1>
                <p className="text-lg text-gray-600">
                  Enter your vendor access code to view your booth information, pay your invoice, and manage your team.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Access Code
                  </label>
                  <input
                    type="text"
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="VNDACC-XXXXXXXX"
                    className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466] transition-colors font-mono"
                    required
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    This code was sent to you when your vendor application was approved.
                  </p>
                </div>

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
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Validating...
                    </span>
                  ) : (
                    'Access Portal'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an access code? Your code is sent via email when your vendor application is approved.
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
                <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">Is this your business?</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Business Name:</span>
                  <span className="text-[#1E3A5F] font-semibold text-right">{vendorInfo.businessName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Event:</span>
                  <span className="text-[#1E3A5F] font-semibold text-right">{vendorInfo.eventName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Dates:</span>
                  <span className="text-[#1E3A5F] font-semibold">{vendorInfo.eventDates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <span className={`font-semibold capitalize ${
                    vendorInfo.status === 'approved' ? 'text-green-600' :
                    vendorInfo.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {vendorInfo.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  className="w-full bg-[#1E3A5F] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-[#2A4A6F] transition-colors shadow-lg hover:shadow-xl"
                >
                  Yes, Continue to Portal
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
            Powered by ChiRho Events
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VendorPortalLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#1E3A5F]/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <VendorPortalLandingContent />
    </Suspense>
  )
}
