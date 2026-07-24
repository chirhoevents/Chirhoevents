'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft, Users, DollarSign, FileText, Mail, Phone, MapPin,
  Edit, RefreshCw, CreditCard, Download, CheckCircle, AlertCircle,
} from 'lucide-react'

const REGISTRATIONS: Record<string, any> = {
  'reg-1': {
    id: 'reg-1', type: 'group', eventId: 'evt-summer-retreat', eventName: 'Summer Youth Retreat 2026',
    groupName: "St. Mary's Youth Group", parishName: "St. Mary's Catholic Church",
    leaderName: 'Sample Leader', leaderEmail: 'leader@example.com', leaderPhone: '555-0100',
    accessCode: 'STMARY-2026', totalAmount: 2850, amountPaid: 855, balance: 1995,
    paymentStatus: 'partial', registeredAt: '2026-05-12T14:22:00Z',
    participants: [
      { name: 'Ana Garcia', age: 16, role: 'participant', waiver: true },
      { name: 'Isabella Martinez', age: 15, role: 'participant', waiver: true },
      { name: 'Sofia Nguyen', age: 17, role: 'participant', waiver: true },
      { name: 'Ben Smith', age: 15, role: 'participant', waiver: false },
      { name: 'Chris Lee', age: 17, role: 'participant', waiver: true },
      { name: "David O'Connor", age: 16, role: 'participant', waiver: true },
      { name: 'Ethan Patel', age: 14, role: 'participant', waiver: false },
      { name: 'Maria Thompson', age: 42, role: 'chaperone', waiver: true },
      { name: 'James Rodriguez', age: 38, role: 'chaperone', waiver: true },
      { name: 'Sample Leader', age: 35, role: 'leader', waiver: false },
    ],
    payments: [
      { date: '2026-05-12', method: 'Card ending 4242', amount: 285, note: 'Group deposit (1 seat)' },
      { date: '2026-05-28', method: 'Card ending 4242', amount: 570, note: 'Additional payment' },
    ],
    activity: [
      { time: '2026-05-12T14:22:00Z', text: 'Group registration created' },
      { time: '2026-05-12T14:23:00Z', text: 'Access code STMARY-2026 generated' },
      { time: '2026-05-12T14:25:00Z', text: 'Deposit paid ($285)' },
      { time: '2026-05-28T09:15:00Z', text: 'Additional payment ($570)' },
      { time: '2026-06-01T10:22:00Z', text: 'Participants added: Ana Garcia, Isabella Martinez' },
      { time: '2026-06-08T14:15:00Z', text: 'Waivers signed for 7 participants' },
    ],
  },
  'reg-2': {
    id: 'reg-2', type: 'group', eventId: 'evt-summer-retreat', eventName: 'Summer Youth Retreat 2026',
    groupName: 'St. John Paul II Parish', parishName: 'St. John Paul II Parish',
    leaderName: 'Fr. Michael Kowalski', leaderEmail: 'frmichael@sjp2.org', leaderPhone: '555-0220',
    accessCode: 'SJP2-EARLY', totalAmount: 1140, amountPaid: 1140, balance: 0,
    paymentStatus: 'paid_full', registeredAt: '2026-04-28T09:15:00Z',
    participants: [
      { name: 'Grace Kim', age: 16, role: 'participant', waiver: true },
      { name: 'Luke Anderson', age: 17, role: 'participant', waiver: true },
      { name: 'Emma Reyes', age: 15, role: 'participant', waiver: true },
      { name: 'Fr. Michael Kowalski', age: 45, role: 'leader', waiver: true },
    ],
    payments: [
      { date: '2026-04-28', method: 'Card ending 1111', amount: 1140, note: 'Full payment' },
    ],
    activity: [
      { time: '2026-04-28T09:15:00Z', text: 'Group registration created' },
      { time: '2026-04-28T09:16:00Z', text: 'Full payment received' },
      { time: '2026-05-05T11:00:00Z', text: 'All 4 waivers signed' },
    ],
  },
  'reg-4': {
    id: 'reg-4', type: 'individual', eventId: 'evt-mens-retreat', eventName: "Men's Silent Retreat",
    groupName: 'Thomas Wright', parishName: null,
    leaderName: 'Thomas Wright', leaderEmail: 'twright@example.com', leaderPhone: '555-0301',
    totalAmount: 320, amountPaid: 320, balance: 0,
    paymentStatus: 'paid_full', registeredAt: '2026-06-18T18:44:00Z',
    participants: [{ name: 'Thomas Wright', age: 34, role: 'participant', waiver: true }],
    payments: [{ date: '2026-06-18', method: 'Card ending 5555', amount: 320, note: 'Full payment' }],
    activity: [
      { time: '2026-06-18T18:44:00Z', text: 'Individual registration created' },
      { time: '2026-06-18T18:45:00Z', text: 'Full payment received' },
      { time: '2026-06-18T18:47:00Z', text: 'Waiver signed' },
    ],
  },
}

