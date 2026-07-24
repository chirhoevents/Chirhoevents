'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, Users, Inbox } from 'lucide-react'

const RECENT_SENT = [
  { id: 'e1', subject: 'July platform update: New reports + bulk email tools', recipients: 14, sentAt: '2026-07-05T10:00:00Z', opens: 12 },
  { id: 'e2', subject: 'Stripe pricing changes coming Aug 1', recipients: 14, sentAt: '2026-06-20T09:00:00Z', opens: 14 },
  { id: 'e3', subject: 'New feature: Custom question templates', recipients: 12, sentAt: '2026-06-01T10:00:00Z', opens: 10 },
]

const RECEIVED = [
  { id: 'r1', from: 'sarah@denver-youth.org', subject: 'Question about billing tier', received: '2026-07-08T13:22:00Z', unread: true },
  { id: 'r2', from: 'frobert@sta.example', subject: 'Onboarding scheduled — thanks', received: '2026-07-08T09:15:00Z', unread: true },
  { id: 'r3', from: 'jane@rosaryco.com', subject: 'Re: Vendor application status', received: '2026-07-07T14:44:00Z', unread: false },
]

export default function EmailsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy mb-1">Emails</h1>
          <p className="text-muted-foreground">Send platform-wide announcements and view inbound support email</p>
        </div>
        <Link href="/demo/dashboard/master-admin/emails/compose">
          <Button className="bg-navy hover:bg-navy/90 text-white">
            <Send className="w-4 h-4 mr-1" />
            Compose Announcement
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <Send className="w-5 h-5 text-[#9C8466]" />
              Recent Sent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {RECENT_SENT.map((e) => (
                <div key={e.id} className="p-4">
                  <p className="font-medium text-navy">{e.subject}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {e.recipients} recipients
                    </span>
                    <span>{e.opens}/{e.recipients} opens ({Math.round((e.opens / e.recipients) * 100)}%)</span>
                    <span>{new Date(e.sentAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <Inbox className="w-5 h-5 text-[#9C8466]" />
              Received
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {RECEIVED.map((e) => (
                <div key={e.id} className={`p-4 ${e.unread ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {e.unread && <Badge className="bg-blue-600 text-white text-xs">Unread</Badge>}
                    <p className="text-xs text-muted-foreground">{e.from}</p>
                  </div>
                  <p className={`${e.unread ? 'font-semibold' : ''} text-navy`}>{e.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(e.received).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#9C8466]" />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Monthly platform update', 'New feature announcement', 'Maintenance window'].map((tpl) => (
              <button
                key={tpl}
                onClick={() => alert(`Demo: Would open the "${tpl}" template in the composer.`)}
                className="p-4 border border-gray-200 rounded-lg hover:border-navy text-left"
              >
                <p className="font-medium text-navy">{tpl}</p>
                <p className="text-xs text-muted-foreground mt-1">Reusable template</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
