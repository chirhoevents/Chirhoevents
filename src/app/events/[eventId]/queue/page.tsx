'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

export default function QueuePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const eventId = params.eventId as string
  const registrationType = searchParams.get('type') as 'group' | 'individual'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Check queue status
  const checkStatus = useCallback(async () => {
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
          throw new Error('Failed to join queue')
        }

        const joinData = await joinResponse.json()
        setQueueStatus(joinData)
        setLastUpdated(new Date())
        return joinData
      }

      const data = await response.json()
      setQueueStatus(data)
      setLastUpdated(new Date())
      return data
    } catch (err) {
      console.error('Error checking queue status:', err)
      setError('Failed to check queue status. Please refresh the page.')
      return null
    } finally {
      setLoading(false)
    }
  }, [eventId, registrationType])

  // Initial check
  useEffect(() => {
    if (!registrationType) {
      setError('Invalid registration type')
      setLoading(false)
      return
    }
    checkStatus()
  }, [checkStatus, registrationType])

  // Poll for status updates every 5 seconds
  useEffect(() => {
    if (!registrationType || error) return

    const interval = setInterval(async () => {
      const status = await checkStatus()

      // If admitted, redirect to registration page
      if (status?.allowed && status?.status === 'active') {
        const redirectPath = registrationType === 'group'
          ? `/events/${eventId}/register-group`
          : `/events/${eventId}/register-individual`
        router.push(redirectPath)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [eventId, registrationType, checkStatus, router, error])

  // Redirect if already allowed
  useEffect(() => {
    if (queueStatus?.allowed && queueStatus?.status === 'active') {
      const redirectPath = registrationType === 'group'
        ? `/events/${eventId}/register-group`
        : `/events/${eventId}/register-individual`
      router.push(redirectPath)
    }
  }, [queueStatus, eventId, registrationType, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-[#1E3A5F] animate-spin mb-4" />
            <p className="text-[#6B7280]">Checking queue status...</p>
          </CardContent>
        </Card>
      </div>
    )
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
          <div className="w-16 h-16 bg-[#1E3A5F] rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="h-8 w-8 text-[#9C8466]" />
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
              <Users className="h-4 w-4" />
              <span>
                Status updates automatically every 5 seconds
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
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
