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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

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
  const [recipients, setRecipients] = useState('all')
  const [customMessage, setCustomMessage] = useState('')
  const [arrivalInstructions, setArrivalInstructions] = useState('')
  const [includePortalReminder, setIncludePortalReminder] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    sent: number
    failed: number
    message: string
  } | null>(null)

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
        body: JSON.stringify({
          recipients,
          customMessage,
          arrivalInstructions,
          includePortalReminder,
        }),
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
    setCustomMessage('')
    setArrivalInstructions('')
    setIncludePortalReminder(true)
    setRecipients('all')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <Mail className="h-5 w-5" />
            Send Reminder Emails
          </DialogTitle>
          <DialogDescription>
            Send reminder emails to registrants for <strong>{eventName}</strong>.
            This will remind them to check their portal and complete any missing items.
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
            </div>

            <DialogFooter>
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
