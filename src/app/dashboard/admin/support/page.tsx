'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Calendar,
  FileText,
  CreditCard,
  Settings,
  HelpCircle,
  Lightbulb,
  Users,
  Copy,
  Check,
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
  event?: {
    id: string
    name: string
  } | null
  _count: {
    messages: number
  }
}

interface Event {
  id: string
  name: string
  slug: string
  startDate: string
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
  { value: 'registration', label: 'Registration Issues', icon: Users, description: 'Problems with event registrations' },
  { value: 'reports', label: 'Reports & Data', icon: FileText, description: 'Help with reports, exports, or data' },
  { value: 'billing', label: 'Billing & Payments', icon: CreditCard, description: 'Payment processing, invoices, refunds' },
  { value: 'technical', label: 'Technical Issue', icon: Settings, description: 'Bugs, errors, or system problems' },
  { value: 'event_setup', label: 'Event Setup', icon: Calendar, description: 'Creating or configuring events' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, description: 'Suggest new features or improvements' },
  { value: 'general', label: 'General Question', icon: HelpCircle, description: 'Other questions or help' },
]

export default function SupportPage() {
  const pathname = usePathname()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copiedOrgId, setCopiedOrgId] = useState(false)
  const [copiedEventId, setCopiedEventId] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // New ticket form state
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [message, setMessage] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [issueUrl, setIssueUrl] = useState('')

  useEffect(() => {
    fetchTickets()
    fetchEvents()
  }, [])

  // Capture current URL when modal opens
  useEffect(() => {
    if (showNewTicket && typeof window !== 'undefined') {
      setIssueUrl(window.location.href)
    }
  }, [showNewTicket])

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

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (!response.ok) throw new Error('Failed to fetch events')

      const data = await response.json()
      setEvents(data.events || [])
      // Also get the organization ID from the first event or from org endpoint
      if (data.events?.length > 0 && data.events[0].organizationId) {
        setOrganizationId(data.events[0].organizationId)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchOrganizationId = async () => {
    try {
      const response = await fetch('/api/organization')
      if (response.ok) {
        const data = await response.json()
        if (data.organization?.id) {
          setOrganizationId(data.organization.id)
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  const copyToClipboard = async (text: string, type: 'org' | 'event') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'org') {
        setCopiedOrgId(true)
        setTimeout(() => setCopiedOrgId(false), 2000)
      } else {
        setCopiedEventId(true)
        setTimeout(() => setCopiedEventId(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
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
        body: JSON.stringify({
          subject,
          category,
          priority,
          message,
          eventId: selectedEventId || undefined,
          issueUrl: issueUrl || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to create ticket')

      const data = await response.json()
      alert(`Ticket #${data.ticket.ticketNumber} created successfully!`)

      // Reset form and close modal
      setSubject('')
      setCategory('general')
      setPriority('medium')
      setMessage('')
      setSelectedEventId('')
      setIssueUrl('')
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
                        {ticket.event && (
                          <span className="flex items-center gap-1 text-[#1E3A5F]">
                            <Calendar className="h-4 w-4" />
                            {ticket.event.name}
                          </span>
                        )}
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              {/* What type of help do you need? - Category Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you need help with?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                          category === cat.value
                            ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${category === cat.value ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium text-sm">{cat.label}</p>
                          <p className="text-xs text-gray-500">{cat.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Related Event Selector */}
              {events.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Event (optional)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  >
                    <option value="">No specific event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select an event if your issue is related to a specific event
                  </p>
                </div>
              )}

              {/* Context Info Display */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Ticket Context (auto-captured)
                </p>
                {organizationId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Organization ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white px-2 py-1 rounded border font-mono text-gray-700">
                        {organizationId.slice(0, 8)}...
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(organizationId, 'org')}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Copy full UUID"
                      >
                        {copiedOrgId ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {selectedEventId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Event ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white px-2 py-1 rounded border font-mono text-gray-700">
                        {selectedEventId.slice(0, 8)}...
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedEventId, 'event')}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Copy full UUID"
                      >
                        {copiedEventId ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {issueUrl && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Page:</span>
                    <code className="text-xs bg-white px-2 py-1 rounded border font-mono text-gray-700 truncate max-w-[200px]">
                      {issueUrl.replace(/^https?:\/\/[^\/]+/, '')}
                    </code>
                  </div>
                )}
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700 border-gray-300' },
                    { value: 'medium', label: 'Medium', color: 'bg-blue-50 text-blue-700 border-blue-300' },
                    { value: 'high', label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-300' },
                    { value: 'urgent', label: 'Urgent', color: 'bg-red-50 text-red-700 border-red-300' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        priority === p.value
                          ? `${p.color} ring-2 ring-offset-1 ring-[#1E3A5F]`
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe your issue *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue in detail. Include any error messages, steps you've tried, and what you expected to happen..."
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
