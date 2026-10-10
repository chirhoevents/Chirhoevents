'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Calendar, Sun } from 'lucide-react'

/**
 * "Events | Lux" switch shown in the header for orgs that have both
 * dashboards. Remembers the choice so the next sign-in opens the same one.
 */
export default function DashboardSwitcher({ current }: { current: 'events' | 'lux' }) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [switching, setSwitching] = useState(false)

  const go = async (target: 'events' | 'lux') => {
    if (target === current || switching) return
    setSwitching(true)
    try {
      const token = await getToken()
      await fetch('/api/user/last-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ dashboard: target }),
      })
    } catch {
      // Remembering the choice is a convenience; switch anyway
    }
    router.push(target === 'lux' ? '/dashboard/lux' : '/dashboard/admin')
  }

  const base = 'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors'
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1" role="tablist" aria-label="Switch dashboard">
      <button
        type="button"
        role="tab"
        aria-selected={current === 'events'}
        onClick={() => go('events')}
        disabled={switching}
        className={`${base} ${current === 'events' ? 'bg-white shadow-sm text-[#1E3A5F] font-medium' : 'text-gray-600 hover:text-[#1E3A5F]'}`}
      >
        <Calendar className="h-4 w-4" />
        Events
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === 'lux'}
        onClick={() => go('lux')}
        disabled={switching}
        className={`${base} ${current === 'lux' ? 'bg-white shadow-sm text-[#1E3A5F] font-medium' : 'text-gray-600 hover:text-[#1E3A5F]'}`}
      >
        <Sun className="h-4 w-4" />
        Lux
      </button>
    </div>
  )
}
