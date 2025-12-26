'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, RefreshCw, Users, CheckCircle, AlertCircle } from 'lucide-react'
import {
  emailTemplates,
  getTemplateById,
  processSubject,
  type EmailTemplate,
} from '@/lib/email-templates'

interface RecipientSummary {
  totalGroupLeaders: number
  totalIndividuals: number
  totalRecipients: number
}

interface DashboardBulkEmailModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DashboardBulkEmailModal({
  isOpen,
  onClose,
}: DashboardBulkEmailModalProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<RecipientSummary | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateData, setTemplateData] = useState<Record<string, string>>({})
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [sendComplete, setSendComplete] = useState(false)
  const [sendResult, setSendResult] = useState<{
    sent: number
    failed: number
    skipped: number
    total: number
  } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const selectedTemplate = selectedTemplateId
    ? getTemplateById(selectedTemplateId)
    : null

  // Filter to only show templates useful for bulk sending
  const bulkTemplates = emailTemplates.filter((t) =>
    [
      'payment_reminder',
      'forms_reminder',
      'event_update',
      'custom_message',
    ].includes(t.id)
  )

  useEffect(() => {
    if (isOpen) {
      fetchRecipients()
    }
  }, [isOpen])

  const fetchRecipients = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/emails/bulk-send')
      if (!response.ok) {
        throw new Error('Failed to fetch recipients')
      }
      const data = await response.json()
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching recipients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplateId(template.id)
    setTemplateData({
      eventName: '',
      amountDue: '',
      dueDate: '',
      accessCode: '',
      incompleteCount: '',
      updateMessage: '',
    })
    setCustomMessage('')
  }

  const handleSendBulkEmail = async () => {
    if (!selectedTemplate) {
      alert('Please select an email template')
      return
    }

    setSending(true)
    setSentCount(0)
    setErrors([])
    setSendComplete(false)
    setSendResult(null)

    try {
      // Generate subject and HTML
      const subjectToSend = processSubject(selectedTemplate.subject, templateData)

      let htmlToSend: string
      if (selectedTemplate.id === 'custom_message') {
        htmlToSend = selectedTemplate.generateHtml({
          eventName: templateData.eventName || 'Your Upcoming Event',
          customMessage,
        })
      } else {
        htmlToSend = selectedTemplate.generateHtml({
          ...templateData,
          eventName: templateData.eventName || 'Your Upcoming Event',
        })
      }

      const response = await fetch('/api/admin/emails/bulk-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          subject: subjectToSend,
          htmlContent: htmlToSend,
          recipientType: 'all_group_leaders',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      setSendResult(data.results)
      setErrors(data.errors || [])
      setSendComplete(true)
    } catch (error) {
      console.error('Error sending bulk emails:', error)
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred'])
      setSendComplete(true)
      setSendResult({ sent: 0, failed: 0, skipped: 0, total: 0 })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setSelectedTemplateId(null)
    setTemplateData({})
    setCustomMessage('')
    setSentCount(0)
    setSendComplete(false)
    setSendResult(null)
    setErrors([])
    onClose()
  }

  // Group templates by category
  const templatesByCategory = bulkTemplates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    },
    {} as Record<string, EmailTemplate[]>
  )

  const categoryLabels: Record<string, string> = {
    registration: 'Registration',
    payment: 'Payment',
    forms: 'Forms & Documents',
    event: 'Event Information',
    general: 'General',
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1E3A5F] flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email All Group Leaders
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-gray-600">Loading recipients...</span>
          </div>
        ) : sendComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            {sendResult && sendResult.sent > 0 ? (
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            ) : (
              <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {sendResult && sendResult.sent > 0 ? 'Emails Sent' : 'Send Complete'}
            </h3>
            {sendResult && (
              <div className="text-center mb-4">
                <p className="text-gray-600">
                  Sent to <span className="font-semibold text-green-600">{sendResult.sent}</span> group leader
                  {sendResult.sent !== 1 ? 's' : ''}
                </p>
                {sendResult.skipped > 0 && (
                  <p className="text-sm text-gray-500">
                    ({sendResult.skipped} duplicate email{sendResult.skipped !== 1 ? 's' : ''} skipped)
                  </p>
                )}
                {sendResult.failed > 0 && (
                  <p className="text-sm text-red-600">
                    {sendResult.failed} failed to send
                  </p>
                )}
              </div>
            )}
            {errors.length > 0 && (
              <div className="w-full max-w-md">
                <p className="text-sm text-red-600 font-medium mb-2">
                  {errors.length} error(s) occurred:
                </p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li>...and {errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            <Button
              onClick={handleClose}
              className="mt-6 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Recipients Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {summary?.totalGroupLeaders || 0} group leader
                  {(summary?.totalGroupLeaders || 0) !== 1 ? 's' : ''} across all events
                </span>
              </div>
              <p className="text-sm text-blue-700">
                This will send an email to all group leaders in your organization.
                Duplicate email addresses will only receive one copy.
              </p>
            </div>

            {/* Template Selection */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Select Email Template
              </h3>
              <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {Object.entries(templatesByCategory).map(
                  ([category, templates]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {categoryLabels[category] || category}
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
                  )
                )}
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
                          Event Name (optional - for greeting)
                        </Label>
                        <Input
                          id="custom-event-name"
                          value={templateData.eventName || ''}
                          onChange={(e) =>
                            setTemplateData({
                              ...templateData,
                              eventName: e.target.value,
                            })
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
                          rows={6}
                          className="mt-1 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Tip: You can use HTML tags for formatting
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="event-name" className="text-sm text-gray-600">
                          Event Name (optional - uses &quot;Your Upcoming Event&quot; if blank)
                        </Label>
                        <Input
                          id="event-name"
                          value={templateData.eventName || ''}
                          onChange={(e) =>
                            setTemplateData({
                              ...templateData,
                              eventName: e.target.value,
                            })
                          }
                          placeholder="e.g., Youth Retreat 2025"
                          className="mt-1"
                        />
                      </div>

                      {selectedTemplate.id === 'payment_reminder' && (
                        <>
                          <div>
                            <Label htmlFor="amount-due" className="text-sm text-gray-600">
                              Amount Due (optional - use &quot;your remaining balance&quot; for generic)
                            </Label>
                            <Input
                              id="amount-due"
                              value={templateData.amountDue || ''}
                              onChange={(e) =>
                                setTemplateData({
                                  ...templateData,
                                  amountDue: e.target.value,
                                })
                              }
                              placeholder="e.g., your remaining balance"
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
                                setTemplateData({
                                  ...templateData,
                                  dueDate: e.target.value,
                                })
                              }
                              placeholder="e.g., March 15, 2025"
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}

                      {selectedTemplate.id === 'forms_reminder' && (
                        <div>
                          <Label htmlFor="incomplete-count" className="text-sm text-gray-600">
                            Note about incomplete forms (optional)
                          </Label>
                          <Input
                            id="incomplete-count"
                            value={templateData.incompleteCount || ''}
                            onChange={(e) =>
                              setTemplateData({
                                ...templateData,
                                incompleteCount: e.target.value,
                              })
                            }
                            placeholder="e.g., some participants still need to complete their forms"
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
                              setTemplateData({
                                ...templateData,
                                updateMessage: e.target.value,
                              })
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

        {/* Footer Actions */}
        {!sendComplete && !loading && (
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              This will send one email to each unique group leader email address
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSendBulkEmail}
                disabled={
                  sending ||
                  !selectedTemplateId ||
                  (selectedTemplate?.id === 'custom_message' && !customMessage) ||
                  (selectedTemplate?.id === 'event_update' && !templateData.updateMessage)
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
                    Send to All Group Leaders
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
