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
import { Loader2, Mail, Send, CheckCircle, AlertCircle, Eye, Plus, Trash2, Link as LinkIcon } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

interface CustomLink {
  label: string
  url: string
}

interface SendReminderEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  eventName: string
}

export default function SendReminderEmailModal({
  open,
  onOpenChange,
  eventId,
  eventName,
}: SendReminderEmailModalProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [recipients, setRecipients] = useState('all')
  const [customMessage, setCustomMessage] = useState('')
  const [arrivalInstructions, setArrivalInstructions] = useState('')
  const [includePortalReminder, setIncludePortalReminder] = useState(true)

  // New fields for enhanced customization
  const [includeHousingInfo, setIncludeHousingInfo] = useState(false)
  const [housingInstructions, setHousingInstructions] = useState('')
  const [includeGroupAssignments, setIncludeGroupAssignments] = useState(false)
  const [groupAssignmentInfo, setGroupAssignmentInfo] = useState('')
  const [includePaymentInfo, setIncludePaymentInfo] = useState(false)
  const [showBalanceDue, setShowBalanceDue] = useState(true)
  const [includeStaffAssignments, setIncludeStaffAssignments] = useState(false)
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([])
  const [testEmail, setTestEmail] = useState('')

  const [result, setResult] = useState<{
    success: boolean
    sent: number
    failed: number
    message: string
  } | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const addCustomLink = () => {
    setCustomLinks([...customLinks, { label: '', url: '' }])
  }

  const updateCustomLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = [...customLinks]
    updated[index][field] = value
    setCustomLinks(updated)
  }

  const removeCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index))
  }

  const getEmailPayload = () => ({
    recipients,
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
    customLinks: customLinks.filter(link => link.label && link.url),
  })

  const handleSendTest = async () => {
    if (!testEmail) {
      setTestResult({
        success: false,
        message: 'Please enter a test email address',
      })
      return
    }

    setSendingTest(true)
    setTestResult(null)

    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/send-reminder-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...getEmailPayload(),
          testMode: true,
          testEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setTestResult({
        success: true,
        message: `Test email sent to ${testEmail}`,
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test email',
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
      const response = await fetch(`/api/admin/events/${eventId}/send-reminder-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(getEmailPayload()),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      setResult({
        success: true,
        sent: data.results.sent,
        failed: data.results.failed,
        message: data.message,
      })
    } catch (error) {
      setResult({
        success: false,
        sent: 0,
        failed: 0,
        message: error instanceof Error ? error.message : 'Failed to send emails',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setTestResult(null)
    setCustomMessage('')
    setArrivalInstructions('')
    setIncludePortalReminder(true)
    setIncludeHousingInfo(false)
    setHousingInstructions('')
    setIncludeGroupAssignments(false)
    setGroupAssignmentInfo('')
    setIncludePaymentInfo(false)
    setShowBalanceDue(true)
    setIncludeStaffAssignments(false)
    setCustomLinks([])
    setTestEmail('')
    setRecipients('all')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <Mail className="h-5 w-5" />
            Send Reminder Emails
          </DialogTitle>
          <DialogDescription>
            Send reminder emails to registrants for <strong>{eventName}</strong>.
            Customize the content and preview before sending.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6">
            <div className={`flex flex-col items-center text-center p-6 rounded-lg ${
              result.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {result.success ? (
                <CheckCircle className="h-12 w-12 text-green-600 mb-3" />
              ) : (
                <AlertCircle className="h-12 w-12 text-red-600 mb-3" />
              )}
              <h3 className={`text-lg font-semibold ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? 'Emails Sent!' : 'Error'}
              </h3>
              <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              {result.success && result.failed > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  {result.failed} email(s) failed to send. Check the email logs for details.
                </p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {/* Test Email Preview Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <Label className="font-medium text-blue-800">Test Email Preview</Label>
                </div>
                <p className="text-xs text-blue-600 mb-3">
                  Send a test email to preview how it will look before sending to all recipients.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter test email address..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
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

              {/* Recipients Selection */}
              <div className="space-y-2">
                <Label htmlFor="recipients">Send To</Label>
                <Select value={recipients} onValueChange={setRecipients}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Registrations (Groups & Individuals)</SelectItem>
                    <SelectItem value="groups">Group Leaders Only</SelectItem>
                    <SelectItem value="individuals">Individual Registrations Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#6B7280]">
                  Cancelled registrations are automatically excluded.
                </p>
              </div>

              {/* Include Portal Reminder */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="portalReminder"
                  checked={includePortalReminder}
                  onCheckedChange={(checked) => setIncludePortalReminder(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="portalReminder" className="font-medium">
                    Include Portal Reminder
                  </Label>
                  <p className="text-xs text-[#6B7280]">
                    Remind participants to check their portal for missing forms and outstanding payments.
                  </p>
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any additional message you'd like to include..."
                  className="min-h-[100px]"
                />
                <p className="text-xs text-[#6B7280]">
                  This message will be included in the &quot;Important Information&quot; section of the email.
                </p>
              </div>

              {/* Arrival Instructions */}
              <div className="space-y-2">
                <Label htmlFor="arrivalInstructions">Arrival Instructions (Optional)</Label>
                <Textarea
                  id="arrivalInstructions"
                  value={arrivalInstructions}
                  onChange={(e) => setArrivalInstructions(e.target.value)}
                  placeholder="e.g., Check-in begins at 3:00 PM at the main entrance. Please have your QR code ready..."
                  className="min-h-[100px]"
                />
                <p className="text-xs text-[#6B7280]">
                  Provide specific arrival details, check-in times, parking info, etc.
                </p>
              </div>

              {/* Advanced Options Accordion */}
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="payment">
                  <AccordionTrigger className="text-sm font-medium">
                    Payment Information
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* Include Payment Info */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="includePayment"
                        checked={includePaymentInfo}
                        onCheckedChange={(checked) => setIncludePaymentInfo(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="includePayment" className="font-medium">
                          Include Payment Summary
                        </Label>
                        <p className="text-xs text-[#6B7280]">
                          Include registration total and amount paid in the email.
                        </p>
                      </div>
                    </div>

                    {includePaymentInfo && (
                      <div className="flex items-start space-x-3 ml-6">
                        <Checkbox
                          id="showBalance"
                          checked={showBalanceDue}
                          onCheckedChange={(checked) => setShowBalanceDue(checked as boolean)}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="showBalance" className="font-medium">
                            Show Balance Due
                          </Label>
                          <p className="text-xs text-[#6B7280]">
                            Include remaining balance amount. Uncheck if payment data may be inaccurate.
                          </p>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="housing">
                  <AccordionTrigger className="text-sm font-medium">
                    Housing & Assignments
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* Include Housing Info */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="includeHousing"
                        checked={includeHousingInfo}
                        onCheckedChange={(checked) => setIncludeHousingInfo(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="includeHousing" className="font-medium">
                          Include Housing Information
                        </Label>
                        <p className="text-xs text-[#6B7280]">
                          Include housing type and participant breakdown in the email.
                        </p>
                      </div>
                    </div>

                    {includeHousingInfo && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="housingInstructions">Additional Housing Instructions</Label>
                        <Textarea
                          id="housingInstructions"
                          value={housingInstructions}
                          onChange={(e) => setHousingInstructions(e.target.value)}
                          placeholder="e.g., Room assignments will be available at check-in. Bring your own bedding for cabins..."
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    {/* Include Group Assignments */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="includeGroups"
                        checked={includeGroupAssignments}
                        onCheckedChange={(checked) => setIncludeGroupAssignments(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="includeGroups" className="font-medium">
                          Include Small Group Room Assignment
                        </Label>
                        <p className="text-xs text-[#6B7280]">
                          Include the assigned small group meeting room.
                        </p>
                      </div>
                    </div>

                    {includeGroupAssignments && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="groupAssignmentInfo">Additional Group Instructions</Label>
                        <Textarea
                          id="groupAssignmentInfo"
                          value={groupAssignmentInfo}
                          onChange={(e) => setGroupAssignmentInfo(e.target.value)}
                          placeholder="e.g., Small groups will meet after the Friday evening session..."
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    {/* Include Staff Assignments (seminarians, religious) */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="includeStaff"
                        checked={includeStaffAssignments}
                        onCheckedChange={(checked) => setIncludeStaffAssignments(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="includeStaff" className="font-medium">
                          Include Staff Assignments (Seminarians/Religious)
                        </Label>
                        <p className="text-xs text-[#6B7280]">
                          Include assigned seminarians, small group leaders, and religious staff contacts.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="links">
                  <AccordionTrigger className="text-sm font-medium">
                    Custom Links
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <p className="text-xs text-[#6B7280]">
                      Add custom links to include in the email (schedules, packing lists, maps, etc.).
                    </p>

                    {customLinks.map((link, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Link label (e.g., Event Schedule)"
                            value={link.label}
                            onChange={(e) => updateCustomLink(index, 'label', e.target.value)}
                          />
                          <Input
                            placeholder="URL (e.g., https://...)"
                            value={link.url}
                            onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomLink(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomLink}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading}
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
                    Send Reminder Emails
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
