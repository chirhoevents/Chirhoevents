'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, HandHeart, Wallet, FolderX, BookOpen, CalendarHeart, CheckCircle2, Circle, Copy, ExternalLink, ChevronRight,
} from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { formatDateTime, formatMoney, formatShortDate } from '@/lib/lux/format'
import { SIMPLE_EVENT_STATUS_LABELS, type SimpleEventStatus } from '@/lib/lux/simple-event'
import { PROGRAM_STATUS_LABELS } from '@/lib/lux/program-status'
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Spinner, StatCard } from '@/components/lux/ui'

interface Overview {
  attention: {
    documentsToReview: number
    documentsMissing: number
    feeAssistance: number
    ordersOwing: number
    ordersOwed: number
    eventBalancesOwing: number
    eventBalancesOwed: number
  }
  programs: Array<{ id: string; name: string; term: string; status: string; capacity: number | null; registered: number }>
  events: Array<{ id: string; name: string; startDate: string; liveStatus: SimpleEventStatus; people: number; capacityTotal: number | null }>
  recent: Array<{ kind: 'program' | 'event'; id: string; href: string; who: string; what: string; at: string }>
  setup: {
    paymentsReady: boolean
    documentStorageReady: boolean
    publicSlug: string | null
    hasLogo: boolean
    hasContactEmail: boolean
    feeRulesSet: boolean
    officeInstructionsSet: boolean
    hasPrograms: boolean
    hasEvents: boolean
  }
}

