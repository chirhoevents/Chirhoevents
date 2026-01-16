'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface RegistrationLimitModalProps {
  isOpen: boolean
  onClose: () => void
  registrationsUsed: number
  registrationsLimit: number
  currentTier: string
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  parish: 'Parish',
  cathedral: 'Cathedral',
  shrine: 'Shrine',
  basilica: 'Basilica',
  // Legacy tier names for backward compatibility
  small_diocese: 'Parish',
  growing: 'Cathedral',
  conference: 'Shrine',
  enterprise: 'Basilica',
  test: 'Test',
}

export default function RegistrationLimitModal({
  isOpen,
  onClose,
  registrationsUsed,
  registrationsLimit,
  currentTier,
}: RegistrationLimitModalProps) {
  const percentUsed = registrationsLimit > 0
    ? Math.round((registrationsUsed / registrationsLimit) * 100)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl text-[#1E3A5F]">
              Registration Limit Reached
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            <div className="space-y-4 mt-4">
              <p className="text-gray-700">
                You&apos;ve reached <span className="font-semibold text-amber-600">{percentUsed}%</span> of
                your registration limit on your{' '}
                <span className="font-semibold">{tierLabels[currentTier] || currentTier}</span> plan.
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Registrations Used</span>
                  <span className="font-semibold text-[#1E3A5F]">
                    {registrationsUsed.toLocaleString()} / {registrationsLimit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Upgrade to ensure uninterrupted service
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Consider upgrading your plan to increase your registration limit and avoid any potential issues with your upcoming events.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Remind Me Later
          </Button>
          <Link href="/dashboard/admin/settings?tab=billing">
            <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              View Billing Options
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
