'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { format } from 'date-fns'
import { AlertCircle, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  claimPopupSlot,
  releasePopupSlot,
  POPUP_PRIORITY,
} from '@/lib/popup-queue'

interface OverdueInvoice {
  id: string
  invoiceNumber: number
  invoiceType: string
  amount: number
  description: string | null
  dueDate: string
  status: string
  paymentLink: string
}

const SESSION_KEY = 'overdueInvoicesShown'
const POPUP_NAME = 'overdueInvoices'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diff = now.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export default function OverdueInvoicesModal() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') {
      return
    }

    const fetchOverdue = async () => {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch('/api/admin/overdue-invoices', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.invoices && data.invoices.length > 0) {
          // Highest-priority popup — preempts capacity warning, etc.
          claimPopupSlot(POPUP_NAME, POPUP_PRIORITY.OVERDUE_INVOICES)
          setInvoices(data.invoices)
          setOpen(true)
          sessionStorage.setItem(SESSION_KEY, '1')
        }
      } catch (err) {
        console.error('Failed to fetch overdue invoices:', err)
      }
    }

    fetchOverdue()
  }, [isLoaded, isSignedIn, getToken])

  const totalDue = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      releasePopupSlot(POPUP_NAME)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {invoices.length === 1 ? 'Past Due Invoice' : 'Past Due Invoices'}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-600">
                {invoices.length === 1
                  ? 'You have an invoice that is past due. Please pay it to keep your account in good standing.'
                  : `You have ${invoices.length} invoices that are past due totaling ${formatCurrency(totalDue)}.`}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {invoices.map((invoice) => {
            const overdueDays = daysOverdue(invoice.dueDate)
            return (
              <div
                key={invoice.id}
                className="border border-red-200 bg-red-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        Invoice #{invoice.invoiceNumber}
                      </span>
                      <Badge className="bg-gray-100 text-gray-800 capitalize">
                        {invoice.invoiceType.replace('_', ' ')}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800">
                        {overdueDays === 0
                          ? 'Due today'
                          : `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`}
                      </Badge>
                    </div>
                    {invoice.description && (
                      <p className="mt-1 text-sm text-gray-600 truncate">
                        {invoice.description}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-600">
                      Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    onClick={() => window.open(invoice.paymentLink, '_blank')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Questions? Contact support@chirhoevents.com
          </p>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Remind me later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