export default function LuxHomePage() {
  const api = useLuxApi()
  const { info } = useLux()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Overview>('/api/lux/overview').then(setData).catch(e => setError(e.message))
  }, [api])

  if (error) return <ErrorNote message={error} />
  if (!data) return <Spinner />

  const { attention: a, setup } = data
  const parishUrl = typeof window !== 'undefined' && setup.publicSlug ? `${window.location.origin}/lux/${setup.publicSlug}` : ''
  const owed = a.ordersOwed + a.eventBalancesOwed
  const owingCount = a.ordersOwing + a.eventBalancesOwing

  const steps = [
    { done: setup.hasPrograms || setup.hasEvents, label: 'Set up your first program or event', href: '/dashboard/lux/new' },
    { done: setup.paymentsReady, label: 'Connect Stripe to take card payments', href: '/dashboard/lux/settings?tab=integrations', optional: 'Skip if families only pay at the office' },
    { done: setup.feeRulesSet, label: 'Set your sibling discount or family maximum', href: '/dashboard/lux/settings', optional: 'If your parish offers one' },
    { done: setup.officeInstructionsSet, label: 'Add instructions for paying at the office', href: '/dashboard/lux/settings' },
    { done: setup.hasLogo, label: 'Add your parish logo', href: '/dashboard/lux/settings?tab=branding' },
    { done: setup.hasContactEmail, label: 'Add a contact email so families can reply to you', href: '/dashboard/lux/settings?tab=organization' },
  ]
  const remaining = steps.filter(s => !s.done)

  return (
    <div className="space-y-6">
      <PageHeader
        title={info.organizationName}
        description="Here’s what needs your attention."
        actions={info.canManage && <Button variant="gold" href="/dashboard/lux/new"><Plus className="h-4 w-4" /> Set something up</Button>}
      />

      {!setup.documentStorageReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Document uploads aren’t available yet.</strong> Secure storage for certificates is still being set up for your account.
          Families can register, and the document checklist will open as soon as it’s ready. Contact ChiRho Events support with questions.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Documents to review" value={a.documentsToReview} href="/dashboard/lux/documents?view=review"
          tone={a.documentsToReview ? 'warn' : 'default'} hint={<span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Uploaded or parish lookups</span>} />
        <StatCard label="Fee assistance requests" value={a.feeAssistance} href="/dashboard/lux/payments"
          tone={a.feeAssistance ? 'warn' : 'default'} hint={<span className="inline-flex items-center gap-1"><HandHeart className="h-3.5 w-3.5" /> Waiting on a decision</span>} />
        <StatCard label="Still owed" value={formatMoney(owed)} href="/dashboard/lux/payments"
          hint={<span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> {owingCount} famil{owingCount === 1 ? 'y' : 'ies'} or registrants</span>} />
        <StatCard label="Documents missing" value={a.documentsMissing} href="/dashboard/lux/documents?view=missing"
          hint={<span className="inline-flex items-center gap-1"><FolderX className="h-3.5 w-3.5" /> Families still need to upload</span>} />
      </div>

      {info.canManage && remaining.length > 0 && (
        <Card title="Getting set up" description={`${steps.length - remaining.length} of ${steps.length} done`}>
          <ul className="space-y-2 text-sm">
            {steps.map(s => (
              <li key={s.label} className="flex items-start gap-2">
                {s.done ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-5 w-5 text-gray-300 shrink-0" />}
                {s.done ? <span className="text-gray-500 line-through">{s.label}</span> : (
                  <span>
                    <Link href={s.href} className="text-[#1E3A5F] hover:underline font-medium">{s.label}</Link>
                    {s.optional && <span className="text-gray-500"> · {s.optional}</span>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {setup.publicSlug && (
        <Card title="Your parish page" description="Share this link in the bulletin, on your website or in an email. Families register for everything here.">
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 rounded-lg bg-[#FAF8F3] border border-[#E8E2D4] px-3 py-2 text-sm text-[#1E3A5F] truncate">{parishUrl}</code>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(parishUrl); toast.success('Link copied') }}><Copy className="h-4 w-4" /> Copy</Button>
              <Button variant="ghost" href={`/lux/${setup.publicSlug}`}><ExternalLink className="h-4 w-4" /> Open</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={<span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-[#C8A24A]" /> Programs</span>}
          actions={<Link href="/dashboard/lux/programs" className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">See all</Link>}>
          {data.programs.length === 0 ? (
            <EmptyState title="No programs yet" description="Faith Formation, First Communion, Confirmation and more."
              action={info.canManage && <Button href="/dashboard/lux/programs/new">Set up a program</Button>} />
          ) : (
            <div className="divide-y divide-[#F0EBDF] -mx-5">
              {data.programs.slice(0, 6).map(p => (
                <Link key={p.id} href={`/dashboard/lux/programs/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F3]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1E3A5F] truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.term} · {p.registered}{p.capacity ? ` / ${p.capacity}` : ''} children</p>
                  </div>
                  <Badge tone={p.status === 'open' ? 'green' : p.status === 'draft' ? 'gray' : 'red'}>{PROGRAM_STATUS_LABELS[p.status] ?? p.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title={<span className="flex items-center gap-2"><CalendarHeart className="h-5 w-5 text-[#C8A24A]" /> Upcoming events</span>}
          description={info.simpleEvents.limit !== null ? `${info.simpleEvents.used} of ${info.simpleEvents.limit} events used this year` : undefined}
          actions={<Link href="/dashboard/lux/programs" className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">See all</Link>}>
          {data.events.length === 0 ? (
            <EmptyState title="Nothing coming up" description="Fish fry, Bible study, retreat or picnic: a sign-up page in a couple of minutes."
              action={info.canManage && <Button href="/dashboard/lux/events/new">Set up an event</Button>} />
          ) : (
            <div className="divide-y divide-[#F0EBDF] -mx-5">
              {data.events.map(e => (
                <Link key={e.id} href={`/dashboard/lux/events/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F3]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1E3A5F] truncate">{e.name}</p>
                    <p className="text-xs text-gray-500">{formatShortDate(e.startDate)} · {e.people}{e.capacityTotal ? ` / ${e.capacityTotal}` : ''} signed up</p>
                  </div>
                  <Badge tone={e.liveStatus === 'open' ? 'green' : e.liveStatus === 'draft' ? 'gray' : e.liveStatus === 'full' ? 'amber' : 'blue'}>
                    {SIMPLE_EVENT_STATUS_LABELS[e.liveStatus]}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {data.recent.length > 0 && (
        <Card title="Latest sign-ups" actions={<Link href="/dashboard/lux/registrations" className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">See all</Link>}>
          <div className="divide-y divide-[#F0EBDF] -mx-5">
            {data.recent.map(r => (
              <Link key={`${r.kind}-${r.id}`} href={r.href} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#FAF8F3] text-sm">
                {r.kind === 'program' ? <BookOpen className="h-4 w-4 text-[#C8A24A] shrink-0" /> : <CalendarHeart className="h-4 w-4 text-[#C8A24A] shrink-0" />}
                <span className="flex-1 min-w-0 truncate"><strong className="text-gray-900">{r.who}</strong> <span className="text-gray-600">· {r.what}</span></span>
                <span className="text-xs text-gray-500 shrink-0">{formatDateTime(r.at)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
