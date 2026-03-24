'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Loader2,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomLink {
  label: string
  url: string
}

type TemplateType =
  | 'event_reminder'
  | 'survey_feedback'
  | 'registration_open'
  | 'general_update'
  | 'payment_reminder'
  | 'late_fee_notice'
  | 'thank_you'

interface Template {
  id: TemplateType
  name: string
  description: string
  icon: string
}

const TEMPLATES: Template[] = [
  {
    id: 'event_reminder',
    name: 'Event Reminder',
    description: 'Remind registrants about upcoming event details, forms, and payments.',
    icon: '📅',
  },
  {
    id: 'survey_feedback',
    name: 'Survey / Feedback',
    description: 'Send a survey link to collect feedback after (or during) the event.',
    icon: '📝',
  },
  {
    id: 'registration_open',
    name: 'Registration Open',
    description: 'Announce that registration is now open for an upcoming event.',
    icon: '🎟️',
  },
  {
    id: 'general_update',
    name: 'General Update',
    description: 'A freeform announcement with a custom subject and message body.',
    icon: '📢',
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    description: 'Remind recipients about outstanding balances.',
    icon: '💳',
  },
  {
    id: 'late_fee_notice',
    name: 'Late Fee Notice',
    description: 'Notify recipients that a late fee has been applied to their registration.',
    icon: '⚠️',
  },
  {
    id: 'thank_you',
    name: 'Thank You / Post-Event',
    description: 'Send a thank-you after the event wraps up.',
    icon: '🙏',
  },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface SendReminderEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  eventName: string
  /** Whether the event supports group registration (defaults to true) */
  groupRegistrationEnabled?: boolean
  /** Whether the event supports individual registration (defaults to true) */
  individualRegistrationEnabled?: boolean
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function LinkEditor({
  links,
  onChange,
}: {
  links: CustomLink[]
  onChange: (links: CustomLink[]) => void
}) {
  const add = () => onChange([...links, { label: '', url: '' }])
  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i))
  const update = (i: number, field: 'label' | 'url', value: string) => {
    const next = [...links]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#6B7280]">
        Add links to include in the email (schedules, forms, galleries, etc.).
      </p>
      {links.map((link, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Link label (e.g., Event Schedule)"
              value={link.label}
              onChange={(e) => update(i, 'label', e.target.value)}
            />
            <Input
              placeholder="URL (https://...)"
              value={link.url}
              onChange={(e) => update(i, 'url', e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(i)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Link
      </Button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SendReminderEmailModal({
  open,
  onOpenChange,
  eventId,
  eventName,
  groupRegistrationEnabled = true,
  individualRegistrationEnabled = true,
}: SendReminderEmailModalProps) {
  const { getToken } = useAuth()

  // Navigation state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null)

  // Shared across all templates
  const [recipients, setRecipients] = useState('all')
  const [testEmail, setTestEmail] = useState('')
  const [links, setLinks] = useState<CustomLink[]>([])

  // Event Reminder fields
  const [includePortalReminder, setIncludePortalReminder] = useState(true)
  const [customMessage, setCustomMessage] = useState('')
  const [arrivalInstructions, setArrivalInstructions] = useState('')
  const [includeHousingInfo, setIncludeHousingInfo] = useState(false)
  const [housingInstructions, setHousingInstructions] = useState('')
  const [includeGroupAssignments, setIncludeGroupAssignments] = useState(false)
  const [groupAssignmentInfo, setGroupAssignmentInfo] = useState('')
  const [includePaymentInfo, setIncludePaymentInfo] = useState(false)
  const [showBalanceDue, setShowBalanceDue] = useState(true)
  const [includeStaffAssignments, setIncludeStaffAssignments] = useState(false)

  // Survey / Feedback fields
  const [surveyUrl, setSurveyUrl] = useState('')
  const [surveyMessage, setSurveyMessage] = useState('')

  // Registration Open fields
  const [registrationUrl, setRegistrationUrl] = useState('')
  const [regEventDate, setRegEventDate] = useState('')
  const [regLocation, setRegLocation] = useState('')
  const [regDeadline, setRegDeadline] = useState('')
  const [regPrice, setRegPrice] = useState('')
  const [regMessage, setRegMessage] = useState('')

  // General Update fields
  const [emailSubject, setEmailSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')

  // Payment Reminder fields
  const [balanceDue, setBalanceDue] = useState('')
  const [paymentDeadline, setPaymentDeadline] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')

  // Late Fee Notice fields
  const [originalAmount, setOriginalAmount] = useState('')
  const [lateFeeAmount, setLateFeeAmount] = useState('')
  const [newTotal, setNewTotal] = useState('')
  const [lateFeeDate, setLateFeeDate] = useState('')
  const [lateFeePaymentUrl, setLateFeePaymentUrl] = useState('')
  const [lateFeeMessage, setLateFeeMessage] = useState('')

  // Thank You fields
  const [thankYouMessage, setThankYouMessage] = useState('')

  // Send state
  const [loading, setLoading] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    sent: number
    failed: number
    message: string
  } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // ── Derived ──────────────────────────────────────────────────────────────

  const isGroupOnly = groupRegistrationEnabled && !individualRegistrationEnabled
  const isIndividualOnly = individualRegistrationEnabled && !groupRegistrationEnabled

  const recipientOptions = () => {
    if (isGroupOnly) {
      return [{ value: 'groups', label: 'Group Leaders Only' }]
    }
    if (isIndividualOnly) {
      return [{ value: 'individuals', label: 'All Registrants' }]
    }
    return [
      { value: 'all', label: 'All Registrations (Groups & Individuals)' },
      { value: 'groups', label: 'Group Leaders Only' },
      { value: 'individuals', label: 'Individual Registrations Only' },
    ]
  }

  // ── Payload builders ──────────────────────────────────────────────────────

  const buildPayload = (testMode = false, testEmailAddr = '') => {
    const base = {
      templateType: selectedTemplate,
      recipients,
      links: links.filter((l) => l.label && l.url),
      ...(testMode ? { testMode: true, testEmail: testEmailAddr } : {}),
    }

    switch (selectedTemplate) {
      case 'event_reminder':
        return {
          ...base,
          customMessage,
          arrivalInstructions,
          includePortalReminder,
          includeHousingInfo,
          housingInstructions: includeHousingInfo ? housingInstructions : '',
          includeGroupAssignments,
          groupAssignmentInfo: includeGroupAssignments ? groupAssignmentInfo : '',
          includePaymentInfo,
          showBalanceDue: includePaymentInfo ? showBalanceDue : false,
          includeStaffAssignments,
        }
      case 'survey_feedback':
        return { ...base, surveyUrl, customMessage: surveyMessage }
      case 'registration_open':
        return {
          ...base,
          registrationUrl,
          eventDate: regEventDate,
          eventLocation: regLocation,
          registrationDeadline: regDeadline,
          price: regPrice,
          customMessage: regMessage,
        }
      case 'general_update':
        return { ...base, emailSubject, messageBody }
      case 'payment_reminder':
        return {
          ...base,
          balanceDue,
          paymentDeadline,
          totalAmount,
          amountPaid,
          paymentUrl,
          customMessage: paymentMessage,
        }
      case 'late_fee_notice':
        return {
          ...base,
          originalAmount,
          lateFeeAmount,
          newTotal,
          lateFeeEffectiveDate: lateFeeDate,
          paymentUrl: lateFeePaymentUrl,
          customMessage: lateFeeMessage,
        }
      case 'thank_you':
        return { ...base, customMessage: thankYouMessage }
      default:
        return base
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const isValid = () => {
    switch (selectedTemplate) {
      case 'survey_feedback':
        return !!surveyUrl
      case 'registration_open':
        return !!registrationUrl
      case 'general_update':
        return !!emailSubject && !!messageBody
      case 'payment_reminder':
        return !!balanceDue
      case 'late_fee_notice':
        return !!originalAmount && !!lateFeeAmount && !!newTotal
      default:
        return true
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSendTest = async () => {
    if (!testEmail) {
      setTestResult({ success: false, message: 'Please enter a test email address' })
      return
    }
    setSendingTest(true)
    setTestResult(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/send-reminder-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildPayload(true, testEmail)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send test email')
      setTestResult({ success: true, message: `Test email sent to ${testEmail}` })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test email',
      })
    } finally {
      setSendingTest(false)
    }
  }

  const handleSend = async () => {
    setLoading(true)
    setResult(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/send-reminder-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send emails')
      setResult({ success: true, sent: data.results.sent, failed: data.results.failed, message: data.message })
    } catch (err) {
      setResult({
        success: false,
        sent: 0,
        failed: 0,
        message: err instanceof Error ? err.message : 'Failed to send emails',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setResult(null)
    setTestResult(null)
    setTestEmail('')
    setRecipients('all')
    setLinks([])
    // Reset all fields
    setIncludePortalReminder(true)
    setCustomMessage('')
    setArrivalInstructions('')
    setIncludeHousingInfo(false)
    setHousingInstructions('')
    setIncludeGroupAssignments(false)
    setGroupAssignmentInfo('')
    setIncludePaymentInfo(false)
    setShowBalanceDue(true)
    setIncludeStaffAssignments(false)
    setSurveyUrl('')
    setSurveyMessage('')
    setRegistrationUrl('')
    setRegEventDate('')
    setRegLocation('')
    setRegDeadline('')
    setRegPrice('')
    setRegMessage('')
    setEmailSubject('')
    setMessageBody('')
    setBalanceDue('')
    setPaymentDeadline('')
    setTotalAmount('')
    setAmountPaid('')
    setPaymentUrl('')
    setPaymentMessage('')
    setOriginalAmount('')
    setLateFeeAmount('')
    setNewTotal('')
    setLateFeeDate('')
    setLateFeePaymentUrl('')
    setLateFeeMessage('')
    setThankYouMessage('')
    onOpenChange(false)
  }

  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplate)

  // ── Render helpers ────────────────────────────────────────────────────────

  const RecipientsField = () => (
    <div className="space-y-2">
      <Label>Send To</Label>
      <Select value={recipients} onValueChange={setRecipients}>
        <SelectTrigger>
          <SelectValue placeholder="Select recipients" />
        </SelectTrigger>
        <SelectContent>
          {recipientOptions().map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-[#6B7280]">Cancelled registrations are automatically excluded.</p>
    </div>
  )

  const TestEmailSection = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-4 w-4 text-blue-600" />
        <Label className="font-medium text-blue-800">Test Email Preview</Label>
      </div>
      <p className="text-xs text-blue-600 mb-3">
        Send a test email to yourself before sending to all recipients.
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Your email address..."
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleSendTest}
          disabled={sendingTest || !testEmail || !isValid()}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          {sendingTest ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Send Test
            </>
          )}
        </Button>
      </div>
      {testResult && (
        <p className={`text-xs mt-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
          {testResult.message}
        </p>
      )}
    </div>
  )

  // ── Template-specific fields ──────────────────────────────────────────────

  const renderTemplateFields = () => {
    switch (selectedTemplate) {
      // ── Event Reminder ──────────────────────────────────────────────────
      case 'event_reminder':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="flex items-start space-x-3">
              <Checkbox
                id="portalReminder"
                checked={includePortalReminder}
                onCheckedChange={(v) => setIncludePortalReminder(v as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="portalReminder" className="font-medium">Include Portal Reminder</Label>
                <p className="text-xs text-[#6B7280]">
                  Remind participants to check their portal for missing forms and outstanding payments.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (Optional)</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add any additional message..."
                className="min-h-[90px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalInstructions">Arrival Instructions (Optional)</Label>
              <Textarea
                id="arrivalInstructions"
                value={arrivalInstructions}
                onChange={(e) => setArrivalInstructions(e.target.value)}
                placeholder="Check-in times, parking info, etc."
                className="min-h-[90px]"
              />
            </div>

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="payment">
                <AccordionTrigger className="text-sm font-medium">Payment Information</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="includePayment"
                      checked={includePaymentInfo}
                      onCheckedChange={(v) => setIncludePaymentInfo(v as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="includePayment" className="font-medium">Include Payment Summary</Label>
                      <p className="text-xs text-[#6B7280]">Include registration total and amount paid.</p>
                    </div>
                  </div>
                  {includePaymentInfo && (
                    <div className="flex items-start space-x-3 ml-6">
                      <Checkbox
                        id="showBalance"
                        checked={showBalanceDue}
                        onCheckedChange={(v) => setShowBalanceDue(v as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="showBalance" className="font-medium">Show Balance Due</Label>
                        <p className="text-xs text-[#6B7280]">Uncheck if payment data may be inaccurate.</p>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="housing">
                <AccordionTrigger className="text-sm font-medium">Housing & Assignments</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="includeHousing"
                      checked={includeHousingInfo}
                      onCheckedChange={(v) => setIncludeHousingInfo(v as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="includeHousing" className="font-medium">Include Housing Information</Label>
                      <p className="text-xs text-[#6B7280]">Include housing type and participant breakdown.</p>
                    </div>
                  </div>
                  {includeHousingInfo && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="housingInstructions">Additional Housing Instructions</Label>
                      <Textarea
                        id="housingInstructions"
                        value={housingInstructions}
                        onChange={(e) => setHousingInstructions(e.target.value)}
                        placeholder="Room assignments will be available at check-in..."
                        className="min-h-[80px]"
                      />
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="includeGroups"
                      checked={includeGroupAssignments}
                      onCheckedChange={(v) => setIncludeGroupAssignments(v as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="includeGroups" className="font-medium">Include Small Group Room Assignment</Label>
                      <p className="text-xs text-[#6B7280]">Include the assigned small group meeting room.</p>
                    </div>
                  </div>
                  {includeGroupAssignments && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="groupAssignmentInfo">Additional Group Instructions</Label>
                      <Textarea
                        id="groupAssignmentInfo"
                        value={groupAssignmentInfo}
                        onChange={(e) => setGroupAssignmentInfo(e.target.value)}
                        placeholder="Small groups will meet after the Friday evening session..."
                        className="min-h-[80px]"
                      />
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="includeStaff"
                      checked={includeStaffAssignments}
                      onCheckedChange={(v) => setIncludeStaffAssignments(v as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="includeStaff" className="font-medium">Include Staff Assignments</Label>
                      <p className="text-xs text-[#6B7280]">Include assigned seminarians, small group leaders, and religious staff.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="links">
                <AccordionTrigger className="text-sm font-medium">Custom Links</AccordionTrigger>
                <AccordionContent className="pt-2">
                  <LinkEditor links={links} onChange={setLinks} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )

      // ── Survey / Feedback ───────────────────────────────────────────────
      case 'survey_feedback':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="space-y-2">
              <Label htmlFor="surveyUrl">
                Survey URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="surveyUrl"
                type="url"
                placeholder="https://forms.example.com/survey"
                value={surveyUrl}
                onChange={(e) => setSurveyUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surveyMessage">Custom Message (Optional)</Label>
              <Textarea
                id="surveyMessage"
                value={surveyMessage}
                onChange={(e) => setSurveyMessage(e.target.value)}
                placeholder="Add a personal note to accompany the survey link..."
                className="min-h-[90px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Links (Optional)</Label>
              <LinkEditor links={links} onChange={setLinks} />
            </div>
          </div>
        )

      // ── Registration Open ───────────────────────────────────────────────
      case 'registration_open':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="space-y-2">
              <Label htmlFor="registrationUrl">
                Registration URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="registrationUrl"
                type="url"
                placeholder="https://chirhoevents.com/register/..."
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regEventDate">Event Date (Optional)</Label>
                <Input
                  id="regEventDate"
                  placeholder="e.g., July 18–21, 2025"
                  value={regEventDate}
                  onChange={(e) => setRegEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regLocation">Location (Optional)</Label>
                <Input
                  id="regLocation"
                  placeholder="e.g., Camp Sunshine, TX"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regDeadline">Registration Deadline (Optional)</Label>
                <Input
                  id="regDeadline"
                  placeholder="e.g., June 1, 2025"
                  value={regDeadline}
                  onChange={(e) => setRegDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regPrice">Price (Optional)</Label>
                <Input
                  id="regPrice"
                  placeholder="e.g., $250 per person"
                  value={regPrice}
                  onChange={(e) => setRegPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regMessage">Custom Message (Optional)</Label>
              <Textarea
                id="regMessage"
                value={regMessage}
                onChange={(e) => setRegMessage(e.target.value)}
                placeholder="Add event highlights or anything else you'd like to share..."
                className="min-h-[90px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Links (Optional)</Label>
              <LinkEditor links={links} onChange={setLinks} />
            </div>
          </div>
        )

      // ── General Update ──────────────────────────────────────────────────
      case 'general_update':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="space-y-2">
              <Label htmlFor="emailSubject">
                Email Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emailSubject"
                placeholder="e.g., Schedule Change — Friday Evening Session"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="messageBody">
                Message Body <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="messageBody"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write your full message here. HTML is supported."
                className="min-h-[160px] font-mono text-sm"
              />
              <p className="text-xs text-[#6B7280]">
                Basic HTML is supported (e.g., <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;a&gt;</code>).
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Links (Optional)</Label>
              <LinkEditor links={links} onChange={setLinks} />
            </div>
          </div>
        )

      // ── Payment Reminder ────────────────────────────────────────────────
      case 'payment_reminder':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balanceDue">
                  Balance Due <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="balanceDue"
                  placeholder="e.g., $150.00"
                  value={balanceDue}
                  onChange={(e) => setBalanceDue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDeadline">Payment Deadline (Optional)</Label>
                <Input
                  id="paymentDeadline"
                  placeholder="e.g., May 15, 2025"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (Optional)</Label>
                <Input
                  id="totalAmount"
                  placeholder="e.g., $500.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Already Paid (Optional)</Label>
                <Input
                  id="amountPaid"
                  placeholder="e.g., $350.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentUrl">Payment URL (Optional)</Label>
              <Input
                id="paymentUrl"
                type="url"
                placeholder="https://..."
                value={paymentUrl}
                onChange={(e) => setPaymentUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMessage">Custom Message (Optional)</Label>
              <Textarea
                id="paymentMessage"
                value={paymentMessage}
                onChange={(e) => setPaymentMessage(e.target.value)}
                placeholder="Add any additional payment instructions..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Links (Optional)</Label>
              <LinkEditor links={links} onChange={setLinks} />
            </div>
          </div>
        )

      // ── Late Fee Notice ─────────────────────────────────────────────────
      case 'late_fee_notice':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                This email notifies recipients that a late fee has been applied. The tone is firm but respectful — please review the preview before sending.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalAmount">
                  Original Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="originalAmount"
                  placeholder="e.g., $400.00"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeAmount">
                  Late Fee Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lateFeeAmount"
                  placeholder="e.g., $50.00"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newTotal">
                  New Total <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newTotal"
                  placeholder="e.g., $450.00"
                  value={newTotal}
                  onChange={(e) => setNewTotal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeDate">Late Fee Effective Date (Optional)</Label>
                <Input
                  id="lateFeeDate"
                  placeholder="e.g., April 30, 2025"
                  value={lateFeeDate}
                  onChange={(e) => setLateFeeDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateFeePaymentUrl">Payment URL (Optional)</Label>
              <Input
                id="lateFeePaymentUrl"
                type="url"
                placeholder="https://..."
                value={lateFeePaymentUrl}
                onChange={(e) => setLateFeePaymentUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateFeeMessage">Custom Message (Optional)</Label>
              <Textarea
                id="lateFeeMessage"
                value={lateFeeMessage}
                onChange={(e) => setLateFeeMessage(e.target.value)}
                placeholder="Add any additional context or instructions..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Links (Optional)</Label>
              <LinkEditor links={links} onChange={setLinks} />
            </div>
          </div>
        )

      // ── Thank You ───────────────────────────────────────────────────────
      case 'thank_you':
        return (
          <div className="space-y-5">
            <RecipientsField />

            <div className="space-y-2">
              <Label htmlFor="thankYouMessage">Custom Message (Optional)</Label>
              <Textarea
                id="thankYouMessage"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                placeholder="Share a personal note, highlight a special moment, or point to what's next..."
                className="min-h-[110px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Links (Optional)</Label>
              <p className="text-xs text-[#6B7280]">
                Great for linking to photo galleries, survey, next year&apos;s registration, social media, etc.
              </p>
              <LinkEditor links={links} onChange={setLinks} />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const sendButtonLabel = () => {
    const t = currentTemplate
    if (!t) return 'Send'
    switch (t.id) {
      case 'event_reminder': return 'Send Reminder Emails'
      case 'survey_feedback': return 'Send Survey Emails'
      case 'registration_open': return 'Send Announcement Emails'
      case 'general_update': return 'Send Update Emails'
      case 'payment_reminder': return 'Send Payment Reminders'
      case 'late_fee_notice': return 'Send Late Fee Notices'
      case 'thank_you': return 'Send Thank You Emails'
      default: return 'Send Emails'
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <Mail className="h-5 w-5" />
            {selectedTemplate ? `${currentTemplate?.icon} ${currentTemplate?.name}` : 'Email All'}
          </DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? `Sending to registrants for ${eventName}.`
              : `Choose an email template to send to registrants for ${eventName}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Result screen */}
        {result ? (
          <div className="py-6">
            <div
              className={`flex flex-col items-center text-center p-6 rounded-lg ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-12 w-12 text-green-600 mb-3" />
              ) : (
                <AlertCircle className="h-12 w-12 text-red-600 mb-3" />
              )}
              <h3 className={`text-lg font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Emails Sent!' : 'Error'}
              </h3>
              <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              {result.success && result.failed > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  {result.failed} email(s) failed. Check the email logs for details.
                </p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : !selectedTemplate ? (
          /* Template selector */
          <div className="space-y-3 py-4">
            <p className="text-sm text-[#6B7280]">Select the type of email you want to send:</p>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className="flex items-start gap-4 p-4 rounded-lg border border-[#E5E7EB] hover:border-[#1E3A5F] hover:bg-[#f0f4f8] text-left transition-colors group"
                >
                  <span className="text-2xl leading-none mt-0.5">{t.icon}</span>
                  <div>
                    <p className="font-semibold text-[#1E3A5F] group-hover:text-[#1E3A5F]">{t.name}</p>
                    <p className="text-sm text-[#6B7280]">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Template fields */
          <>
            <div className="space-y-6 py-4">
              <TestEmailSection />
              {renderTemplateFields()}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate(null)
                  setTestResult(null)
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading || !isValid()}
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {sendButtonLabel()}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
