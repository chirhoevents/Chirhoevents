'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, LogOut } from 'lucide-react'

interface ImpersonationBannerProps {
  organizationName: string
  organizationId: string
}

export default function ImpersonationBanner({
  organizationName,
  organizationId,
}: ImpersonationBannerProps) {
  const [isExiting, setIsExiting] = useState(false)

  const handleExitImpersonation = async () => {
    setIsExiting(true)
    try {
      const response = await fetch('/api/admin/impersonation-status', {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.redirectUrl || '/dashboard/master-admin'
      } else {
        console.error('Failed to exit impersonation')
        setIsExiting(false)
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error)
      setIsExiting(false)
    }
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Master Admin Mode</span>
            <span className="hidden sm:inline"> — Viewing as </span>
            <span className="hidden sm:inline font-bold">{organizationName}</span>
            <span className="sm:hidden font-bold ml-1">{organizationName}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitImpersonation}
          disabled={isExiting}
          className="text-white hover:bg-orange-600 hover:text-white gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isExiting ? 'Exiting...' : 'Exit to Master Admin'}
          </span>
          <span className="sm:hidden">
            {isExiting ? '...' : 'Exit'}
          </span>
        </Button>
      </div>
    </div>
  )
}
