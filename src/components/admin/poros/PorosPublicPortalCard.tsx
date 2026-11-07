'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Globe, Link as LinkIcon, Copy, Check, Mail, ExternalLink } from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosPublicPortalCardProps {
  eventId: string
  settings: any
  saving?: boolean
  onToggle: (key: string, value: boolean) => void
}

/** Turn the public resource portal on/off, copy its link, and grab an email template. */
export function PorosPublicPortalCard({ eventId, settings, saving, onToggle }: PorosPublicPortalCardProps) {
  const [copied, setCopied] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const publicPortalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/poros/public/${eventId}`
    : `/poros/public/${eventId}`

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(publicPortalUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="space-y-6">
      {/* Public Portal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Public Resource Portal
          </CardTitle>
          <CardDescription>
            The page participants open on their phones. Everything under Schedule & Public Portal shows up here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Public Portal</Label>
              <p className="text-sm text-muted-foreground">
                Allow participants to access the public resource portal
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings?.porosPublicPortalEnabled ? (
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
              <Switch
                checked={settings?.porosPublicPortalEnabled ?? false}
                onCheckedChange={(checked) => onToggle('porosPublicPortalEnabled', checked)}
                disabled={saving}
              />
            </div>
          </div>

          {settings?.porosPublicPortalEnabled && (
            <>
              <Separator />

              {/* Shareable Link Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Shareable Link
                </Label>
                <p className="text-sm text-muted-foreground">
                  Share this link with participants to access the public portal
                </p>
                <div className="flex gap-2">
                  <Input
                    value={publicPortalUrl}
                    readOnly
                    className="flex-1 bg-gray-50 font-mono text-sm"
                  />
                  <Button variant="outline" asChild className="flex-shrink-0">
                    <a href={publicPortalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Email Template Button */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Send to Participants
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get an email template to send to your participants
                </p>
                <Button
                  variant="outline"
                  onClick={() => setEmailDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  View Email Template
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Template Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Template
            </DialogTitle>
            <DialogDescription>
              Copy this email template to send to your participants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Subject Line</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg border text-sm">
                Event Resources Now Available - Access Your Portal
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Email Body</Label>
              <div className="mt-1 p-4 bg-gray-50 rounded-lg border text-sm space-y-3 whitespace-pre-line">
                <p>Hello!</p>
                <p>We&apos;re excited to share that the event resource portal is now available. You can access schedules, meal times, campus maps, and other important information all in one place.</p>
                <p><strong>Access the portal here:</strong></p>
                <p className="text-blue-600 break-all">{publicPortalUrl}</p>
                <p><strong>Tip:</strong> Add this page to your home screen for quick access during the event! Just tap the share button on your phone and select &quot;Add to Home Screen.&quot;</p>
                <p>If you have any questions, please don&apos;t hesitate to reach out.</p>
                <p>See you soon!</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const emailText = `Subject: Event Resources Now Available - Access Your Portal

Hello!

We're excited to share that the event resource portal is now available. You can access schedules, meal times, campus maps, and other important information all in one place.

Access the portal here:
${publicPortalUrl}

Tip: Add this page to your home screen for quick access during the event! Just tap the share button on your phone and select "Add to Home Screen."

If you have any questions, please don't hesitate to reach out.

See you soon!`
                try {
                  await navigator.clipboard.writeText(emailText)
                  toast.success('Email template copied!')
                } catch {
                  toast.error('Failed to copy')
                }
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Email
            </Button>
            <Button onClick={() => setEmailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
