'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface RegistrationAcknowledgmentModalProps {
  open: boolean
  title: string
  items: string[]
  onConfirm: () => void
  onCancel: () => void
}

export default function RegistrationAcknowledgmentModal({
  open,
  title,
  items,
  onConfirm,
  onCancel,
}: RegistrationAcknowledgmentModalProps) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false))

  // Reset the checkboxes every time the modal is (re)opened, so a group leader
  // can't carry over a stale all-checked state from a previous open.
  useEffect(() => {
    if (open) {
      setChecked(items.map(() => false))
    }
  }, [open, items])

  const allChecked = items.length > 0 && checked.every(Boolean)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1E3A5F]">{title}</DialogTitle>
          <DialogDescription className="pt-2">
            Please read and check off each item below before continuing to register.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3 max-h-[50vh] overflow-y-auto">
          {items.map((item, index) => (
            <label
              key={index}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
            >
              <Checkbox
                checked={checked[index] ?? false}
                onCheckedChange={(value) =>
                  setChecked((prev) => {
                    const next = [...prev]
                    next[index] = value
                    return next
                  })
                }
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!allChecked}
            className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white disabled:opacity-50"
          >
            Continue to Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
