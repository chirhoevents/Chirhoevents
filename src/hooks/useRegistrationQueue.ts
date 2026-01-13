'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

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
  queueNotEnabled?: boolean
}

interface UseRegistrationQueueResult {
  // True while initial check is happening
  loading: boolean
  // True if queue system is active and user has been admitted (has timer)
  queueActive: boolean
  // True if user should be BLOCKED from accessing the page
  isBlocked: boolean
  // The current queue status
  queueStatus: QueueStatus | null
  // When the session expires (for timer display)
  expiresAt: string | null
  // Whether extension is allowed
  extensionAllowed: boolean
  // Call this after successful registration
  markComplete: () => Promise<void>
  // Manually re-check queue status
  checkQueue: () => Promise<QueueStatus | null>
}

export function useRegistrationQueue(
  eventId: string,
  registrationType: 'group' | 'individual'
): UseRegistrationQueueResult {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [queueActive, setQueueActive] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const hasRedirected = useRef(false)

  // Check queue status
  const checkQueue = useCallback(async (): Promise<QueueStatus | null> => {
    try {
      const response = await fetch('/api/queue/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, registrationType })
      })

      // If API returns error, check if queue is enabled for this event
      if (!response.ok) {
        // Try to determine if queue is even enabled
        const errorData = await response.json().catch(() => ({}))
        console.error('Queue check failed:', errorData)

        // If we got a clear "queue not enabled" response, allow through
        if (errorData.queueNotEnabled) {
          setQueueActive(false)
          setIsBlocked(false)
          setLoading(false)
          return null
        }

        // Otherwise, block access to be safe (fail closed)
        setQueueActive(false)
        setIsBlocked(true)
        setLoading(false)
        return null
      }

      const data: QueueStatus = await response.json()
      setQueueStatus(data)

      // If queue is not enabled, allow through without timer
      if (data.queueNotEnabled) {
        setQueueActive(false)
        setIsBlocked(false)
        setLoading(false)
        return data
      }

      // If queue is active but user needs to wait
      if (!data.allowed && data.status === 'waiting') {
        setQueueActive(false)
        setIsBlocked(true) // BLOCK the user
        setLoading(false)

        // Only redirect once to avoid redirect loops
        if (!hasRedirected.current) {
          hasRedirected.current = true
          router.push(`/events/${eventId}/queue?type=${registrationType}`)
        }
        return data
      }

      // If session expired while on page, block them
      if (data.status === 'expired') {
        setQueueActive(false)
        setIsBlocked(true)
        setLoading(false)

        if (!hasRedirected.current) {
          hasRedirected.current = true
          router.push(`/events/${eventId}/queue?type=${registrationType}`)
        }
        return data
      }

      // User is allowed through
      setIsBlocked(false)
      setQueueActive(data.status === 'active' && !!data.expiresAt)
      setLoading(false)
      return data
    } catch (err) {
      console.error('Error checking queue:', err)
      // On network error, block access to be safe (fail closed)
      setQueueActive(false)
      setIsBlocked(true)
      setLoading(false)
      return null
    }
  }, [eventId, registrationType, router])

  // Mark session as complete after successful registration
  const markComplete = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/queue/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('Error marking queue session complete:', err)
      // Non-critical error, don't throw
    }
  }, [])

  // Initial check on mount
  useEffect(() => {
    checkQueue()
  }, [checkQueue])

  // Re-check every 30 seconds to ensure session is still valid
  useEffect(() => {
    const interval = setInterval(() => {
      // Only re-check if not already blocked and queue is active
      if (!isBlocked && queueActive) {
        checkQueue()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [checkQueue, isBlocked, queueActive])

  return {
    loading,
    queueActive,
    isBlocked,
    queueStatus,
    expiresAt: queueStatus?.expiresAt || null,
    extensionAllowed: queueStatus?.extensionAllowed ?? true,
    markComplete,
    checkQueue,
  }
}
