'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImpersonationData {
  organizationName: string
  isImpersonating: boolean
}

export function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null)
  const [exiting, setExiting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check impersonation status on mount
    checkImpersonationStatus()
  }, [])

  async function checkImpersonationStatus() {
    try {
      const response = await fetch('/api/admin/check-access')
      if (response.ok) {
        const data = await response.json()
        if (data.isImpersonating) {
          setImpersonationData({
            organizationName: data.organizationName,
            isImpersonating: true,
          })
        }
      }
    } catch (error) {
      console.error('Failed to check impersonation status:', error)
    }
  }

  async function exitImpersonation() {
    try {
      setExiting(true)
      const response = await fetch('/api/master-admin/exit-impersonation', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to master admin dashboard
        router.push(data.redirectUrl || '/dashboard/master-admin')
      } else {
        console.error('Failed to exit impersonation')
        setExiting(false)
      }
    } catch (error) {
      console.error('Exit impersonation error:', error)
      setExiting(false)
    }
  }

  if (!impersonationData?.isImpersonating) return null

  return (
    <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-lg z-[100] sticky top-0">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <span className="font-semibold">Master Admin Mode</span>
          <span className="mx-2">•</span>
          <span>Viewing as {impersonationData.organizationName}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={exitImpersonation}
        disabled={exiting}
        className="text-white hover:bg-orange-600 hover:text-white"
      >
        <X className="h-4 w-4 mr-2" />
        {exiting ? 'Exiting...' : 'Exit & Return to Master Admin'}
      </Button>
    </div>
  )
}
