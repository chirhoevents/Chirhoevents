'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Building2, Mail, Phone, Check, X, Clock } from 'lucide-react'

interface Request {
  id: string
  orgName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  denomination: string
  estimatedEventsPerYear: number
  requestedTier: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string
}

const INITIAL: Request[] = [
  {
    id: 'req-1', orgName: 'Sacred Heart Diocese', contactName: 'Deacon James Miller',
    contactEmail: 'jmiller@sacredheart.example', contactPhone: '555-0801',
    denomination: 'Catholic (Diocese)', estimatedEventsPerYear: 6,
    requestedTier: 'Professional', submittedAt: '2026-07-05T09:22:00Z',
    status: 'pending', notes: 'Youth department manages 4 major events plus 2 retreats/year',
  },
  {
    id: 'req-2', orgName: 'St. Thomas Aquinas Parish', contactName: 'Fr. Robert Chen',
    contactEmail: 'frobert@sta.example', contactPhone: '555-0802',
    denomination: 'Catholic (Parish)', estimatedEventsPerYear: 2,
    requestedTier: 'Starter', submittedAt: '2026-07-06T14:15:00Z',
    status: 'pending', notes: 'Small parish, primarily confirmation retreat + summer youth week',
  },
]

const statusInfo: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Awaiting review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: X },
}

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<Request[]>(INITIAL)

  const decide = (id: string, decision: 'approved' | 'rejected') => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: decision } : r)))
  }

  const pending = requests.filter((r) => r.status === 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">Pending Onboarding Requests</h1>
        <p className="text-muted-foreground">
          {pending.length} awaiting review · {requests.length} total this month
        </p>
      </div>

      <div className="space-y-4">
        {requests.map((r) => {
          const info = statusInfo[r.status]
          const Icon = info.icon
          return (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-[#9C8466]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-[#9C8466]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-navy">{r.orgName}</h3>
                        <Badge className={info.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {info.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.denomination} · Requested tier: <strong>{r.requestedTier}</strong> · ~{r.estimatedEventsPerYear} events/year
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                        <span>{r.contactName}</span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {r.contactEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {r.contactPhone}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <strong>Notes:</strong> {r.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => decide(r.id, 'approved')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => decide(r.id, 'rejected')}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
