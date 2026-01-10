'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Send,
  ArrowLeft,
  ChevronDown,
  Eye,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
  MapPin,
  Link as LinkIcon,
  User,
} from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  description: string
  category: 'invitation' | 'announcement' | 'follow_up' | 'general'
  defaultSubject: string
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  invitation: { label: 'Invitation', color: 'bg-purple-100 text-purple-800' },
  announcement: { label: 'Announcement', color: 'bg-blue-100 text-blue-800' },
  follow_up: { label: 'Follow Up', color: 'bg-green-100 text-green-800' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-800' },
}

export default function ComposeEmailPage() {
  const { getToken } = useAuth()
  const router = useRouter()

  // State
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [subject, setSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [senderName, setSenderName] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/emails/send', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (!response.ok) throw new Error('Failed to fetch templates')

      const data = await response.json()
      setTemplates(data.templates)

      // Auto-select first template
      if (data.templates.length > 0) {
        selectTemplate(data.templates[0])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setErrorMessage('Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setSubject(template.defaultSubject.replace('{{eventName}}', eventName || 'Event'))
    setShowTemplateSelector(false)
  }

  const handleSubjectUpdate = () => {
    if (selectedTemplate && eventName) {
      setSubject(selectedTemplate.defaultSubject.replace('{{eventName}}', eventName))
    }
  }

  const validateForm = (): string | null => {
    if (!recipientEmail) return 'Recipient email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return 'Invalid email address'
    if (!subject) return 'Subject is required'
    if (!selectedTemplate) return 'Please select a template'
    return null
  }

  const handleSend = async () => {
    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          templateId: selectedTemplate?.id,
          recipientEmail,
          recipientName: recipientName || undefined,
          subject,
          customMessage: customMessage || undefined,
          eventName: eventName || undefined,
          eventDate: eventDate || undefined,
          eventLocation: eventLocation || undefined,
          eventDescription: eventDescription || undefined,
          ctaUrl: ctaUrl || undefined,
          ctaText: ctaText || undefined,
          senderName: senderName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setSuccessMessage(`Email sent successfully to ${recipientEmail}`)

      // Clear form after success
      setTimeout(() => {
        setRecipientEmail('')
        setRecipientName('')
        setCustomMessage('')
        setSuccessMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Error sending email:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  // Show different fields based on template type
  const showEventFields = selectedTemplate?.category === 'invitation' &&
    (selectedTemplate.id === 'event_invitation' || selectedTemplate.id === 'organization_invitation')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-purple-600 animate-pulse" />
          <span className="text-gray-600">Loading email composer...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/master-admin/emails"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compose Email</h1>
            <p className="text-gray-600">Send emails to anyone using templates</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Email Template
              </h2>
              {selectedTemplate && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryLabels[selectedTemplate.category].color}`}>
                  {categoryLabels[selectedTemplate.category].label}
                </span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedTemplate?.name || 'Select a template'}
                  </p>
                  {selectedTemplate && (
                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showTemplateSelector ? 'rotate-180' : ''}`} />
              </button>

              {showTemplateSelector && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedTemplate?.id === template.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryLabels[template.category].color}`}>
                          {categoryLabels[template.category].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recipient */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Recipient
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Subject
            </h2>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Event Details (conditional) */}
          {showEventFields && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Event Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => {
                      setEventName(e.target.value)
                      // Auto-update subject
                      if (selectedTemplate) {
                        setSubject(selectedTemplate.defaultSubject.replace('{{eventName}}', e.target.value || 'Event'))
                      }
                    }}
                    placeholder="Youth Rally 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="June 15-18, 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="h-4 w-4 inline-block mr-1" />
                    Event Location
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Camp Crucis, Granbury, TX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Description
                  </label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Brief description of the event..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Custom Message
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Add a personalized message to include in the email.
            </p>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Write your custom message here..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
          </div>

          {/* Call to Action */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-purple-600" />
              Call to Action Button
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Add a button link to drive action (optional).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button URL
                </label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://chirhoevents.com/register"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Register Now"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Preview & Settings */}
        <div className="space-y-6">
          {/* Sender Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Sender Info
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name (optional)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Will use your account name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Appears in the email signature
              </p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-4">
              Tips
            </h2>
            <ul className="space-y-3 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Personalize with the recipient&apos;s name for better engagement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Keep subject lines clear and under 50 characters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Include a clear call-to-action button</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>All emails are logged and can be viewed in the Sent tab</span>
              </li>
            </ul>
          </div>

          {/* Template Quick Switch */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Templates
            </h2>
            <div className="space-y-2">
              {templates.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`w-full px-3 py-2 text-left rounded-lg text-sm transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-purple-100 text-purple-800 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
