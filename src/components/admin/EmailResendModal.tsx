'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface EmailLog {
  id: string
  recipientEmail: string
  recipientName: string | null
  emailType: string
  subject: string
  sentAt: string
  sentStatus: string
  htmlContent: string
}

interface EmailResendModalProps {
  isOpen: boolean
  onClose: () => void
  registrationId: string
  registrationType: 'group' | 'individual'
  defaultRecipientEmail: string
  defaultRecipientName?: string
}

export default function EmailResendModal({
  isOpen,
  onClose,
  registrationId,
  registrationType,
  defaultRecipientEmail,
  defaultRecipientName,
}: EmailResendModalProps) {
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail)
  const [recipientName, setRecipientName] = useState(defaultRecipientName || '')
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchEmails()
    }
  }, [isOpen, registrationId])

  const fetchEmails = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/${registrationId}/emails?type=${registrationType}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data = await response.json()
      setEmails(data.emails || [])

      // Auto-select the most recent email
      if (data.emails && data.emails.length > 0) {
        setSelectedEmailId(data.emails[0].id)
        setSelectedEmail(data.emails[0])
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
      alert('Failed to load email history')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSelect = (email: EmailLog) => {
    setSelectedEmailId(email.id)
    setSelectedEmail(email)
  }

  const handleResend = async () => {
    if (!selectedEmailId || !recipientEmail) {
      alert('Please select an email and enter a recipient email address')
      return
    }

    setSending(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/${registrationId}/emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailId: selectedEmailId,
            recipientEmail,
            recipientName: recipientName || null,
            registrationType,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to resend email')
      }

      alert('Email resent successfully!')
      // Refresh email history
      await fetchEmails()
    } catch (error) {
      console.error('Error resending email:', error)
      alert('Failed to resend email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const getEmailTypeLabel = (emailType: string) => {
    return emailType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1E3A5F] flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email History & Resend
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-[#9C8466] animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No emails sent to this registration yet</p>
            </div>
          ) : (
            <>
              {/* Email List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Email History ({emails.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailSelect(email)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedEmailId === email.id
                          ? 'border-[#1E3A5F] bg-[#F5F1E8]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(email.sentStatus)}
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {email.subject}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600">
                            {getEmailTypeLabel(email.emailType)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            To: {email.recipientEmail}
                            {email.recipientName && ` (${email.recipientName})`}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(email.sentAt), 'MMM d, yyyy')}
                          <br />
                          {format(new Date(email.sentAt), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Preview */}
              {selectedEmail && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Email Preview
                  </h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Subject:</strong> {selectedEmail.subject}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Type:</strong> {getEmailTypeLabel(selectedEmail.emailType)}
                      </p>
                    </div>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
                    />
                  </div>
                </div>
              )}

              {/* Resend Form */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Resend Email
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recipient-email" className="text-sm text-gray-600">
                      Recipient Email *
                    </Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipient-name" className="text-sm text-gray-600">
                      Recipient Name (Optional)
                    </Label>
                    <Input
                      id="recipient-name"
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    The selected email will be sent to the specified recipient
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={sending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResend}
                      disabled={sending || !selectedEmailId || !recipientEmail}
                      className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
