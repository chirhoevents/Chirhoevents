'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, CheckCircle, Building2, User } from 'lucide-react'

const TICKETS: Record<string, any> = {
  't-1': {
    ticketNumber: 1042, subject: 'Can we increase the group size limit for Summer Retreat?',
    orgName: 'Steubenville Ministries', submittedBy: 'Demo Admin',
    category: 'billing', priority: 'medium', status: 'waiting_on_customer',
    createdAt: '2026-07-01T14:20:00Z',
    messages: [
      { author: 'Demo Admin', role: 'customer', time: '2026-07-01T14:20:00Z', body: 'Hi — we\'re at 247 registrations for Summer Retreat but our Professional plan caps at 250/event. Can we bump the limit for this one event?' },
      { author: 'Kelly (ChiRho)', role: 'support', time: '2026-07-01T16:05:00Z', body: 'Hi! Yes, absolutely. Would you like us to raise the event-specific cap to 400 for this one, or upgrade to Enterprise which gives you unlimited capacity across all events?' },
      { author: 'Demo Admin', role: 'customer', time: '2026-07-02T09:15:00Z', body: 'Let\'s just do the one-off bump to 400 for now. We can look at Enterprise for next year.' },
    ],
  },
  't-2': {
    ticketNumber: 1041, subject: 'Certificate upload failing for chaperones',
    orgName: 'Archdiocese of Denver Youth', submittedBy: 'Sarah Adams',
    category: 'technical', priority: 'high', status: 'in_progress',
    createdAt: '2026-06-28T10:00:00Z',
    messages: [
      { author: 'Sarah Adams', role: 'customer', time: '2026-06-28T10:00:00Z', body: 'Getting a 500 error when chaperones try to upload their Safe Environment certs. Reproducible with any PDF > 5MB.' },
      { author: 'Marco (ChiRho)', role: 'support', time: '2026-06-28T11:30:00Z', body: 'Confirmed — reproducing on our end. Looks like a Vercel body-size limit. We\'ll ship a fix by end of day.' },
      { author: 'Marco (ChiRho)', role: 'support', time: '2026-06-29T16:44:00Z', body: 'Fix is deployed — cert upload now supports up to 25MB. Please test and let us know.' },
    ],
  },
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_on_customer: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
}

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params?.ticketId as string
  const ticket = TICKETS[ticketId]
  const [reply, setReply] = useState('')
  const [messages, setMessages] = useState(ticket?.messages ?? [])
  const [status, setStatus] = useState(ticket?.status)

  if (!ticket) notFound()

  const sendReply = () => {
    if (!reply.trim()) return
    setMessages([
      ...messages,
      { author: 'You (ChiRho Master Admin)', role: 'support', time: new Date().toISOString(), body: reply },
    ])
    setReply('')
    setStatus('waiting_on_customer')
  }

  const markResolved = () => {
    setStatus('resolved')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/master-admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/master-admin/support-tickets" className="hover:text-navy">Support Tickets</Link>
        <span>/</span>
        <span className="text-navy font-medium">#{ticket.ticketNumber}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">#{ticket.ticketNumber}</span>
            <Badge className={statusColors[status]}>{status.replace('_', ' ')}</Badge>
            <Badge variant="secondary" className="capitalize">{ticket.category.replace('_', ' ')}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-navy">{ticket.subject}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{ticket.orgName}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.submittedBy}</span>
            <span>opened {new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {status !== 'resolved' && (
            <Button onClick={markResolved} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark Resolved
            </Button>
          )}
          <Link href="/demo/dashboard/master-admin/support-tickets">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((m: any, i: number) => (
          <Card key={i} className={m.role === 'support' ? 'border-navy/30 bg-navy/5' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${m.role === 'support' ? 'bg-navy' : 'bg-[#9C8466]'}`}>
                    {m.author[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{m.author}</p>
                    <p className="text-xs text-muted-foreground">{new Date(m.time).toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">{m.role}</Badge>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {status !== 'resolved' && (
        <Card>
          <CardHeader><CardTitle className="text-navy">Reply</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder="Write a reply…"
            />
            <div className="flex justify-end">
              <Button onClick={sendReply} disabled={!reply.trim()} className="bg-navy hover:bg-navy/90 text-white">
                <Send className="w-4 h-4 mr-1" />
                Send Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
