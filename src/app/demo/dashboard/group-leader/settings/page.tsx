'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Save, Trash2, Check } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    groupName: "St. Mary's Youth Group",
    organization: "St. Mary's Catholic Church",
    leaderName: 'Sample Leader',
    leaderEmail: 'leader@example.com',
    leaderPhone: '555-0100',
    notes: 'We have one participant with peanut allergies (EpiPen on file).',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const copy = () => {
    navigator.clipboard.writeText('STMARY-2026').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Settings</h1>
        <p className="text-[#6B7280]">Group information and preferences</p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">Group Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Group / Parish name</Label>
              <Input value={form.groupName} onChange={(e) => set('groupName', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Organization</Label>
              <Input value={form.organization} onChange={(e) => set('organization', e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Leader name</Label>
                <Input value={form.leaderName} onChange={(e) => set('leaderName', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Leader email</Label>
                <Input type="email" value={form.leaderEmail} onChange={(e) => set('leaderEmail', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Leader phone</Label>
              <Input value={form.leaderPhone} onChange={(e) => set('leaderPhone', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Notes for organizers</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                <Save className="w-4 h-4 mr-2" />
                {saved ? 'Saved' : 'Save Changes'}
              </Button>
              {saved && (
                <span className="text-sm text-emerald-700 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Access Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Share this code with co-leaders so they can access this group's dashboard.
          </p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-lg bg-[#F5F1E8] px-4 py-2 rounded border border-[#E1D5BA] text-navy">
              STMARY-2026
            </code>
            <Button onClick={copy} variant="outline" size="sm">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 mb-4">
            Cancel your entire group registration. This deletes all participants and cannot be undone.
            Deposits are non-refundable per event policy.
          </p>
          <Button
            onClick={() => alert('Demo: Would open a confirmation modal, then cancel the registration.')}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel Group Registration
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
