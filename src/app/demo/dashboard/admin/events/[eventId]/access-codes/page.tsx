'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Key, Copy, Plus, Trash2, ArrowLeft, Check } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface AccessCode {
  id: string
  code: string
  label: string
  usesRemaining: number | null
  totalUses: number
  createdAt: string
}

const INITIAL_CODES: AccessCode[] = [
  { id: 'ac1', code: 'STMARY-2026', label: "St. Mary's Youth Group", usesRemaining: null, totalUses: 1, createdAt: '2026-05-12' },
  { id: 'ac2', code: 'SJP2-EARLY', label: 'St. John Paul II Parish (early bird)', usesRemaining: 0, totalUses: 1, createdAt: '2026-04-28' },
  { id: 'ac3', code: 'HOLYFAM-2026', label: 'Holy Family Community', usesRemaining: null, totalUses: 1, createdAt: '2026-06-22' },
  { id: 'ac4', code: 'SCHOLARSHIP-10', label: 'Scholarship codes (10 uses)', usesRemaining: 7, totalUses: 3, createdAt: '2026-03-15' },
]

export default function AccessCodesPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [codes, setCodes] = useState<AccessCode[]>(INITIAL_CODES)
  const [newLabel, setNewLabel] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  if (!eventName) notFound()

  const generateCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    ).join('-')
  }

  const create = () => {
    if (!newLabel.trim()) return
    setCodes((prev) => [
      ...prev,
      {
        id: `ac-${Math.random().toString(36).slice(2, 8)}`,
        code: generateCode(),
        label: newLabel.trim(),
        usesRemaining: null,
        totalUses: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ])
    setNewLabel('')
  }

  const remove = (id: string) => setCodes((prev) => prev.filter((c) => c.id !== id))

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Access Codes</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Key className="w-7 h-7 text-navy" />
            <h1 className="text-2xl font-bold text-navy">Access Codes</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Share access codes with group leaders to unlock group registration for {eventName}
          </p>
        </div>
        <Link href={`/demo/dashboard/admin/events/${eventId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Event
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Access Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-2xl">
            <Input
              placeholder="Label (e.g., St. Mary's Youth Group)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <Button onClick={create} disabled={!newLabel.trim()} className="bg-navy hover:bg-navy/90 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Generate Code
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Codes ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {codes.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-sm bg-[#F5F1E8] px-3 py-1 rounded border border-[#E1D5BA] text-navy">
                      {c.code}
                    </code>
                    <button
                      onClick={() => copy(c.code)}
                      className="text-xs text-navy hover:text-navy/70 flex items-center gap-1"
                    >
                      {copied === c.code ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{c.totalUses} uses</Badge>
                    {c.usesRemaining !== null && (
                      <Badge variant="secondary">{c.usesRemaining} remaining</Badge>
                    )}
                    <span>Created {c.createdAt}</span>
                  </div>
                </div>
                <Button
                  onClick={() => remove(c.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
