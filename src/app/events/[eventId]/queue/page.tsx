'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Clock, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LoadingScreen from '@/components/LoadingScreen'
import Image from 'next/image'

interface QueueStatus {
  allowed: boolean
  sessionId: string
  status: 'waiting' | 'active' | 'completed' | 'expired' | 'abandoned'
  queuePosition?: number
  estimatedWaitMinutes?: number
  expiresAt?: string
  extensionAllowed?: boolean
  extensionUsed?: boolean
  waitingRoomMessage?: string
}

interface EventSettings {
  groupRegistrationEnabled: boolean
  individualRegistrationEnabled: boolean
}

export default function QueuePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const eventId = params.eventId as string
  const typeParam = searchParams.get('type') as 'group' | 'individual' | null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [registrationType, setRegistrationType] = useState<'group' | 'individual' | null>(null)

  // Use ref to track if we should continue polling
  const shouldPollRef = useRef(true)

  // Fetch event settings to determine which registration type is enabled
  useEffect(() => {
    async function fetchEventSettings() {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error('Failed to load event')
        }
        const data = await response.json()

        const settings: EventSettings = {
          groupRegistrationEnabled: data.settings?.groupRegistrationEnabled ?? false,
          individualRegistrationEnabled: data.settings?.individualRegistrationEnabled ?? false,
        }

        // Determine registration type based on what&apos;s enabled
        let detectedType: 'group' | 'individual' | null = null

        if (typeParam) {
          if (typeParam === 'group' && settings.groupRegistrationEnabled) {
            detectedType = 'group'
          } else if (typeParam === 'individual' && settings.individualRegistrationEnabled) {
            detectedType = 'individual'
          }
        }

        if (!detectedType) {
          if (settings.groupRegistrationEnabled && !settings.individualRegistrationEnabled) {
            detectedType = 'group'
          } else if (settings.individualRegistrationEnabled && !settings.groupRegistrationEnabled) {
            detectedType = 'individual'
          } else if (settings.groupRegistrationEnabled) {
            detectedType = 'group'
          }
        }

        if (!detectedType) {
          setError('Registration is not enabled for this event')
          setLoading(false)
          return
        }

        setRegistrationType(detectedType)
      } catch (err) {
        console.error('Error fetching event settings:', err)
        setError('Failed to load event settings')
        setLoading(false)
      }
    }

    fetchEventSettings()
  }, [eventId, typeParam])

  // Check queue status - does NOT set error on failure, just logs and continues
  const checkStatus = useCallback(async (isManual = false) => {
    if (!registrationType) return null

    if (isManual) {
      setIsRefreshing(true)
    }

    try {
      const response = await fetch(`/api/queue/status?eventId=${eventId}&type=${registrationType}`)

      if (!response.ok) {
        // If not in queue, join it
        const joinResponse = await fetch('/api/queue/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, registrationType })
        })

        if (!joinResponse.ok) {
          console.error('Failed to join queue')
          return null
        }

        const joinData = await joinResponse.json()
        setQueueStatus(joinData)
        setLastUpdated(new Date())
        setRefreshCount(prev => prev + 1)

        // Check if admitted
        if (joinData.allowed && joinData.status === 'active') {
          shouldPollRef.current = false
          const redirectPath = registrationType === 'group'
            ? `/events/${eventId}/register-group`
            : `/events/${eventId}/register-individual`
          router.push(redirectPath)
        }

        return joinData
      }

      const data = await response.json()
      setQueueStatus(data)
      setLastUpdated(new Date())
      setRefreshCount(prev => prev + 1)

      // Check if admitted
      if (data.allowed && data.status === 'active') {
        shouldPollRef.current = false
        const redirectPath = registrationType === 'group'
          ? `/events/${eventId}/register-group`
          : `/events/${eventId}/register-individual`
        router.push(redirectPath)
      }

      return data
    } catch (err) {
      console.error('Error checking queue status:', err)
      // Don&apos;t set error - just continue polling
      return null
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [eventId, registrationType, router])

  // Initial check when registration type is determined
  useEffect(() => {
    if (registrationType) {
      checkStatus()
    }
  }, [registrationType, checkStatus])

  // Poll for status updates every 5 seconds - ALWAYS runs, doesn&apos;t stop on error
  useEffect(() => {
    if (!registrationType) return

    const interval = setInterval(() => {
      if (shouldPollRef.current) {
        checkStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [registrationType, checkStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldPollRef.current = false
    }
  }, [])

  if (loading) {
    return <LoadingScreen message="Checking queue status..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">Something went wrong</h2>
            <p className="text-[#6B7280] mb-6">{error}</p>
            <Button
              onClick={() => {
                setError(null)
                setLoading(true)
                shouldPollRef.current = true
                checkStatus()
              }}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const registrationTypeLabel = registrationType === 'group' ? 'Group' : 'Individual'

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          {/* Spinning logo */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-[#9C8466]/30"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#9C8466] border-r-[#9C8466] animate-spin"></div>
            {/* Inner background */}
            <div className="absolute inset-2 rounded-full bg-[#1E3A5F]"></div>
            {/* Logo in center */}
            <div className="absolute inset-3 flex items-center justify-center">
              <Image
                src="/ChiRho Event Logos/Chrirho Events Square White Logo.png"
                alt="ChiRho Events"
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl text-[#1E3A5F]">
            You&apos;re in the Virtual Queue
          </CardTitle>
          <CardDescription className="text-base text-[#6B7280] mt-2">
            {registrationTypeLabel} registration is currently at capacity.
            You&apos;ll be automatically admitted when a spot opens.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Queue Position */}
          <div className="bg-[#F9F6F2] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#6B7280] font-medium">Your Position:</span>
              <span className="text-4xl font-bold text-[#1E3A5F]">
                #{queueStatus?.queuePosition || '—'}
              </span>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-[#6B7280] font-medium">Estimated Wait:</span>
              <span className="text-xl font-semibold text-[#1E3A5F]">
                {queueStatus?.estimatedWaitMinutes
                  ? `~${queueStatus.estimatedWaitMinutes} minute${queueStatus.estimatedWaitMinutes !== 1 ? 's' : ''}`
                  : 'Calculating...'}
              </span>
            </div>

            {/* Progress bar */}
            {queueStatus?.queuePosition && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-[#6B7280] mb-1">
                  <span>Progress</span>
                  <span>Almost there!</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#9C8466] h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, 100 - Math.min((queueStatus.queuePosition - 1) * 10, 95))}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom Message */}
          {queueStatus?.waitingRoomMessage && (
            <div className="bg-blue-50 border-l-4 border-[#1E3A5F] p-4">
              <p className="text-[#1E3A5F]">{queueStatus.waitingRoomMessage}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-amber-50 border-l-4 border-[#9C8466] p-4">
            <h3 className="font-semibold text-[#1E3A5F] mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Important
            </h3>
            <ul className="text-sm text-[#6B7280] space-y-1">
              <li>• Keep this page open — you&apos;ll be admitted automatically</li>
              <li>• Do not refresh the page or you may lose your spot</li>
              <li>• You&apos;ll have limited time to complete registration once admitted</li>
            </ul>
          </div>

          {/* Status Footer */}
          <div className="text-center pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-[#6B7280]">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshing ? 'Refreshing...' : 'Auto-refreshing every 5 seconds'}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()} (refresh #{refreshCount})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className="mt-2 text-[#6B7280]"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Now
            </Button>
          </div>

          {/* Cancel Button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => router.push(`/events/${eventId}`)}
              className="text-[#6B7280] border-[#6B7280] hover:bg-gray-100"
            >
              Leave Queue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
