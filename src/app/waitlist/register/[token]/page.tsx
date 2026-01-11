'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  XCircle,
  Loader2,
  PartyPopper,
} from 'lucide-react'
import { format } from 'date-fns'

interface WaitlistData {
  valid: boolean
  error?: string
  reason?: string
  entry?: {
    id: string
    name: string
    email: string
    partySize: number
    invitedAt: string
    expiresAt: string
    timeRemaining: {
      hours: number
      minutes: number
    }
  }
  event?: {
    id: string
    name: string
    slug: string
    startDate: string
    endDate: string
    locationName: string | null
    organizationName: string
    spotsAvailable: number | null
    groupRegistrationEnabled: boolean
    individualRegistrationEnabled: boolean
  }
}

export default function WaitlistRegisterPage() {
  const params = useParams()
  const token = params?.token as string
  const [data, setData] = useState<WaitlistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number } | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    fetchWaitlistData()
  }, [token])

  // Update countdown timer every minute
  useEffect(() => {
    if (!data?.entry?.expiresAt) return

    const updateTimer = () => {
      const expiresAt = new Date(data.entry!.expiresAt).getTime()
      const now = Date.now()
      const remaining = Math.max(0, expiresAt - now)

      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

      setTimeRemaining({ hours, minutes })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [data?.entry?.expiresAt])

  const fetchWaitlistData = async () => {
    try {
      const response = await fetch(`/api/waitlist/register/${token}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching waitlist data:', error)
      setData({
        valid: false,
        error: 'Failed to load invitation details',
        reason: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#2A4A6F] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Loading your invitation...</p>
        </div>
      </div>
    )
  }

  // Invalid or expired token
  if (!data?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#2A4A6F] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            {data?.reason === 'expired' ? (
              <>
                <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Invitation Expired</h1>
                <p className="text-[#6B7280] mb-6">
                  This invitation has expired. The spot has been offered to the next person on the waitlist.
                </p>
              </>
            ) : data?.reason === 'already_registered' ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Already Registered</h1>
                <p className="text-[#6B7280] mb-6">
                  You have already registered for this event. Check your email for confirmation details.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Invalid Link</h1>
                <p className="text-[#6B7280] mb-6">
                  {data?.error || 'This invitation link is invalid or has expired.'}
                </p>
              </>
            )}
            <Link href="/">
              <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { entry, event } = data

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#2A4A6F]">
      {/* Header */}
      <div className="bg-[#1E3A5F] py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <PartyPopper className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Your Spot is Ready!</h1>
          <p className="text-white/80">
            Great news, {entry?.name}! A spot has opened up for you.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 -mt-4">
        {/* Time Remaining Card */}
        <Card className="mb-6 border-2 border-orange-400 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-10 w-10 text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-orange-800 mb-1">Time-Sensitive Invitation</h2>
                <p className="text-orange-700 text-sm">
                  Complete your registration before this invitation expires.
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-orange-600">
                  {timeRemaining ? `${timeRemaining.hours}h ${timeRemaining.minutes}m` : '--'}
                </div>
                <div className="text-xs text-orange-600">remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">{event?.name}</CardTitle>
            <p className="text-sm text-[#6B7280]">Hosted by {event?.organizationName}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {event?.startDate && format(new Date(event.startDate), 'MMM d')} -{' '}
                  {event?.endDate && format(new Date(event.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              {event?.locationName && (
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{event.locationName}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#6B7280]">Reserved for</span>
                <span className="font-medium text-[#1E3A5F]">{entry?.name}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#6B7280]">Email</span>
                <span className="font-medium text-[#1E3A5F]">{entry?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Spots requested</span>
                <Badge className="bg-[#F5F1E8] text-[#1E3A5F]">
                  <Users className="h-3 w-3 mr-1" />
                  {entry?.partySize} {entry?.partySize === 1 ? 'spot' : 'spots'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">Complete Your Registration</CardTitle>
            <p className="text-sm text-[#6B7280]">
              Choose your registration type to secure your spot.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {event?.groupRegistrationEnabled && (
              <Link href={`/events/${event.slug}/register-group?waitlist=${token}`} className="block">
                <Button className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white h-14 text-lg">
                  <Users className="h-5 w-5 mr-2" />
                  Register as a Group
                </Button>
              </Link>
            )}
            {event?.individualRegistrationEnabled && (
              <Link href={`/events/${event.slug}/register-individual?waitlist=${token}`} className="block">
                <Button
                  variant="outline"
                  className="w-full border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white h-14 text-lg"
                >
                  Register as Individual
                </Button>
              </Link>
            )}

            <p className="text-xs text-center text-[#6B7280] mt-4">
              After completing registration, your waitlist spot will be confirmed automatically.
            </p>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6 text-white/70 text-sm">
          <p>Need help? Contact the event organizer for assistance.</p>
        </div>
      </div>
    </div>
  )
}
