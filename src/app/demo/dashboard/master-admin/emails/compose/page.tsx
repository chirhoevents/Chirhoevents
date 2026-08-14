'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, ArrowLeft, Users, Eye } from 'lucide-react'

const AUDIENCES = [
  { id: 'all', label: 'All organizations', count: 14 },
  { id: 'active', label: 'Active only', count: 13 },
  { id: 'trial', label: 'Trial accounts', count: 2 },
  { id: 'enterprise', label: 'Enterprise tier only', count: 2 },
  { id: 'past_due', label: 'Past-due accounts', count: 1 },
]

const TEMPLATES = [
  { id: 'update', name: 'Monthly platform update', subject: 'ChiRho monthly update — {{month}}' },
  { id: 'feature', name: 'New feature announcement', subject: 'New feature: {{feature_name}}' },
  { id: 'maintenance', name: 'Maintenance window', subject: 'Scheduled maintenance {{date}}' },
  { id: 'blank', name: 'Start from scratch', subject: '' },
]

export default function ComposePage() {
  const [audience, setAudience] = useState('all')
  const [template, setTemplate] = useState('blank')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [sent, setSent] = useState(false)

  const audienceObj = AUDIENCES.find((a) => a.id === audience)!

  const applyTemplate = (id: string) => {
    setTemplate(id)
    const t = TEMPLATES.find((x) => x.id === id)!
    setSubject(t.subject)
    if (id === 'update') {
      setBody('Hi {{first_name}},\n\nHere is what changed on ChiRho this month:\n\n• Feature 1\n• Feature 2\n• Bug fixes\n\nQuestions? Reply to this email.\n\n— The ChiRho team')
    } else if (id === 'feature') {
      setBody('Hi {{first_name}},\n\nWe just shipped a new feature we think you will love: {{feature_name}}.\n\n[What it does]\n[Where to find it]\n\n— The ChiRho team')
    } else if (id === 'maintenance') {
      setBody('Hi {{first_name}},\n\nHeads up: we will be doing scheduled maintenance on {{date}} from {{start_time}} to {{end_time}}. The platform will be briefly unavailable.\n\nNo action needed on your end.\n\n— The ChiRho team')
    } else {
      setBody('')
    }
  }

  const handleSend = () => {
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/master-admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/master-admin/emails" className="hover:text-navy">Emails</Link>
        <span>/</span>
        <span className="text-navy font-medium">Compose</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Compose Announcement</h1>
          <p className="text-muted-foreground">Send a message to organizations on the platform</p>
        </div>
        <Link href="/demo/dashboard/master-admin/emails">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-navy">Audience</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AUDIENCES.map((a) => (
              <label
                key={a.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                  audience === a.id ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  checked={audience === a.id}
                  onChange={() => setAudience(a.id)}
                />
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 font-medium text-navy">{a.label}</span>
                <Badge variant="secondary">{a.count} recipients</Badge>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-navy">Template</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className={`p-3 border rounded-lg text-left text-sm ${
                  template === t.id ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-navy">{t.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-navy">Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Enter subject line…" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Body</Label>
              <Button onClick={() => setShowPreview(!showPreview)} variant="ghost" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your message… supports {{first_name}}, {{org_name}}, {{tier}} variables."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available variables: <code>{'{{first_name}}'}</code>, <code>{'{{org_name}}'}</code>, <code>{'{{tier}}'}</code>
            </p>
          </div>

          {showPreview && (
            <div className="p-4 bg-[#F5F1E8] border border-[#E1D5BA] rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview (for Steubenville Ministries)</p>
              <div className="bg-white rounded border border-gray-200 p-4">
                <p className="font-semibold text-navy mb-2">
                  {subject.replace(/{{month}}/g, 'July 2026').replace(/{{feature_name}}/g, 'Custom Report Builder').replace(/{{date}}/g, 'Aug 15')}
                </p>
                <div className="text-sm whitespace-pre-wrap text-gray-700">
                  {body
                    .replace(/{{first_name}}/g, 'Demo')
                    .replace(/{{org_name}}/g, 'Steubenville Ministries')
                    .replace(/{{tier}}/g, 'Professional')
                    .replace(/{{feature_name}}/g, 'Custom Report Builder')
                    .replace(/{{date}}/g, 'Aug 15')
                    .replace(/{{start_time}}/g, '10 PM ET')
                    .replace(/{{end_time}}/g, '11 PM ET')
                    .replace(/{{month}}/g, 'July')}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button
          onClick={() => alert('Demo: Would save as draft.')}
          variant="outline"
        >
          Save Draft
        </Button>
        <Button
          onClick={handleSend}
          disabled={!subject || !body}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Send className="w-4 h-4 mr-1" />
          {sent ? `Sent to ${audienceObj.count} recipients` : `Send to ${audienceObj.count} recipients`}
        </Button>
      </div>
    </div>
  )
}
