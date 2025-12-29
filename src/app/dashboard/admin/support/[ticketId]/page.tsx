'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from 'lucide-react'

interface Message {
  id: string
  message: string
  isFromAdmin: boolean
  createdAt: string
  user: {
    firstName: string
    lastName: string
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
  submittedByUser: {
    firstName: string
    lastName: string
    email: string
  }
  messages: Message[]
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

export default function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const resolvedParams = use(params)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyMessage, setReplyMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchTicket()
  }, [])

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/support-tickets/${resolvedParams.ticketId}`)
      if (!response.ok) throw new Error('Failed to fetch ticket')

      const data = await response.json()
      setTicket(data.ticket)
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
      const response = await fetch(`/api/support-tickets/${resolvedParams.ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-[#1E3A5F] animate-pulse" />
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
          href="/dashboard/admin/support"
          className="text-[#1E3A5F] hover:underline mt-2 inline-block"
        >
          Back to support
        </Link>
      </div>
    )
  }

  const StatusIcon = statusConfig[ticket.status].icon
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/support"
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
          <h1 className="text-xl font-bold text-[#1E3A5F] mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Waiting on you banner */}
          {ticket.status === 'waiting_on_customer' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-purple-800 font-medium">
                The support team is waiting for your response.
              </p>
              <p className="text-sm text-purple-600 mt-1">
                Please reply to this ticket to continue the conversation.
              </p>
            </div>
          )}

          {/* Messages Thread */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Conversation</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 ${msg.isFromAdmin ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      msg.isFromAdmin ? 'bg-[#1E3A5F]' : 'bg-gray-400'
                    }`}>
                      {msg.user.firstName[0]}{msg.user.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {msg.user.firstName} {msg.user.lastName}
                        </span>
                        {msg.isFromAdmin && (
                          <span className="text-xs bg-[#1E3A5F] text-white px-1.5 py-0.5 rounded">
                            ChiRho Support
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
          {!isClosed ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Send Reply</h3>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || sending}
                  className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2A4A6F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">This ticket has been {ticket.status}.</p>
              <p className="text-sm text-gray-500 mt-1">
                If you need further assistance, please create a new ticket.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-6">
          {/* Ticket Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Ticket Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Ticket #</dt>
                <dd className="font-mono text-gray-900">{ticket.ticketNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Category</dt>
                <dd className="font-medium text-gray-900 capitalize">{ticket.category.replace('_', ' ')}</dd>
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
                <dt className="text-gray-600">Status</dt>
                <dd>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[ticket.status].color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig[ticket.status].label}
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

          {/* Help */}
          <div className="bg-[#F5F1E8] rounded-lg p-4">
            <h3 className="font-medium text-[#1E3A5F] mb-2">Need immediate help?</h3>
            <p className="text-sm text-gray-600">
              For urgent issues, please mark your ticket as &quot;Urgent&quot; priority or contact us at support@chirhoevents.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
