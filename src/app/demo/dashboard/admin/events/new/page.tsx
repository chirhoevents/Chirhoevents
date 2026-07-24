'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Home,
  ClipboardCheck,
  Stethoscope,
} from 'lucide-react'

type Step = 'basics' | 'location' | 'capacity' | 'pricing' | 'modules' | 'questions' | 'review'

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'basics', label: 'Basics', icon: Calendar },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'capacity', label: 'Capacity', icon: Users },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'modules', label: 'Modules', icon: Home },
  { id: 'questions', label: 'Questions', icon: FileText },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

const TEMPLATE_QUESTIONS = [
  { id: 'diocese_name', label: 'What diocese are you from?', category: 'parish_info' },
  { id: 'parish_name', label: 'What parish do you belong to?', category: 'parish_info' },
  { id: 'grade_level', label: 'What grade are you in?', category: 'demographics' },
  { id: 'tshirt_size', label: 'What is your T-shirt size?', category: 'demographics' },
  { id: 'attended_before', label: 'Have you attended this event before?', category: 'event_experience' },
  { id: 'sacraments_received', label: 'What sacraments have you received?', category: 'faith' },
  { id: 'transportation_method', label: 'How will you be getting to the event?', category: 'logistics' },
  { id: 'needs_housing', label: 'Do you need housing?', category: 'logistics' },
  { id: 'dietary_restrictions_structured', label: 'Do you have any dietary restrictions?', category: 'dietary' },
  { id: 'food_allergies', label: 'Please list any food allergies', category: 'dietary' },
  { id: 'special_notes', label: 'Anything else you would like us to know?', category: 'notes' },
]

