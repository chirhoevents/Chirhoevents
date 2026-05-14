'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export interface DuplicateCopyOptions {
  copyPricing: boolean
  copyCustomQuestions: boolean
  copyDayPassOptions: boolean
  copyBuildings: boolean
  copySmallGroups: boolean
  copyMealGroups: boolean
  copySeatingSections: boolean
  copySchedule: boolean
  copyMealTimes: boolean
  copyConfessions: boolean
  copyAdoration: boolean
  copyAnnouncements: boolean
  copyInfoItems: boolean
  copyResources: boolean
  copyNameTagTemplate: boolean
}

const DEFAULTS: DuplicateCopyOptions = {
  copyPricing: true,
  copyCustomQuestions: true,
  copyDayPassOptions: true,
  copyBuildings: true,
  copySmallGroups: true,
  copyMealGroups: true,
  copySeatingSections: true,
  copySchedule: true,
  copyMealTimes: true,
  copyConfessions: true,
  copyAdoration: true,
  copyAnnouncements: false,
  copyInfoItems: true,
  copyResources: true,
  copyNameTagTemplate: true,
}

interface Section {
  label: string
  description: string
  options: Array<{
    key: keyof DuplicateCopyOptions
    label: string
    hint?: string
  }>
}

const SECTIONS: Section[] = [
  {
    label: 'Registration & Pricing',
    description: 'Financial and form settings',
    options: [
      {
        key: 'copyPricing',
        label: 'Pricing',
        hint: 'Youth, chaperone, priest rates, deposits, deadlines',
      },
      {
        key: 'copyDayPassOptions',
        label: 'Day Pass Options',
        hint: 'Per-day capacity and pricing (dates shifted +1 year)',
      },
      {
        key: 'copyCustomQuestions',
        label: 'Custom Registration Questions',
        hint: 'Extra questions on the registration form',
      },
    ],
  },
  {
    label: 'POROS Housing',
    description: 'Venue layout and room structure',
    options: [
      {
        key: 'copyBuildings',
        label: 'Buildings & Rooms',
        hint: 'Full venue layout with room numbers, types, and capacities',
      },
      {
        key: 'copySmallGroups',
        label: 'Small Groups',
        hint: 'Group names, numbers, capacities, meeting info — SGL assignments cleared',
      },
      {
        key: 'copyMealGroups',
        label: 'Meal Groups & Colors',
        hint: 'Color-coded meal group structure and meal times',
      },
      {
        key: 'copySeatingSections',
        label: 'Seating Sections',
        hint: 'Auditorium/venue seating layout',
      },
    ],
  },
  {
    label: 'Program & Schedule',
    description: 'Event programming (dates shifted +1 year)',
    options: [
      {
        key: 'copySchedule',
        label: 'Event Schedule',
        hint: 'Session titles, times, and locations',
      },
      {
        key: 'copyMealTimes',
        label: 'Meal Times',
        hint: 'Breakfast, lunch, dinner time slots per day',
      },
      {
        key: 'copyConfessions',
        label: 'Confession Schedule',
        hint: 'Confession time slots and locations',
      },
      {
        key: 'copyAdoration',
        label: 'Adoration Schedule',
        hint: 'Adoration time slots and locations',
      },
    ],
  },
  {
    label: 'Portal Content',
    description: 'Public portal and participant-facing content',
    options: [
      {
        key: 'copyInfoItems',
        label: 'Info Items',
        hint: 'Informational cards shown in the public portal',
      },
      {
        key: 'copyResources',
        label: 'Resources',
        hint: 'Links, maps, PDFs shared with participants',
      },
      {
        key: 'copyAnnouncements',
        label: 'Announcements',
        hint: 'Existing announcements (usually left unchecked for a new event)',
      },
    ],
  },
  {
    label: 'SALVE Check-In',
    description: 'Name tag and check-in settings',
    options: [
      {
        key: 'copyNameTagTemplate',
        label: 'Name Tag Template',
        hint: 'Tag design, colors, and which fields to display',
      },
    ],
  },
]

interface DuplicateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventName: string
  onConfirm: (options: DuplicateCopyOptions) => Promise<void>
}

export function DuplicateEventModal({
  open,
  onOpenChange,
  eventName,
  onConfirm,
}: DuplicateEventModalProps) {
  const [options, setOptions] = useState<DuplicateCopyOptions>(DEFAULTS)
  const [loading, setLoading] = useState(false)

  const toggle = (key: keyof DuplicateCopyOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(options)
    } finally {
      setLoading(false)
      setOptions(DEFAULTS)
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!loading) {
      if (!value) setOptions(DEFAULTS)
      onOpenChange(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplicate Event</DialogTitle>
          <DialogDescription>
            Duplicating <strong>&ldquo;{eventName}&rdquo;</strong>. The new event will be
            created as a draft with all dates shifted one year forward. Choose
            what to carry over.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Always-included note */}
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <strong>Always included:</strong> event name, dates, location,
            capacity, timezone, and all feature toggles (POROS, SALVE, RAPHA,
            etc.).
          </div>

          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-sm font-semibold text-[#1E3A5F] mb-1">
                {section.label}
              </p>
              <p className="text-xs text-[#6B7280] mb-2">{section.description}</p>
              <div className="space-y-2 pl-1">
                {section.options.map(({ key, label, hint }) => (
                  <div key={key} className="flex items-start gap-3">
                    <Checkbox
                      id={key}
                      checked={options[key]}
                      onCheckedChange={() => toggle(key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={key}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {label}
                      </Label>
                      {hint && (
                        <p className="text-xs text-[#6B7280]">{hint}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Duplicating…
              </>
            ) : (
              'Duplicate Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
