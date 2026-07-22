'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ticket, AlertCircle, CheckCircle, Clock, MessageSquare, Building2, ChevronRight } from 'lucide-react'

interface SupportTicket {
  id: string
  ticketNumber: number
  subject: string
  orgName: string
  submittedBy: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved'
  createdAt: string
  updatedAt: string
  messages: number
}

const TICKETS: SupportTicket[] = [
  { id: 't-1', ticketNumber: 1042, subject: 'Can we increase the group size limit for Summer Retreat?', orgName: 'Steubenville Ministries', submittedBy: 'Demo Admin', category: 'billing', priority: 'medium', status: 'waiting_on_customer', createdAt: '2026-07-01T14:20:00Z', updatedAt: '2026-07-02T09:15:00Z', messages: 3 },
  { id: 't-2', ticketNumber: 1041, subject: 'Certificate upload failing for chaperones', orgName: 'Archdiocese of Denver Youth', submittedBy: 'Sarah Adams', category: 'technical', priority: 'high', status: 'in_progress', createdAt: '2026-06-28T10:00:00Z', updatedAt: '2026-06-29T16:44:00Z', messages: 5 },
  { id: 't-3', ticketNumber: 1040, subject: 'Custom question suggestion for medical intake', orgName: 'St. Ignatius Retreat Center', submittedBy: 'Fr. Peter Ling', category: 'feature_request', priority: 'low', status: 'open', createdAt: '2026-06-15T11:22:00Z', updatedAt: '2026-06-15T11:22:00Z', messages: 1 },
  { id: 't-4', ticketNumber: 1039, subject: 'Refund processed for cancelled participant', orgName: 'Franciscan University Events', submittedBy: 'Mary Costello', category: 'billing', priority: 'medium', status: 'resolved', createdAt: '2026-05-30T09:00:00Z', updatedAt: '2026-06-01T14:30:00Z', messages: 6 },
  { id: 't-5', ticketNumber: 1038, subject: 'Stripe Connect onboarding stuck', orgName: 'Diocese of Sacramento', submittedBy: 'Bill Martinez', category: 'technical', priority: 'urgent', status: 'open', createdAt: '2026-07-07T08:12:00Z', updatedAt: '2026-07-07T08:12:00Z', messages: 1 },
]

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  waiting_on_customer: { label: 'Waiting on Customer', color: 'bg-purple-100 text-purple-800', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

export default function SupportTicketsPage() {
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent' | 'resolved'>('all')

  const filtered = TICKETS.filter((t) => {
    if (filter === 'open') return ['open', 'in_progress', 'waiting_on_customer'].includes(t.status)
    if (filter === 'urgent') return t.priority === 'urgent'
    if (filter === 'resolved') return t.status === 'resolved'
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">Support Tickets</h1>
        <p className="text-muted-foreground">Customer support queue across all organizations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p><p className="text-2xl font-bold text-navy">{TICKETS.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Open</p><p className="text-2xl font-bold text-blue-600">{TICKETS.filter((t) => ['open', 'in_progress', 'waiting_on_customer'].includes(t.status)).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Urgent</p><p className="text-2xl font-bold text-red-600">{TICKETS.filter((t) => t.priority === 'urgent').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-green-600">{TICKETS.filter((t) => t.status === 'resolved').length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {(['all', 'open', 'urgent', 'resolved'] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            className={filter === f ? 'bg-navy text-white' : ''}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {filtered.map((t) => {
              const status = statusConfig[t.status]
              const StatusIcon = status.icon
              return (
                <Link
                  key={t.id}
                  href={`/demo/dashboard/master-admin/support-tickets/${t.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-mono text-gray-500">#{t.ticketNumber}</span>
                        <Badge className={`${status.color} text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <span className={`text-xs font-medium ${priorityColors[t.priority]}`}>
                          {t.priority.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-medium text-navy truncate">{t.subject}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {t.orgName}
                        </span>
                        <span>{t.submittedBy}</span>
                        <span>{t.messages} message{t.messages !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
