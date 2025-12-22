'use client'

import { Button } from '@/components/ui/button'
import { Mail, Download, DollarSign, AlertTriangle, X } from 'lucide-react'

interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onEmailSelected: () => void
  onApplyLateFee: () => void
  onExportSelected: () => void
  onMarkPayments: () => void
  isExporting: boolean
}

export default function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onEmailSelected,
  onApplyLateFee,
  onExportSelected,
  onMarkPayments,
  isExporting,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="sticky top-0 z-10 bg-[#1E3A5F] text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="font-medium">
          {selectedCount} registration{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onEmailSelected}
          className="bg-white text-[#1E3A5F] hover:bg-gray-100"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email Selected
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onMarkPayments}
          className="bg-white text-[#1E3A5F] hover:bg-gray-100"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Mark Payments
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onApplyLateFee}
          className="bg-white text-[#1E3A5F] hover:bg-gray-100"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Apply Late Fee
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onExportSelected}
          disabled={isExporting}
          className="bg-white text-[#1E3A5F] hover:bg-gray-100"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Selected'}
        </Button>
      </div>
    </div>
  )
}
