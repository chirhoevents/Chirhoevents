'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Building2,
  User,
  Mail,
  Calendar,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'

interface Message {
  id: string
  message: string
  isFromAdmin: boolean
  createdAt: string
  user: {
    firstName: string
    lastName: string
    role?: string
  }
}

interface Ticket {
  id: string
  ticketNumber: number
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  issueUrl?: string
  organization: {
    id: string
    name: string
    contactEmail: string
    subscriptionTier: string
  }
  event?: {
    id: string
    name: string
    slug: string
  } | null
  submittedByUser: {
    firstName: string
    lastName: string
    email: string
  }
  assignedToUser?: {
    id: string
    firstName: string
    lastName: string
  }
  messages: Message[]
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  waiting_on_customer: { label: 'Waiting on Customer', color: 'bg-purple-100 text-purple-800', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
}

export default function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { getToken } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyMessage, setReplyMessage] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [copiedOrgId, setCopiedOrgId] = useState(false)
  const [copiedEventId, setCopiedEventId] = useState(false)

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

  useEffect(() => {
    fetchTicket()
  }, [])

  const fetchTicket = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/support-tickets/${resolvedParams.ticketId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch ticket')

      const data = await response.json()
      setTicket(data.ticket)
      setNewStatus(data.ticket.status)
    } catch (error) {
      console.error('Error fetching ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return

    setSending(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/support-tickets/${resolvedParams.ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: replyMessage,
          newStatus: newStatus !== ticket?.status ? newStatus : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to send reply')

      setReplyMessage('')
      fetchTicket() // Refresh ticket
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    setUpdating(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/support-tickets/${resolvedParams.ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      fetchTicket()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-purple-600 animate-pulse" />
          <span className="text-gray-600">Loading ticket...</span>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Ticket not found</p>
        <Link
          href="/dashboard/master-admin/support-tickets"
          className="text-purple-600 hover:underline mt-2 inline-block"
        >
          Back to tickets
        </Link>
      </div>
    )
  }

  const StatusIcon = statusConfig[ticket.status].icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/master-admin/support-tickets"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-500">#{ticket.ticketNumber}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[ticket.status].color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig[ticket.status].label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[ticket.priority].color}`}>
              {priorityConfig[ticket.priority].label}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Messages Thread */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Conversation</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 ${msg.isFromAdmin ? 'bg-purple-50' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      msg.isFromAdmin ? 'bg-purple-600' : 'bg-gray-400'
                    }`}>
                      {msg.user.firstName[0]}{msg.user.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {msg.user.firstName} {msg.user.lastName}
                        </span>
                        {msg.isFromAdmin && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            Support
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Send Reply</h3>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Set status to:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_customer">Waiting on Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <button
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || sending}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-6">
          {/* Organization Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </h3>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{ticket.organization.name}</p>
              <p className="text-sm text-gray-600">{ticket.organization.contactEmail}</p>
              <div className="flex items-center gap-1 mt-1">
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
                  {ticket.organization.id.slice(0, 8)}...
                </code>
                <button
                  onClick={() => copyToClipboard(ticket.organization.id, 'org')}
                  className="p-0.5 hover:bg-gray-100 rounded"
                  title="Copy full UUID"
                >
                  {copiedOrgId ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-400" />
                  )}
                </button>
              </div>
              <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                {ticket.organization.subscriptionTier.replace('_', ' ')}
              </span>
            </div>
            <Link
              href={`/dashboard/master-admin/organizations/${ticket.organization.id}`}
              className="block mt-3 text-sm text-purple-600 hover:underline"
            >
              View organization
            </Link>
          </div>

          {/* Event Info */}
          {ticket.event && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Related Event
              </h3>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{ticket.event.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
                    {ticket.event.id.slice(0, 8)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(ticket.event!.id, 'event')}
                    className="p-0.5 hover:bg-gray-100 rounded"
                    title="Copy full UUID"
                  >
                    {copiedEventId ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Issue URL */}
          {ticket.issueUrl && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Issue Page
              </h3>
              <p className="text-sm text-gray-700 font-mono break-all" title={ticket.issueUrl}>
                {ticket.issueUrl.replace(/^https?:\/\/[^\/]+/, '')}
              </p>
            </div>
          )}

          {/* Submitter Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Submitted By
            </h3>
            <p className="font-medium text-gray-900">
              {ticket.submittedByUser.firstName} {ticket.submittedByUser.lastName}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              {ticket.submittedByUser.email}
            </p>
          </div>

          {/* Ticket Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Ticket Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Category</dt>
                <dd className="font-medium text-gray-900 capitalize">{ticket.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Priority</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[ticket.priority].color}`}>
                    {priorityConfig[ticket.priority].label}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Created</dt>
                <dd className="text-gray-900">{formatDate(ticket.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Last Updated</dt>
                <dd className="text-gray-900">{formatDate(ticket.updatedAt)}</dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Resolved</dt>
                  <dd className="text-gray-900">{formatDate(ticket.resolvedAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {ticket.status !== 'resolved' && (
                <button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark Resolved
                </button>
              )}
              {ticket.status !== 'closed' && (
                <button
                  onClick={() => handleUpdateStatus('closed')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Close Ticket
                </button>
              )}
              {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                <button
                  onClick={() => handleUpdateStatus('open')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Reopen Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
