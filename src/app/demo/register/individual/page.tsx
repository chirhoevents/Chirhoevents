'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, ArrowRight, ArrowLeft, User, FileText, CreditCard } from 'lucide-react'

const EVENTS: Record<string, { name: string; price: number }> = {
  'evt-summer-retreat': { name: 'Summer Youth Retreat 2026', price: 285 },
  'evt-diocesan-conference': { name: 'Diocesan Youth Conference', price: 195 },
  'evt-mens-retreat': { name: "Men's Silent Retreat", price: 320 },
}

type Step = 'info' | 'waiver' | 'payment' | 'done'

export default function IndividualRegistration() {
  const [eventId, setEventId] = useState('evt-summer-retreat')
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'F' as 'M' | 'F',
    email: '',
    phone: '',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medications: '',
    dietary: 'None',
    signerName: '',
    waiverAgreed: false,
  })
  const [cardNumber, setCardNumber] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const evt = new URLSearchParams(window.location.search).get('event')
      if (evt && EVENTS[evt]) setEventId(evt)
    }
  }, [])

  const event = EVENTS[eventId]
  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }))

  const isMinor = Number(form.age) < 18

  const submitInfo = (e: React.FormEvent) => { e.preventDefault(); setStep('waiver') }
  const submitWaiver = (e: React.FormEvent) => { e.preventDefault(); setStep('payment') }
  const submitPayment = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setStep('done')
    }, 700)
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#E1D5BA]">Individual Registration</p>
            <h1 className="text-2xl font-bold">{event.name}</h1>
          </div>
          <Link href="/demo/events" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to events
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8">
          {[
            { id: 'info', label: 'Participant', icon: User },
            { id: 'waiver', label: 'Waiver', icon: FileText },
            { id: 'payment', label: 'Payment', icon: CreditCard },
            { id: 'done', label: 'Confirmed', icon: CheckCircle },
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
              <CardTitle>Participant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitInfo} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First name</Label>
                    <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Age</Label>
                    <Input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2">
                      <option value="F">F</option>
                      <option value="M">M</option>
                    </select>
                  </div>
                  <div>
                    <Label>Dietary</Label>
                    <select value={form.dietary} onChange={(e) => set('dietary', e.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2">
                      <option>None</option>
                      <option>Vegetarian</option>
                      <option>Vegan</option>
                      <option>Gluten-free</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} required className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Emergency contact name</Label>
                    <Input value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Emergency contact phone</Label>
                    <Input value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Allergies (if any)</Label>
                  <Textarea value={form.allergies} onChange={(e) => set('allergies', e.target.value)} rows={2} className="mt-1" />
                </div>
                <div>
                  <Label>Medications (if any)</Label>
                  <Textarea value={form.medications} onChange={(e) => set('medications', e.target.value)} rows={2} className="mt-1" />
                </div>
                <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                  Continue to Waiver
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'waiver' && (
          <Card>
            <CardHeader>
              <CardTitle>Liability Waiver</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitWaiver} className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {isMinor
                    ? 'Because the participant is under 18, a parent or guardian must sign this waiver.'
                    : 'Please review and sign the participant waiver below.'}
                </div>
                <div className="rounded border border-slate-200 bg-[#F5F1E8] p-4 text-sm text-slate-700 max-h-48 overflow-y-auto">
                  <p className="mb-2">
                    <strong>Waiver of Liability and Consent for Treatment</strong>
                  </p>
                  <p className="mb-2">
                    I acknowledge that participation in {event.name} involves risks including but not limited to physical injury.
                    I agree to release the organizer, its staff, and volunteers from liability for injuries or losses sustained during the event.
                    I authorize the on-site medical staff to provide emergency treatment if needed.
                  </p>
                  <p className="text-xs italic">
                    (Placeholder text for demonstration purposes only.)
                  </p>
                </div>
                <div>
                  <Label>{isMinor ? 'Parent / guardian signature (typed)' : 'Signature (typed)'}</Label>
                  <Input value={form.signerName} onChange={(e) => set('signerName', e.target.value)} required className="mt-1" />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.waiverAgreed}
                    onChange={(e) => set('waiverAgreed', e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <span>I have read and agree to the waiver above.</span>
                </label>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setStep('info')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button type="submit" disabled={!form.waiverAgreed} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Continue to Payment
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
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-[#F5F1E8] rounded-lg border border-[#E1D5BA]">
                <div className="flex justify-between text-sm">
                  <span>Event registration ({form.firstName} {form.lastName})</span>
                  <span>${event.price}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-[#E1D5BA]">
                  <span>Total due</span>
                  <span>${event.price}</span>
                </div>
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
                <Button onClick={() => setStep('waiver')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={submitPayment}
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {processing ? 'Processing…' : `Pay $${event.price}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">You're registered!</h2>
              <p className="text-emerald-800 mb-1">Confirmation code: <code className="font-mono font-bold">IND-{Math.random().toString(36).slice(2, 8).toUpperCase()}</code></p>
              <p className="text-sm text-emerald-800 mt-4">
                A demo confirmation email would have been sent to <strong>{form.email}</strong>.
              </p>
              <div className="flex gap-2 justify-center mt-6">
                <Link href="/demo/events">
                  <Button variant="outline" className="border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white">
                    Back to events
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">
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
