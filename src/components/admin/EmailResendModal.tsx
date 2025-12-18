'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, History, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { emailTemplates, getTemplateById, processSubject, type EmailTemplate } from '@/lib/email-templates'

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
  const [mode, setMode] = useState<'templates' | 'history'>('templates')
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail)
  const [recipientName, setRecipientName] = useState(defaultRecipientName || '')
  const [templateData, setTemplateData] = useState<Record<string, string>>({})
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [customMessage, setCustomMessage] = useState('')

  const selectedTemplate = selectedTemplateId ? getTemplateById(selectedTemplateId) : null

  useEffect(() => {
    if (isOpen && mode === 'history') {
      fetchEmails()
    }
  }, [isOpen, mode])

  const fetchEmails = async () => {
    setLoading(true)
    try {
      console.log('[EmailResendModal] Fetching emails for:', { registrationId, registrationType })

      const response = await fetch(
        `/api/admin/registrations/${registrationId}/emails?type=${registrationType}`
      )

      console.log('[EmailResendModal] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[EmailResendModal] Error response:', errorData)
        throw new Error(errorData.error || `Failed to fetch emails (status ${response.status})`)
      }

      const data = await response.json()
      console.log('[EmailResendModal] Received email data:', { emailCount: data.emails?.length || 0 })

      setEmails(data.emails || [])

      // Auto-select the most recent email
      if (data.emails && data.emails.length > 0) {
        setSelectedEmailId(data.emails[0].id)
        setSelectedEmail(data.emails[0])
      }
    } catch (error) {
      console.error('[EmailResendModal] Error fetching emails:', error)
      alert(`Failed to load email history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSelect = (email: EmailLog) => {
    setSelectedEmailId(email.id)
    setSelectedEmail(email)
  }

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplateId(template.id)
    setSelectedEmail(null)
    setSelectedEmailId(null)

    // Reset template data with defaults
    setTemplateData({
      eventName: '',
      registrationDetails: '',
      accessCode: '',
      amountDue: '',
      dueDate: '',
      amount: '',
      paymentDate: '',
      paymentMethod: '',
      remainingBalance: '',
      incompleteCount: '',
      updateMessage: '',
      actionRequired: '',
      checkInTime: '',
      checkInLocation: '',
      parkingInfo: '',
    })
    setCustomMessage('')
  }

  const handleSendEmail = async () => {
    let subjectToSend = ''
    let htmlToSend = ''

    if (mode === 'history' && selectedEmailId && selectedEmail) {
      // Resending from history
      subjectToSend = selectedEmail.subject
      htmlToSend = selectedEmail.htmlContent
    } else if (mode === 'templates' && selectedTemplateId && selectedTemplate) {
      // Sending from template
      subjectToSend = processSubject(selectedTemplate.subject, templateData)

      if (selectedTemplate.id === 'custom_message') {
        htmlToSend = selectedTemplate.generateHtml({ eventName: templateData.eventName, customMessage })
      } else {
        htmlToSend = selectedTemplate.generateHtml(templateData)
      }
    } else {
      alert('Please select an email template or history item')
      return
    }

    if (!recipientEmail) {
      alert('Please enter a recipient email address')
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
            emailId: selectedEmailId, // Will be null for templates
            subject: subjectToSend,
            htmlContent: htmlToSend,
            recipientEmail,
            recipientName: recipientName || null,
            registrationType,
            emailType: mode === 'templates' ? selectedTemplateId : 'resent',
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      alert('Email sent successfully!')

      // Refresh email history if we're in that mode
      if (mode === 'history') {
        await fetchEmails()
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
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

  const getEmailTypeLabel = (emailType: string) => {
    return emailType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Group templates by category
  const templatesByCategory = emailTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)

  const categoryLabels = {
    registration: 'Registration',
    payment: 'Payment',
    forms: 'Forms & Documents',
    event: 'Event Information',
    general: 'General',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1E3A5F] flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to Registrant
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Mode Selector */}
          <div className="flex gap-2 border-b border-gray-200 pb-2">
            <Button
              variant={mode === 'templates' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('templates')}
              className={mode === 'templates' ? 'bg-[#1E3A5F]' : ''}
            >
              <FileText className="h-4 w-4 mr-2" />
              Email Templates
            </Button>
            <Button
              variant={mode === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('history')}
              className={mode === 'history' ? 'bg-[#1E3A5F]' : ''}
            >
              <History className="h-4 w-4 mr-2" />
              Email History
            </Button>
          </div>

          {/* Templates Mode */}
          {mode === 'templates' && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Select Email Template
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {Object.entries(templatesByCategory).map(([category, templates]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </h4>
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            onClick={() => handleTemplateSelect(template)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedTemplateId === template.id
                                ? 'border-[#1E3A5F] bg-[#F5F1E8]'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {template.name}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {template.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template Configuration */}
              {selectedTemplate && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Configure Email Content
                  </h3>
                  <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {selectedTemplate.id === 'custom_message' ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="custom-event-name" className="text-sm text-gray-600">
                            Event Name *
                          </Label>
                          <Input
                            id="custom-event-name"
                            value={templateData.eventName || ''}
                            onChange={(e) =>
                              setTemplateData({ ...templateData, eventName: e.target.value })
                            }
                            placeholder="e.g., Youth Retreat 2025"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom-message" className="text-sm text-gray-600">
                            Your Message *
                          </Label>
                          <Textarea
                            id="custom-message"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Enter your custom message here..."
                            rows={8}
                            className="mt-1 font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Tip: You can use HTML tags for formatting
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Common fields for most templates */}
                        <div>
                          <Label htmlFor="event-name" className="text-sm text-gray-600">
                            Event Name *
                          </Label>
                          <Input
                            id="event-name"
                            value={templateData.eventName || ''}
                            onChange={(e) =>
                              setTemplateData({ ...templateData, eventName: e.target.value })
                            }
                            placeholder="e.g., Youth Retreat 2025"
                            className="mt-1"
                          />
                        </div>

                        {/* Template-specific fields */}
                        {selectedTemplate.id === 'payment_reminder' && (
                          <>
                            <div>
                              <Label htmlFor="amount-due" className="text-sm text-gray-600">
                                Amount Due
                              </Label>
                              <Input
                                id="amount-due"
                                value={templateData.amountDue || ''}
                                onChange={(e) =>
                                  setTemplateData({ ...templateData, amountDue: e.target.value })
                                }
                                placeholder="e.g., 150.00"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="due-date" className="text-sm text-gray-600">
                                Due Date
                              </Label>
                              <Input
                                id="due-date"
                                value={templateData.dueDate || ''}
                                onChange={(e) =>
                                  setTemplateData({ ...templateData, dueDate: e.target.value })
                                }
                                placeholder="e.g., March 15, 2025"
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}

                        {selectedTemplate.id === 'welcome_access_code' && (
                          <div>
                            <Label htmlFor="access-code" className="text-sm text-gray-600">
                              Access Code
                            </Label>
                            <Input
                              id="access-code"
                              value={templateData.accessCode || ''}
                              onChange={(e) =>
                                setTemplateData({ ...templateData, accessCode: e.target.value })
                              }
                              placeholder="e.g., ABC-123-XYZ"
                              className="mt-1"
                            />
                          </div>
                        )}

                        {selectedTemplate.id === 'event_update' && (
                          <div>
                            <Label htmlFor="update-message" className="text-sm text-gray-600">
                              Update Message *
                            </Label>
                            <Textarea
                              id="update-message"
                              value={templateData.updateMessage || ''}
                              onChange={(e) =>
                                setTemplateData({ ...templateData, updateMessage: e.target.value })
                              }
                              placeholder="Enter the update message..."
                              rows={4}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Mode */}
          {mode === 'history' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-[#9C8466] animate-spin" />
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No emails sent to this registration yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Use the Email Templates tab to send your first email
                  </p>
                </div>
              ) : (
                <>
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
                        </div>
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Recipient Form - shown for both modes */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {mode === 'templates' ? 'Send To' : 'Resend To'}
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
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {mode === 'templates'
              ? 'Select a template and configure the content to send'
              : 'Select a previous email to resend'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={
                sending ||
                !recipientEmail ||
                (mode === 'templates' && !selectedTemplateId) ||
                (mode === 'history' && !selectedEmailId)
              }
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
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
