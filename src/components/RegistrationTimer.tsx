'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RegistrationTimerProps {
  expiresAt: string | Date
  eventId: string
  registrationType: 'group' | 'individual'
  extensionAllowed?: boolean
  onSessionExpired?: () => void
}

export default function RegistrationTimer({
  expiresAt,
  eventId,
  registrationType,
  extensionAllowed = true,
  onSessionExpired,
}: RegistrationTimerProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [extending, setExtending] = useState(false)
  const [extensionUsed, setExtensionUsed] = useState(false)
  const [currentExpiresAt, setCurrentExpiresAt] = useState<Date>(
    typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  )

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expires = currentExpiresAt.getTime()
      const remaining = Math.max(0, Math.floor((expires - now) / 1000))
      return remaining
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      // Show warning at 2 minutes (120 seconds)
      if (remaining <= 120 && remaining > 0) {
        setShowWarning(true)
      }

      // Session expired
      if (remaining === 0) {
        clearInterval(interval)
        if (onSessionExpired) {
          onSessionExpired()
        } else {
          // Default behavior: redirect to queue
          alert('Your session has expired. Returning to queue.')
          router.push(`/events/${eventId}/queue?type=${registrationType}`)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentExpiresAt, eventId, registrationType, router, onSessionExpired])

  // Extend session
  const handleExtend = useCallback(async () => {
    if (extensionUsed || extending) return

    setExtending(true)

    try {
      const response = await fetch('/api/queue/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success && data.newExpiresAt) {
        setCurrentExpiresAt(new Date(data.newExpiresAt))
        setExtensionUsed(true)
        setShowWarning(false)
      } else {
        alert(data.error || 'Failed to extend session')
      }
    } catch (err) {
      console.error('Error extending session:', err)
      alert('Failed to extend session. Please try again.')
    } finally {
      setExtending(false)
    }
  }, [extensionUsed, extending])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  // Don't render if no time constraint (queue not enabled)
  if (!expiresAt) return null

  const isUrgent = showWarning || timeLeft <= 120
  const canExtend = extensionAllowed && !extensionUsed && timeLeft > 0

  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-lg shadow-lg border-2 p-4 transition-all ${
        isUrgent
          ? 'bg-red-50 border-red-400 animate-pulse'
          : 'bg-blue-50 border-[#1E3A5F]'
      }`}
    >
      <div className="flex items-center gap-3">
        {isUrgent ? (
          <AlertTriangle className="w-6 h-6 text-red-600" />
        ) : (
          <Clock className="w-6 h-6 text-[#1E3A5F]" />
        )}

        <div>
          <p className="text-sm font-medium text-[#1E3A5F]">Time Remaining</p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              isUrgent ? 'text-red-600' : 'text-[#1E3A5F]'
            }`}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        </div>
      </div>

      {isUrgent && canExtend && (
        <Button
          onClick={handleExtend}
          disabled={extending}
          size="sm"
          className="mt-3 w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
        >
          {extending ? (
            'Extending...'
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Extend Time (+5 min)
            </>
          )}
        </Button>
      )}

      {extensionUsed && (
        <p className="text-xs text-[#6B7280] mt-2 text-center">
          Extension used
        </p>
      )}
    </div>
  )
}
