'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Mail,
  Inbox,
  Send,
  Search,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Ticket,
  ExternalLink,
  Reply,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface ReceivedEmail {
  id: string
  resendEmailId: string
  fromAddress: string
  toAddresses: string[]
  subject: string | null
  textBody: string | null
  htmlBody: string | null
  processed: boolean
  processedAt: string | null
  createdAt: string
  inboundTicket?: {
    id: string
    ticketNumber: number
    status: string
  } | null
}

interface SentEmail {
  id: string
  organizationId: string
  recipientEmail: string
  recipientName: string | null
  emailType: string
  subject: string
  htmlContent: string
  sentAt: string
  sentStatus: 'sent' | 'failed' | 'bounced'
  errorMessage: string | null
}

interface ReceivedCounts {
  total: number
  processed: number
  unprocessed: number
}

interface SentCounts {
  total: number
  sent: number
  failed: number
  bounced: number
}

export default function EmailsPage() {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([])
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [receivedCounts, setReceivedCounts] = useState<ReceivedCounts>({ total: 0, processed: 0, unprocessed: 0 })
  const [sentCounts, setSentCounts] = useState<SentCounts>({ total: 0, sent: 0, failed: 0, bounced: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | SentEmail | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [replyMode, setReplyMode] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    fetchEmails()
  }, [activeTab, page])

  const fetchEmails = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        type: activeTab,
        page: page.toString(),
        limit: '50',
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/master-admin/emails?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (!response.ok) throw new Error('Failed to fetch emails')

      const data = await response.json()

      if (activeTab === 'received') {
        setReceivedEmails(data.emails)
        setReceivedCounts(data.counts)
      } else {
        setSentEmails(data.emails)
        setSentCounts(data.counts)
      }

      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchEmails()
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const openEmailPreview = (email: ReceivedEmail | SentEmail) => {
    setSelectedEmail(email)
    setViewModalOpen(true)
    setReplyMode(false)
    setReplyMessage('')
  }

  const closeModal = () => {
    setViewModalOpen(false)
    setReplyMode(false)
    setReplyMessage('')
    setSelectedEmail(null)
  }

  const sendReply = async () => {
    if (!selectedEmail || !('fromAddress' in selectedEmail) || !replyMessage.trim()) return

    setSendingReply(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/emails/received/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: replyMessage,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reply')
      }

      // Success - close modal and show success
      alert('Reply sent successfully!')
      closeModal()
      fetchEmails() // Refresh to show the sent reply
    } catch (error) {
      console.error('Error sending reply:', error)
      alert(error instanceof Error ? error.message : 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const statusConfig = {
    sent: { label: 'Sent', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
    bounced: { label: 'Bounced', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  }

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-purple-600 animate-pulse" />
          <span className="text-gray-600">Loading emails...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
        <p className="text-gray-600">View all incoming and outgoing emails processed through Resend</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('received'); setPage(1); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'received'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Received
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
              activeTab === 'received' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {receivedCounts.total}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('sent'); setPage(1); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'sent'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Send className="h-4 w-4" />
            Sent
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
              activeTab === 'sent' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {sentCounts.total}
            </span>
          </button>
        </nav>
      </div>

      {/* Stats Cards */}
      {activeTab === 'received' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Inbox className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{receivedCounts.total}</p>
                <p className="text-sm text-gray-600">Total Received</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{receivedCounts.processed}</p>
                <p className="text-sm text-gray-600">Processed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{receivedCounts.unprocessed}</p>
                <p className="text-sm text-gray-600">Unprocessed</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sentCounts.total}</p>
                <p className="text-sm text-gray-600">Total Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sentCounts.sent}</p>
                <p className="text-sm text-gray-600">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sentCounts.failed}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sentCounts.bounced}</p>
                <p className="text-sm text-gray-600">Bounced</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'received' ? 'Search by sender or subject...' : 'Search by recipient, subject, or name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Email List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2 animate-pulse" />
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (activeTab === 'received' ? receivedEmails : sentEmails).length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No emails found</p>
          </div>
        ) : activeTab === 'received' ? (
          <div className="divide-y divide-gray-200">
            {receivedEmails.map((email) => (
              <div
                key={email.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => openEmailPreview(email)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        email.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {email.processed ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Processed
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Pending
                          </>
                        )}
                      </span>
                      {email.inboundTicket && (
                        <Link
                          href={`/dashboard/master-admin/support-tickets/${email.inboundTicket.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Ticket className="h-3 w-3" />
                          Ticket #{email.inboundTicket.ticketNumber}
                        </Link>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      From: {email.fromAddress}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      To: {email.toAddresses.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(email.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEmailPreview(email); }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sentEmails.map((email) => {
              const StatusIcon = statusConfig[email.sentStatus].icon
              return (
                <div
                  key={email.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openEmailPreview(email)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[email.sentStatus].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[email.sentStatus].label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {email.emailType}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 truncate">
                        {email.subject}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        To: {email.recipientName ? `${email.recipientName} <${email.recipientEmail}>` : email.recipientEmail}
                      </p>
                      {email.errorMessage && (
                        <p className="text-sm text-red-600 truncate mt-1">
                          Error: {email.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{formatDate(email.sentAt)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEmailPreview(email); }}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {viewModalOpen && selectedEmail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeModal}
            />

            <div className="relative inline-block w-full max-w-4xl p-6 my-8 text-left align-middle bg-white rounded-xl shadow-xl transform transition-all">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {replyMode ? 'Reply to Email' : ('fromAddress' in selectedEmail ? 'Received Email' : 'Sent Email')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {'fromAddress' in selectedEmail
                      ? `From: ${selectedEmail.fromAddress}`
                      : `To: ${selectedEmail.recipientEmail}`
                    }
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Email Details */}
              <div className="border-b border-gray-200 pb-4 mb-4 space-y-2">
                {'fromAddress' in selectedEmail ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">From:</span>
                      <span className="text-gray-900">{selectedEmail.fromAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">To:</span>
                      <span className="text-gray-900">{selectedEmail.toAddresses.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Subject:</span>
                      <span className="text-gray-900">{selectedEmail.subject || '(No subject)'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Received:</span>
                      <span className="text-gray-900">{new Date(selectedEmail.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Status:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedEmail.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedEmail.processed ? 'Processed' : 'Pending'}
                      </span>
                    </div>
                    {selectedEmail.inboundTicket && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700 w-20">Ticket:</span>
                        <Link
                          href={`/dashboard/master-admin/support-tickets/${selectedEmail.inboundTicket.id}`}
                          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800"
                        >
                          <Ticket className="h-4 w-4" />
                          #{selectedEmail.inboundTicket.ticketNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">To:</span>
                      <span className="text-gray-900">
                        {selectedEmail.recipientName ? `${selectedEmail.recipientName} <${selectedEmail.recipientEmail}>` : selectedEmail.recipientEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Subject:</span>
                      <span className="text-gray-900">{selectedEmail.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Sent:</span>
                      <span className="text-gray-900">{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Type:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {selectedEmail.emailType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 w-20">Status:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedEmail.sentStatus].color}`}>
                        {statusConfig[selectedEmail.sentStatus].label}
                      </span>
                    </div>
                    {selectedEmail.errorMessage && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="font-medium text-gray-700 w-20">Error:</span>
                        <span className="text-red-600">{selectedEmail.errorMessage}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Email Content */}
              <div className="max-h-[50vh] overflow-y-auto">
                {'fromAddress' in selectedEmail ? (
                  selectedEmail.htmlBody ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                    />
                  ) : selectedEmail.textBody ? (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {selectedEmail.textBody}
                    </pre>
                  ) : (
                    <p className="text-gray-500 italic">No content available</p>
                  )
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
                  />
                )}
              </div>

              {/* Reply Form (for received emails) */}
              {'fromAddress' in selectedEmail && replyMode && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Reply
                  </label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    disabled={sendingReply}
                  />
                </div>
              )}

              {/* Modal Footer */}
              <div className="mt-6 flex justify-end gap-3">
                {'fromAddress' in selectedEmail && !replyMode && (
                  <button
                    onClick={() => setReplyMode(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Reply className="h-4 w-4" />
                    Reply
                  </button>
                )}
                {'fromAddress' in selectedEmail && replyMode && (
                  <>
                    <button
                      onClick={() => setReplyMode(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={sendingReply}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendReply}
                      disabled={sendingReply || !replyMessage.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </>
                )}
                {!replyMode && (
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