const statusColors: Record<string, string> = {
  paid_full: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  pending: 'bg-red-100 text-red-800',
}

export default function RegistrationDetailPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const regId = params?.registrationId as string
  const reg = REGISTRATIONS[regId]
  const [payAmount, setPayAmount] = useState<number>(reg?.balance ?? 0)

  if (!reg) notFound()

  const signedWaivers = reg.participants.filter((p: any) => p.waiver).length

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{reg.eventName}</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}/registrations`} className="hover:text-navy">Registrations</Link>
        <span>/</span>
        <span className="text-navy font-medium">{reg.groupName}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-navy">{reg.groupName}</h1>
            <Badge variant="secondary" className="capitalize">{reg.type}</Badge>
            <Badge className={statusColors[reg.paymentStatus]}>{reg.paymentStatus.replace('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Registered {new Date(reg.registeredAt).toLocaleDateString()}
            {reg.parishName && ` · ${reg.parishName}`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={() => alert('Demo: Would open the edit registration modal.')}
            variant="outline"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            onClick={() => alert('Demo: Would open the email composer to send a custom message to this group.')}
            variant="outline"
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
          <Link href={`/demo/dashboard/admin/events/${eventId}/registrations`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Participants" value={reg.participants.length} />
        <Stat icon={FileText} label="Waivers signed" value={`${signedWaivers} / ${reg.participants.length}`} />
        <Stat icon={DollarSign} label="Paid" value={`$${reg.amountPaid}`} accent="text-emerald-700" />
        <Stat icon={DollarSign} label="Balance" value={`$${reg.balance}`} accent={reg.balance > 0 ? 'text-amber-700' : 'text-emerald-700'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: contact + access code */}
        <Card>
          <CardHeader><CardTitle className="text-navy">Leader Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{reg.leaderName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{reg.leaderEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{reg.leaderPhone}</span>
            </div>
            {reg.accessCode && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Access code</p>
                <code className="font-mono text-sm bg-[#F5F1E8] px-3 py-1.5 rounded border border-[#E1D5BA] text-navy">
                  {reg.accessCode}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle + right: tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="participants" className="space-y-4">
            <TabsList>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="participants">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200">
                    {reg.participants.map((p: any) => (
                      <div key={p.name} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-navy">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Age {p.age} · {p.role}</p>
                        </div>
                        {p.waiver ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Waiver signed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200">
                    {reg.payments.map((p: any, i: number) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-navy">${p.amount}</p>
                          <p className="text-xs text-muted-foreground">{p.date} · {p.method} · {p.note}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => alert(`Demo: Would download receipt.`)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {reg.balance > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-[#F5F1E8]">
                      <p className="text-sm font-medium text-navy mb-2">Record a payment</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1 max-w-xs">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            value={payAmount}
                            onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                            className="pl-7 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <Button
                          onClick={() => alert(`Demo: Would record $${payAmount} payment (check, cash, or virtual terminal).`)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Record
                        </Button>
                        <Button
                          onClick={() => alert('Demo: Would open the refund modal.')}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Refund
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200 text-sm">
                    {reg.activity.map((a: any, i: number) => (
                      <div key={i} className="p-3">
                        <p className="text-navy">{a.text}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.time).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent || 'text-navy'}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold ${accent || 'text-navy'}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
