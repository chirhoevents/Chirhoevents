'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, ArrowRight, ArrowLeft, Users, CreditCard, Copy } from 'lucide-react'

const EVENTS: Record<string, { name: string; price: number; depositPerSeat: number }> = {
  'evt-summer-retreat': { name: 'Summer Youth Retreat 2026', price: 285, depositPerSeat: 100 },
  'evt-diocesan-conference': { name: 'Diocesan Youth Conference', price: 195, depositPerSeat: 75 },
  'evt-mens-retreat': { name: "Men's Silent Retreat", price: 320, depositPerSeat: 150 },
}

type Step = 'info' | 'seats' | 'payment' | 'done'

export default function GroupRegistration() {
  const [eventId, setEventId] = useState('evt-summer-retreat')
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState({
    groupName: '',
    parishName: '',
    leaderName: '',
    leaderEmail: '',
    leaderPhone: '',
    seats: 10,
    notes: '',
  })
  const [cardNumber, setCardNumber] = useState('')
  const [processing, setProcessing] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const evt = new URLSearchParams(window.location.search).get('event')
      if (evt && EVENTS[evt]) setEventId(evt)
    }
  }, [])

  const event = EVENTS[eventId]
  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }))

  const total = event.price * form.seats
  const deposit = event.depositPerSeat * form.seats
  const balance = total - deposit

  const submitInfo = (e: React.FormEvent) => { e.preventDefault(); setStep('seats') }
  const submitSeats = (e: React.FormEvent) => { e.preventDefault(); setStep('payment') }
  const submitPayment = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      const code = `${form.groupName.slice(0, 6).toUpperCase().replace(/\s/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      setConfirmationCode(code)
      setStep('done')
    }, 700)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(confirmationCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#E1D5BA]">Group Registration</p>
            <h1 className="text-2xl font-bold">{event.name}</h1>
          </div>
          <Link href="/demo/events" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to events
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          {[
            { id: 'info', label: 'Group', icon: Users },
            { id: 'seats', label: 'Seats', icon: Users },
            { id: 'payment', label: 'Deposit', icon: CreditCard },
            { id: 'done', label: 'Reserved', icon: CheckCircle },
          ].map((s, i, arr) => {
            const isCurrent = step === s.id
            const isDone = arr.findIndex((x) => x.id === step) > i
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      isCurrent ? 'bg-[#1E3A5F] text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm font-medium hidden md:block ${isCurrent ? 'text-[#1E3A5F]' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        {step === 'info' && (
          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitInfo} className="space-y-4">
                <div>
                  <Label>Group name</Label>
                  <Input value={form.groupName} onChange={(e) => set('groupName', e.target.value)} required placeholder="e.g., St. Mary's Youth Group" className="mt-1" />
                </div>
                <div>
                  <Label>Parish / Organization</Label>
                  <Input value={form.parishName} onChange={(e) => set('parishName', e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Leader name</Label>
                    <Input value={form.leaderName} onChange={(e) => set('leaderName', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Leader email</Label>
                    <Input type="email" value={form.leaderEmail} onChange={(e) => set('leaderEmail', e.target.value)} required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Leader phone</Label>
                  <Input value={form.leaderPhone} onChange={(e) => set('leaderPhone', e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>Notes for organizers</Label>
                  <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="mt-1" />
                </div>
                <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'seats' && (
          <Card>
            <CardHeader>
              <CardTitle>Reserve Seats</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitSeats} className="space-y-4">
                <div>
                  <Label>How many seats do you want to reserve?</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.seats}
                    onChange={(e) => set('seats', Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can add or remove seats after reserving, before the event closes.
                  </p>
                </div>
                <div className="p-4 bg-[#F5F1E8] rounded-lg border border-[#E1D5BA] space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{form.seats} seats × ${event.price}/person</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Deposit today (${event.depositPerSeat}/seat)</span>
                    <span>${deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 border-t border-[#E1D5BA] pt-1 mt-1">
                    <span>Balance due later</span>
                    <span>${balance.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setStep('info')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Continue to Deposit
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle>Pay Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-[#F5F1E8] rounded-lg border border-[#E1D5BA]">
                <div className="flex justify-between text-sm mb-2">
                  <span>{form.groupName}</span>
                  <span>{form.seats} seats</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#E1D5BA]">
                  <span>Deposit due today</span>
                  <span>${deposit.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Balance of ${balance.toLocaleString()} due 30 days before event.
                </p>
              </div>
              <div>
                <Label>Card number (demo)</Label>
                <Input
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="mt-1 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">Demo mode — no real card is validated or charged.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep('seats')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={submitPayment}
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {processing ? 'Processing…' : `Pay Deposit $${deposit.toLocaleString()}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">Group reserved!</h2>
              <p className="text-emerald-800 mb-4">
                You&apos;ve reserved {form.seats} seats for {form.groupName}.
              </p>
              <div className="bg-white border border-emerald-200 rounded-lg p-4 max-w-md mx-auto mb-4">
                <p className="text-xs text-slate-500 mb-1">Your access code</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="font-mono text-lg font-bold text-[#1E3A5F]">{confirmationCode}</code>
                  <Button onClick={copyCode} variant="ghost" size="sm">
                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Share this code with participants so they can sign their waivers, or use it to log into the Group Leader portal.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Link href="/demo/dashboard/group-leader">
                  <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">
                    Open Group Leader Portal
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" className="border-emerald-700 text-emerald-700">
                    Demo home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
