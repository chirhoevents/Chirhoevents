'use client'

import { useState, useEffect, useCallback } from 'react'
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
}

interface UseRegistrationQueueResult {
  loading: boolean
  queueActive: boolean
  queueStatus: QueueStatus | null
  expiresAt: string | null
  extensionAllowed: boolean
  markComplete: () => Promise<void>
  checkQueue: () => Promise<QueueStatus | null>
}

export function useRegistrationQueue(
  eventId: string,
  registrationType: 'group' | 'individual'
): UseRegistrationQueueResult {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [queueActive, setQueueActive] = useState(false)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)

  // Check queue status
  const checkQueue = useCallback(async (): Promise<QueueStatus | null> => {
    try {
      const response = await fetch('/api/queue/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, registrationType })
      })

      if (!response.ok) {
        // Queue might not be enabled - allow through
        setQueueActive(false)
        setLoading(false)
        return null
      }

      const data: QueueStatus = await response.json()
      setQueueStatus(data)

      // If queue is active but user needs to wait
      if (!data.allowed && data.status === 'waiting') {
        setQueueActive(true)
        // Redirect to queue page
        router.push(`/events/${eventId}/queue?type=${registrationType}`)
        return data
      }

      // User is allowed through
      setQueueActive(data.status === 'active' && !!data.expiresAt)
      setLoading(false)
      return data
    } catch (err) {
      console.error('Error checking queue:', err)
      // On error, allow through (fail open)
      setQueueActive(false)
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

  return {
    loading,
    queueActive,
    queueStatus,
    expiresAt: queueStatus?.expiresAt || null,
    extensionAllowed: queueStatus?.extensionAllowed ?? true,
    markComplete,
    checkQueue,
  }
}
