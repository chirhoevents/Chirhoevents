'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TrendingUp, CheckCircle, Loader2 } from 'lucide-react'

interface UpgradeRequestModalProps {
  isOpen: boolean
  onClose: () => void
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

const nextTierSuggestions: Record<string, string> = {
  starter: 'Parish or Cathedral',
  parish: 'Cathedral or Shrine',
  cathedral: 'Shrine',
  shrine: 'Basilica',
  basilica: 'Basilica (custom)',
  // Legacy tier names for backward compatibility
  small_diocese: 'Cathedral or Shrine',
  growing: 'Shrine',
  conference: 'Basilica',
  enterprise: 'Basilica (custom)',
  test: 'Starter',
}

export default function UpgradeRequestModal({
  isOpen,
  onClose,
  currentTier,
}: UpgradeRequestModalProps) {
  const { getToken } = useAuth()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: `Upgrade Request - Currently on ${tierLabels[currentTier] || currentTier} plan`,
          category: 'billing',
          priority: 'medium',
          message: message.trim() || `I would like to upgrade my subscription from the ${tierLabels[currentTier] || currentTier} plan. Please contact me to discuss upgrade options.`,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setSubmitted(false)
    setError(null)
    onClose()
  }

  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl text-[#1E3A5F] mb-2">
              Request Submitted
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Thank you for your interest in upgrading! Our team will review your request and contact you shortly to discuss your options.
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl text-[#1E3A5F]">
              Request Plan Upgrade
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            <div className="space-y-4 mt-4">
              <p className="text-gray-700">
                You&apos;re currently on the{' '}
                <span className="font-semibold">{tierLabels[currentTier] || currentTier}</span> plan.
                {nextTierSuggestions[currentTier] && (
                  <> Consider upgrading to <span className="font-semibold">{nextTierSuggestions[currentTier]}</span> for increased limits and features.</>
                )}
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional notes (optional)
                </label>
                <Textarea
                  placeholder="Tell us about your needs, expected growth, or any questions about our plans..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-gray-500">
                Our team will reach out within 1-2 business days to discuss your upgrade options and answer any questions.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