export default function NewEventWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('basics')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    startDate: '',
    endDate: '',
    description: '',
    locationName: '',
    locationAddress: '',
    capacityTotal: 200,
    pricePerPerson: 150,
    depositPerSeat: 50,
    porosEnabled: true,
    salveEnabled: true,
    raphaEnabled: true,
    selectedQuestions: new Set<string>(['grade_level', 'tshirt_size', 'food_allergies']),
  })

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }))
  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const next = () => stepIndex < STEPS.length - 1 && setStep(STEPS[stepIndex + 1].id)
  const back = () => stepIndex > 0 && setStep(STEPS[stepIndex - 1].id)

  const toggleQuestion = (id: string) => {
    const next = new Set(form.selectedQuestions)
    next.has(id) ? next.delete(id) : next.add(id)
    setForm({ ...form, selectedQuestions: next })
  }

  const handleCreate = () => {
    alert(`Demo: Event "${form.name}" would be created and appear in the events list. Redirecting…`)
    router.push('/demo/dashboard/admin/events')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <span className="text-navy font-medium">New Event</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-navy">Create New Event</h1>
        <p className="text-muted-foreground">Set up your event with a step-by-step wizard.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center flex-wrap gap-1">
        {STEPS.map((s, i) => {
          const isCurrent = step === s.id
          const isDone = i < stepIndex
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  isCurrent
                    ? 'bg-navy text-white'
                    : isDone
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-muted-foreground hover:bg-gray-100'
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-300 mx-1" />}
            </div>
          )
        })}
      </div>

      {step === 'basics' && (
        <Card>
          <CardHeader><CardTitle>Event Basics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Event name</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Summer Youth Retreat 2027" className="mt-1" />
            </div>
            <div>
              <Label>URL slug</Label>
              <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="summer-retreat-2027" className="mt-1 font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Public URL: /events/{form.slug || 'your-slug'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className="mt-1" placeholder="Describe the event for your public registration page…" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'location' && (
        <Card>
          <CardHeader><CardTitle>Venue Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Venue name</Label>
              <Input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} placeholder="Franciscan University of Steubenville" className="mt-1" />
            </div>
            <div>
              <Label>Full address</Label>
              <Input value={form.locationAddress} onChange={(e) => set('locationAddress', e.target.value)} placeholder="1235 University Blvd, Steubenville, OH 43952" className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'capacity' && (
        <Card>
          <CardHeader><CardTitle>Capacity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Total capacity</Label>
              <Input type="number" value={form.capacityTotal} onChange={(e) => set('capacityTotal', Number(e.target.value) || 0)} className="mt-1 max-w-xs" />
              <p className="text-xs text-muted-foreground mt-1">Registration closes automatically when this cap is reached.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'pricing' && (
        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Price per person</Label>
              <div className="relative mt-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input type="number" value={form.pricePerPerson} onChange={(e) => set('pricePerPerson', Number(e.target.value) || 0)} className="pl-7" />
              </div>
            </div>
            <div>
              <Label>Group deposit (per seat reserved)</Label>
              <div className="relative mt-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input type="number" value={form.depositPerSeat} onChange={(e) => set('depositPerSeat', Number(e.target.value) || 0)} className="pl-7" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Group leaders pay this per seat up front; balance is due before event.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'modules' && (
        <Card>
          <CardHeader><CardTitle>Enable Portals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ModuleToggle icon={Home} label="Poros" description="Housing, seating, small groups, staff assignments" enabled={form.porosEnabled} onChange={(v) => set('porosEnabled', v)} />
            <ModuleToggle icon={ClipboardCheck} label="Salve" description="On-site check-in, name tags, welcome packets" enabled={form.salveEnabled} onChange={(v) => set('salveEnabled', v)} />
            <ModuleToggle icon={Stethoscope} label="Rapha" description="Medical roster, incident tracking, emergency contacts" enabled={form.raphaEnabled} onChange={(v) => set('raphaEnabled', v)} />
          </CardContent>
        </Card>
      )}

      {step === 'questions' && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Questions</CardTitle>
            <p className="text-sm text-muted-foreground">Pick from ChiRho&apos;s question library or add your own custom questions later.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TEMPLATE_QUESTIONS.map((q) => (
                <label key={q.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${form.selectedQuestions.has(q.id) ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={form.selectedQuestions.has(q.id)} onChange={() => toggleQuestion(q.id)} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium text-navy">{q.label}</p>
                    <Badge variant="secondary" className="text-xs mt-1 capitalize">{q.category.replace('_', ' ')}</Badge>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {form.selectedQuestions.size} question{form.selectedQuestions.size !== 1 ? 's' : ''} selected
            </p>
          </CardContent>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <CardHeader><CardTitle>Review &amp; Create</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ReviewRow label="Event name" value={form.name || <em className="text-muted-foreground">Missing</em>} />
            <ReviewRow label="Dates" value={form.startDate && form.endDate ? `${form.startDate} → ${form.endDate}` : <em className="text-muted-foreground">Missing</em>} />
            <ReviewRow label="Location" value={form.locationName || <em className="text-muted-foreground">Missing</em>} />
            <ReviewRow label="Capacity" value={`${form.capacityTotal} participants`} />
            <ReviewRow label="Price" value={`$${form.pricePerPerson}/person (deposit $${form.depositPerSeat}/seat)`} />
            <ReviewRow label="Portals enabled" value={[form.porosEnabled && 'Poros', form.salveEnabled && 'Salve', form.raphaEnabled && 'Rapha'].filter(Boolean).join(', ') || 'None'} />
            <ReviewRow label="Custom questions" value={`${form.selectedQuestions.size} selected`} />
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              After creating the event, you can invite team members, generate access codes, set up coupons, and publish it to your public event listing.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between">
        <Button onClick={back} disabled={stepIndex === 0} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {step === 'review' ? (
          <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Save className="w-4 h-4 mr-1" />
            Create Event (Demo)
          </Button>
        ) : (
          <Button onClick={next} className="bg-navy hover:bg-navy/90 text-white">
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

function ModuleToggle({ icon: Icon, label, description, enabled, onChange }: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer ${enabled ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'}`}>
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <Icon className={`w-5 h-5 mt-0.5 ${enabled ? 'text-navy' : 'text-gray-400'}`} />
      <div className="flex-1">
        <p className="font-medium text-navy">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-navy text-right">{value}</span>
    </div>
  )
}
