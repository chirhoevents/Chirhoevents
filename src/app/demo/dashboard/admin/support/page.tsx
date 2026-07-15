'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Ticket,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'

interface SupportTicket {
  id: string
  ticketNumber: number
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'
  createdAt: string
  updatedAt: string
  submittedByUser: { firstName: string; lastName: string }
  event?: { id: string; name: string } | null
  _count: { messages: number }
}

const DEMO_TICKETS: SupportTicket[] = [
  {
    id: 't-1',
    ticketNumber: 1042,
    subject: 'Can we increase the group size limit for Summer Retreat?',
    category: 'billing',
    priority: 'medium',
    status: 'waiting_on_customer',
    createdAt: '2026-07-01T14:20:00Z',
    updatedAt: '2026-07-02T09:15:00Z',
    submittedByUser: { firstName: 'Demo', lastName: 'Admin' },
    event: { id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026' },
    _count: { messages: 3 },
  },
  {
    id: 't-2',
    ticketNumber: 1038,
    subject: 'Certificate upload failing for chaperones',
    category: 'technical',
    priority: 'high',
    status: 'in_progress',
    createdAt: '2026-06-28T10:00:00Z',
    updatedAt: '2026-06-29T16:44:00Z',
    submittedByUser: { firstName: 'Demo', lastName: 'Admin' },
    event: null,
    _count: { messages: 5 },
  },
  {
    id: 't-3',
    ticketNumber: 1029,
    subject: 'Custom question suggestion for medical intake',
    category: 'feature_request',
    priority: 'low',
    status: 'open',
    createdAt: '2026-06-15T11:22:00Z',
    updatedAt: '2026-06-15T11:22:00Z',
    submittedByUser: { firstName: 'Demo', lastName: 'Admin' },
    event: null,
    _count: { messages: 1 },
  },
  {
    id: 't-4',
    ticketNumber: 1015,
    subject: 'Refund processed for cancelled participant',
    category: 'billing',
    priority: 'medium',
    status: 'resolved',
    createdAt: '2026-05-30T09:00:00Z',
    updatedAt: '2026-06-01T14:30:00Z',
    submittedByUser: { firstName: 'Demo', lastName: 'Admin' },
    event: { id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026' },
    _count: { messages: 6 },
  },
]

const categoryLabels: Record<string, string> = {
  general: 'General',
  technical: 'Technical Issue',
  billing: 'Billing',
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
}

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  waiting_on_customer: { label: 'Waiting on You', color: 'bg-purple-100 text-purple-800', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
}

export default function SupportPage() {
  const [tickets] = useState<SupportTicket[]>(DEMO_TICKETS)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const openTickets = tickets.filter((t) => !['resolved', 'closed'].includes(t.status))
  const closedTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status))

  const handleNewTicket = () => {
    alert('Demo: Would open a form to submit a new support ticket. Ticket is created and support is notified.')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Support</h1>
          <p className="text-gray-600">Get help from the ChiRho Events team</p>
        </div>
        <button
          onClick={handleNewTicket}
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2A4A6F] transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Ticket
        </button>
      </div>

      {/* Quick Tip */}
      <div className="bg-[#F5F1E8] border border-[#9C8466]/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-[#1E3A5F] rounded-lg p-2 mt-0.5">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-[#1E3A5F]">Quick Tip: Need help on a specific page?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Click the <strong>+</strong> button in the top-right corner from anywhere in your dashboard to open a support ticket.
              This automatically captures which page you were on, making it easier for us to help you!
            </p>
            <p className="text-sm text-gray-500 mt-2">
              For general questions, you can create a ticket directly from this page.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-3xl font-bold text-[#1E3A5F]">{tickets.length}</p>
          <p className="text-sm text-gray-600">Total Tickets</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-3xl font-bold text-blue-600">{openTickets.length}</p>
          <p className="text-sm text-gray-600">Open</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-3xl font-bold text-purple-600">
            {tickets.filter((t) => t.status === 'waiting_on_customer').length}
          </p>
          <p className="text-sm text-gray-600">Waiting on You</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-3xl font-bold text-green-600">{closedTickets.length}</p>
          <p className="text-sm text-gray-600">Resolved</p>
        </div>
      </div>

      {/* Tickets needing attention */}
      {tickets.filter((t) => t.status === 'waiting_on_customer').length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-medium text-purple-800 mb-2">Tickets Waiting on You</h3>
          <p className="text-sm text-purple-600">
            You have {tickets.filter((t) => t.status === 'waiting_on_customer').length} ticket(s) waiting for your response.
          </p>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Your Tickets</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {tickets.map((ticket) => {
            const status = statusConfig[ticket.status]
            const StatusIcon = status.icon
            return (
              <Link
                key={ticket.id}
                href={`/demo/dashboard/admin/support/${ticket.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-gray-500">#{ticket.ticketNumber}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${status.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-medium text-[#1E3A5F] truncate">{ticket.subject}</h3>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>{categoryLabels[ticket.category] || ticket.category}</span>
                      {ticket.event && (
                        <>
                          <span>•</span>
                          <span>{ticket.event.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{ticket._count.messages} message{ticket._count.messages !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Updated {formatDate(ticket.updatedAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
