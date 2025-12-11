'use client'

import { useState, useEffect } from 'react'
import { getTimeRemaining } from '@/lib/registration-status'

interface CountdownTimerProps {
  targetDate: Date
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

interface TimeUnit {
  value: number
  label: string
  singularLabel: string
}

export default function CountdownTimer({
  targetDate,
  label,
  size = 'lg',
  showLabels = true,
  className = '',
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(targetDate))
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    const interval = setInterval(() => {
      const remaining = getTimeRemaining(targetDate)
      setTimeRemaining(remaining)

      // Stop countdown when it reaches zero
      if (remaining.total <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return null
  }

  const { days, hours, minutes, seconds, total } = timeRemaining

  // Determine if we should show urgent styling
  const hoursRemaining = total / (1000 * 60 * 60)
  const isVeryUrgent = hoursRemaining <= 1
  const isUrgent = hoursRemaining <= 24

  const timeUnits: TimeUnit[] = [
    { value: days, label: 'Days', singularLabel: 'Day' },
    { value: hours, label: 'Hours', singularLabel: 'Hour' },
    { value: minutes, label: 'Minutes', singularLabel: 'Minute' },
    { value: seconds, label: 'Seconds', singularLabel: 'Second' },
  ]

  // Size classes
  const sizeClasses = {
    sm: {
      number: 'text-3xl md:text-4xl',
      label: 'text-xs',
      container: 'gap-2 md:gap-4',
      unit: 'min-w-[60px] md:min-w-[80px]',
    },
    md: {
      number: 'text-4xl md:text-5xl',
      label: 'text-sm',
      container: 'gap-3 md:gap-6',
      unit: 'min-w-[80px] md:min-w-[100px]',
    },
    lg: {
      number: 'text-5xl md:text-6xl lg:text-7xl',
      label: 'text-sm md:text-base',
      container: 'gap-4 md:gap-8',
      unit: 'min-w-[100px] md:min-w-[120px]',
    },
  }

  const currentSize = sizeClasses[size]

  // Color classes based on urgency
  const numberColor = isVeryUrgent
    ? 'text-red-600'
    : isUrgent
    ? 'text-orange-600'
    : 'text-[#1E3A5F]'

  const labelColor = isVeryUrgent
    ? 'text-red-500'
    : isUrgent
    ? 'text-orange-500'
    : 'text-[#9C8466]'

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <h3
          className={`text-center font-semibold mb-4 ${
            size === 'lg' ? 'text-xl md:text-2xl' : size === 'md' ? 'text-lg md:text-xl' : 'text-base'
          } ${numberColor}`}
        >
          {label}
        </h3>
      )}

      <div
        className={`flex flex-wrap justify-center items-center ${currentSize.container} ${
          isUrgent ? 'animate-pulse' : ''
        }`}
      >
        {timeUnits.map((unit, index) => (
          <div
            key={unit.label}
            className={`flex flex-col items-center ${currentSize.unit}`}
          >
            <div
              className={`font-bold tabular-nums ${currentSize.number} ${numberColor} transition-colors duration-300`}
            >
              {String(unit.value).padStart(2, '0')}
            </div>
            {showLabels && (
              <div
                className={`font-medium uppercase tracking-wide ${currentSize.label} ${labelColor} transition-colors duration-300`}
              >
                {unit.value === 1 ? unit.singularLabel : unit.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {total <= 0 && (
        <div className="text-center mt-4 text-lg font-semibold text-[#1E3A5F]">
          Registration is now open!
        </div>
      )}
    </div>
  )
}
