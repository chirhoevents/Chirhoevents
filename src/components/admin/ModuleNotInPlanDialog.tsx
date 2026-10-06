'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import UpgradeRequestModal from '@/components/admin/UpgradeRequestModal'
import { MODULE_LABELS, moduleNotInPlanMessage, tierHasFeature, type ModuleKey } from '@/lib/subscription-tiers'

interface ModuleNotInPlanDialogProps {
  module: ModuleKey | null
  subscriptionTier: string
  onClose: () => void
}

/**
 * Shown when an admin tries to switch on a module (e.g. SALVE or Rapha) that
 * their organization's plan doesn't include. The toggle stays off.
 */
export default function ModuleNotInPlanDialog({
  module,
  subscriptionTier,
  onClose,
}: ModuleNotInPlanDialogProps) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  // Plan includes it but it was switched off for this org: nothing to upgrade
  const switchedOffForOrg = module !== null && tierHasFeature(subscriptionTier, module)

  return (
    <>
      <Dialog open={module !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          {module && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Lock className="h-6 w-6 text-amber-600" />
                  </div>
                  <DialogTitle className="text-xl text-[#1E3A5F]">
                    {switchedOffForOrg ? `${MODULE_LABELS[module]} is turned off` : `${MODULE_LABELS[module]} isn't in your plan`}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-gray-600">
                  {moduleNotInPlanMessage(module, subscriptionTier)}
                  {!switchedOffForOrg && ' Upgrade your plan to turn it on for this event.'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={onClose}>
                  OK
                </Button>
                {!switchedOffForOrg && (
                  <Button
                    onClick={() => {
                      onClose()
                      setShowUpgrade(true)
                    }}
                    className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                  >
                    Request an Upgrade
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <UpgradeRequestModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentTier={subscriptionTier}
      />
    </>
  )
}
