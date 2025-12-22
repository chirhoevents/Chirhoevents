'use client'

import { useState } from 'react'
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
import { Mail, RefreshCw, Users, CheckCircle } from 'lucide-react'
import {
  emailTemplates,
  getTemplateById,
  processSubject,
  type EmailTemplate,
} from '@/lib/email-templates'

interface Recipient {
  id: string
  type: 'group' | 'individual'
  email: string
  name: string
  eventId: string
  eventName: string
}

interface BulkEmailModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: Recipient[]
}

export default function BulkEmailModal({
  isOpen,
  onClose,
  recipients,
}: BulkEmailModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  )
  const [templateData, setTemplateData] = useState<Record<string, string>>({})
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [sendComplete, setSendComplete] = useState(false)
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

    const newErrors: string[] = []

    for (const recipient of recipients) {
      try {
        // Generate subject and HTML for this recipient
        const dataWithEvent = {
          ...templateData,
          eventName: templateData.eventName || recipient.eventName,
        }

        const subjectToSend = processSubject(
          selectedTemplate.subject,
          dataWithEvent
        )

        let htmlToSend: string
        if (selectedTemplate.id === 'custom_message') {
          htmlToSend = selectedTemplate.generateHtml({
            eventName: dataWithEvent.eventName,
            customMessage,
          })
        } else {
          htmlToSend = selectedTemplate.generateHtml(dataWithEvent)
        }

        const response = await fetch(
          `/api/admin/registrations/${recipient.id}/emails`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: subjectToSend,
              htmlContent: htmlToSend,
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              registrationType: recipient.type,
              emailType: selectedTemplateId,
            }),
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to send to ${recipient.email}`)
        }

        setSentCount((prev) => prev + 1)
      } catch (error) {
        console.error(`Error sending to ${recipient.email}:`, error)
        newErrors.push(
          `Failed to send to ${recipient.name} (${recipient.email})`
        )
      }
    }

    setErrors(newErrors)
    setSendComplete(true)
    setSending(false)
  }

  const handleClose = () => {
    setSelectedTemplateId(null)
    setTemplateData({})
    setCustomMessage('')
    setSentCount(0)
    setSendComplete(false)
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
            Send Bulk Email
          </DialogTitle>
        </DialogHeader>

        {sendComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Emails Sent
            </h3>
            <p className="text-gray-600 mb-4">
              Successfully sent {sentCount} of {recipients.length} emails
            </p>
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
              className="mt-6 bg-[#1E3A5F] hover:bg-[#2A4A6F]"
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
                  {recipients.length} recipient
                  {recipients.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="text-sm text-blue-700 max-h-24 overflow-y-auto">
                {recipients.slice(0, 10).map((r) => (
                  <span key={r.id} className="inline-block mr-2 mb-1">
                    {r.name}
                    {recipients.indexOf(r) < Math.min(9, recipients.length - 1)
                      ? ','
                      : ''}
                  </span>
                ))}
                {recipients.length > 10 && (
                  <span className="text-blue-600">
                    ...and {recipients.length - 10} more
                  </span>
                )}
              </div>
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
                        <Label
                          htmlFor="custom-event-name"
                          className="text-sm text-gray-600"
                        >
                          Event Name (leave blank to use each registration&apos;s
                          event)
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
                        <Label
                          htmlFor="custom-message"
                          className="text-sm text-gray-600"
                        >
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
                        <Label
                          htmlFor="event-name"
                          className="text-sm text-gray-600"
                        >
                          Event Name (leave blank to use each registration&apos;s
                          event)
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
                            <Label
                              htmlFor="amount-due"
                              className="text-sm text-gray-600"
                            >
                              Amount Due (optional - include text like &quot;your
                              remaining balance&quot;)
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
                            <Label
                              htmlFor="due-date"
                              className="text-sm text-gray-600"
                            >
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
                          <Label
                            htmlFor="incomplete-count"
                            className="text-sm text-gray-600"
                          >
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
                          <Label
                            htmlFor="update-message"
                            className="text-sm text-gray-600"
                          >
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
        {!sendComplete && (
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              This will send the same email to all {recipients.length} selected
              recipients
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
                  (selectedTemplate?.id === 'event_update' &&
                    !templateData.updateMessage)
                }
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending ({sentCount}/{recipients.length})...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send to {recipients.length} Recipient
                    {recipients.length !== 1 ? 's' : ''}
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
