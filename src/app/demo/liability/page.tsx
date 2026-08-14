'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, CheckCircle, ArrowLeft } from 'lucide-react'

type Variant = 'youth' | 'adult' | 'chaperone' | 'clergy'

const VARIANTS: Record<Variant, { title: string; description: string; requiresParent: boolean }> = {
  youth: { title: 'Youth Under 18', description: 'For participants under 18. A parent or guardian must sign.', requiresParent: true },
  adult: { title: 'Adult (Self)', description: 'For participants 18 or older. Sign your own waiver.', requiresParent: false },
  chaperone: { title: 'Chaperone', description: 'For adults chaperoning youth. Includes conduct expectations.', requiresParent: false },
  clergy: { title: 'Clergy', description: 'For priests and deacons. Includes ministerial-role affirmations.', requiresParent: false },
}

export default function LiabilityWaiver() {
  const [variant, setVariant] = useState<Variant | null>(null)
  const [step, setStep] = useState<'select' | 'sign' | 'done'>('select')
  const [form, setForm] = useState({
    participantName: '',
    signerName: '',
    relationship: '',
    email: '',
    agreed: false,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('done')
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <p className="text-xs uppercase tracking-wider text-[#E1D5BA]">Waiver Signature</p>
              <h1 className="text-2xl font-bold">Liability Form</h1>
            </div>
          </div>
          <Link href="/demo" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Demo home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {step === 'select' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Which waiver do you need to sign?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  ChiRho supports four waiver variants. Pick the one that matches you or your participant.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(VARIANTS) as Variant[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => { setVariant(v); setStep('sign') }}
                      className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-[#1E3A5F] transition"
                    >
                      <h3 className="font-semibold text-[#1E3A5F]">{VARIANTS[v].title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{VARIANTS[v].description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'sign' && variant && (
          <Card>
            <CardHeader>
              <CardTitle>{VARIANTS[variant].title} Waiver</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="rounded border border-slate-200 bg-[#F5F1E8] p-4 text-sm text-slate-700 max-h-60 overflow-y-auto">
                  <p className="mb-2"><strong>Waiver of Liability and Consent for Treatment</strong></p>
                  <p className="mb-2">
                    I acknowledge that participation in the event involves risks including but not limited to physical
                    injury, illness, or emotional distress. I agree to release the organizer, its officers, staff, and
                    volunteers from all claims arising from participation in the event.
                  </p>
                  <p className="mb-2">
                    I authorize the on-site medical staff to provide first aid or arrange transport to a medical
                    facility in case of emergency. I take responsibility for any resulting medical expenses.
                  </p>
                  {variant === 'chaperone' && (
                    <p className="mb-2">
                      <strong>Chaperone Code of Conduct:</strong> I agree to maintain appropriate boundaries with youth
                      participants at all times, follow diocesan Safe Environment protocols, and immediately report any
                      concerns to the event director.
                    </p>
                  )}
                  {variant === 'clergy' && (
                    <p className="mb-2">
                      <strong>Ministerial Role:</strong> I confirm I am in good standing with my diocese/religious
                      community and have provided a letter of good standing to the event organizer.
                    </p>
                  )}
                  <p className="text-xs italic">
                    (Placeholder text for demonstration purposes only. Real waivers are per-event and drafted with legal counsel.)
                  </p>
                </div>

                <div>
                  <Label>Participant name</Label>
                  <Input
                    value={form.participantName}
                    onChange={(e) => setForm({ ...form, participantName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                {VARIANTS[variant].requiresParent && (
                  <div>
                    <Label>Parent / guardian name (signer)</Label>
                    <Input
                      value={form.signerName}
                      onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                )}
                {!VARIANTS[variant].requiresParent && (
                  <div>
                    <Label>Signature (type your full name)</Label>
                    <Input
                      value={form.signerName}
                      onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label>Email (for signed copy)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                    className="mt-1"
                    required
                  />
                  <span>I have read and agree to the waiver above.</span>
                </label>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setStep('select')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button type="submit" disabled={!form.agreed} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Submit Signed Waiver
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">Waiver signed</h2>
              <p className="text-emerald-800 mb-4">
                A demo copy would be emailed to <strong>{form.email}</strong>.
              </p>
              <Link href="/demo">
                <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  Demo home
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
