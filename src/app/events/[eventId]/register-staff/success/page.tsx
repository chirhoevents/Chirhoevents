'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Home, Mail } from 'lucide-react'

interface RegistrationData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  tshirtSize: string
  isVendorStaff: boolean
  porosAccessCode: string | null
  event: {
    name: string
    startDate: string
    endDate: string
  }
  vendorRegistration?: {
    businessName: string
  }
}

export default function StaffRegistrationSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string
  const registrationId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRegistration() {
      if (!registrationId) {
        setError('Registration ID not found')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/registration/staff/${registrationId}`)
        if (!response.ok) throw new Error('Failed to load registration')
        const data = await response.json()
        setRegistration(data)
      } catch (err) {
        setError('Failed to load registration details')
      } finally {
        setLoading(false)
      }
    }
    loadRegistration()
  }, [registrationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-lg">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-red-600 mb-4">{error || 'Registration not found'}</p>
              <Link href={`/events/${eventId}`}>
                <Button variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">Registration Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600">
                Thank you for registering as {registration.isVendorStaff ? 'vendor booth staff' : 'staff/volunteer'} for
              </p>
              <p className="font-semibold text-lg text-[#1E3A5F]">{registration.event.name}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-900">Registration Details</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-500">Name:</span> {registration.firstName} {registration.lastName}</p>
                <p><span className="text-gray-500">Email:</span> {registration.email}</p>
                <p><span className="text-gray-500">Role:</span> {registration.role}</p>
                <p><span className="text-gray-500">T-Shirt Size:</span> {registration.tshirtSize}</p>
                {registration.isVendorStaff && registration.vendorRegistration && (
                  <p><span className="text-gray-500">Vendor Booth:</span> {registration.vendorRegistration.businessName}</p>
                )}
              </div>
            </div>

            {registration.porosAccessCode && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Liability Form Required</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Please complete your liability form using this access code:
                </p>
                <div className="bg-white border border-amber-300 rounded-lg p-3 text-center">
                  <code className="text-xl font-mono font-bold text-[#1E3A5F]">
                    {registration.porosAccessCode}
                  </code>
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  You will receive an email with this code and instructions.
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  A confirmation email has been sent to <strong>{registration.email}</strong> with all the details.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Link href={`/events/${eventId}`}>
                <Button className="w-full bg-[#1E3A5F] hover:bg-[#2d4a6f]">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Event Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
