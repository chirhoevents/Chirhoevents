'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Ticket,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  ChevronRight,
  Send,
  X,
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
  submittedByUser: {
    firstName: string
    lastName: string
  }
  _count: {
    messages: number
  }
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  waiting_on_customer: { label: 'Waiting on You', color: 'bg-purple-100 text-purple-800', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
}

const categories = [
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'account', label: 'Account Management' },
  { value: 'general', label: 'General Question' },
]

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New ticket form state
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/support-tickets')
      if (!response.ok) throw new Error('Failed to fetch tickets')

      const data = await response.json()
      setTickets(data.tickets)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, priority, message }),
      })

      if (!response.ok) throw new Error('Failed to create ticket')

      const data = await response.json()
      alert(`Ticket #${data.ticket.ticketNumber} created successfully!`)

      // Reset form and close modal
      setSubject('')
      setCategory('general')
      setPriority('medium')
      setMessage('')
      setShowNewTicket(false)

      // Refresh tickets
      fetchTickets()
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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

  const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status))
  const closedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6 text-[#1E3A5F] animate-pulse" />
          <span className="text-gray-600">Loading support tickets...</span>
        </div>
      </div>
    )
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
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2A4A6F] transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Ticket
        </button>
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
            {tickets.filter(t => t.status === 'waiting_on_customer').length}
          </p>
          <p className="text-sm text-gray-600">Waiting on You</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-3xl font-bold text-green-600">{closedTickets.length}</p>
          <p className="text-sm text-gray-600">Resolved</p>
        </div>
      </div>

      {/* Tickets needing attention */}
      {tickets.filter(t => t.status === 'waiting_on_customer').length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-medium text-purple-800 mb-2">Tickets Waiting on You</h3>
          <p className="text-sm text-purple-600">
            You have {tickets.filter(t => t.status === 'waiting_on_customer').length} ticket(s) waiting for your response.
          </p>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Your Tickets</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No support tickets yet</p>
            <button
              onClick={() => setShowNewTicket(true)}
              className="text-[#1E3A5F] hover:underline font-medium"
            >
              Create your first ticket
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status].icon
              return (
                <Link
                  key={ticket.id}
                  href={`/dashboard/admin/support/${ticket.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-gray-500">
                          #{ticket.ticketNumber}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[ticket.status].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[ticket.status].label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[ticket.priority].color}`}>
                          {priorityConfig[ticket.priority].label}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {ticket._count.messages} messages
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-500">
                        Updated {formatDate(ticket.updatedAt)}
                      </p>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Support Ticket</h2>
              <button
                onClick={() => setShowNewTicket(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  required
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !subject.trim() || !message.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2A4A6F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
