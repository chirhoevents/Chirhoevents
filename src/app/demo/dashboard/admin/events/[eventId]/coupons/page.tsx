'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Ticket, Plus, Trash2, ArrowLeft, Percent, DollarSign } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface Coupon {
  id: string
  code: string
  discountType: 'percent' | 'flat'
  discountValue: number
  usesTotal: number | null
  usesRemaining: number | null
  timesUsed: number
  active: boolean
}

const INITIAL_COUPONS: Coupon[] = [
  { id: 'c1', code: 'EARLYBIRD', discountType: 'percent', discountValue: 15, usesTotal: 100, usesRemaining: 63, timesUsed: 37, active: true },
  { id: 'c2', code: 'LEADER25', discountType: 'flat', discountValue: 25, usesTotal: null, usesRemaining: null, timesUsed: 12, active: true },
  { id: 'c3', code: 'PARISH50', discountType: 'flat', discountValue: 50, usesTotal: 20, usesRemaining: 0, timesUsed: 20, active: false },
]

export default function CouponsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS)
  const [showNew, setShowNew] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent')
  const [discountValue, setDiscountValue] = useState(10)
  const [usesTotal, setUsesTotal] = useState<string>('')

  if (!eventName) notFound()

  const create = () => {
    if (!code.trim()) return
    setCoupons((prev) => [
      ...prev,
      {
        id: `c-${Math.random().toString(36).slice(2, 8)}`,
        code: code.toUpperCase(),
        discountType,
        discountValue,
        usesTotal: usesTotal ? Number(usesTotal) : null,
        usesRemaining: usesTotal ? Number(usesTotal) : null,
        timesUsed: 0,
        active: true,
      },
    ])
    setCode('')
    setDiscountValue(10)
    setUsesTotal('')
    setShowNew(false)
  }

  const toggle = (id: string) => setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)))
  const remove = (id: string) => setCoupons((prev) => prev.filter((c) => c.id !== id))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Coupons</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Ticket className="w-7 h-7 text-navy" />
            <h1 className="text-2xl font-bold text-navy">Coupons</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Discount codes for {eventName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/demo/dashboard/admin/events/${eventId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <Button onClick={() => setShowNew(true)} className="bg-navy hover:bg-navy/90 text-white">
            <Plus className="w-4 h-4 mr-1" />
            New Coupon
          </Button>
        </div>
      </div>

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>New Coupon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                  className="font-mono mt-1"
                />
              </div>
              <div>
                <Label>Discount type</Label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="percent">Percent off</option>
                  <option value="flat">Flat dollars off</option>
                </select>
              </div>
              <div>
                <Label>{discountType === 'percent' ? 'Percent (%)' : 'Amount ($)'}</Label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max uses (blank = unlimited)</Label>
                <Input
                  type="number"
                  value={usesTotal}
                  onChange={(e) => setUsesTotal(e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} className="bg-navy hover:bg-navy/90 text-white">
                Create Coupon
              </Button>
              <Button onClick={() => setShowNew(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Coupons ({coupons.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {coupons.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-sm bg-[#F5F1E8] px-3 py-1 rounded border border-[#E1D5BA] text-navy">
                      {c.code}
                    </code>
                    <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      {c.discountType === 'percent' ? (
                        <>
                          <Percent className="w-3 h-3" />
                          {c.discountValue}% off
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3" />
                          ${c.discountValue} off
                        </>
                      )}
                    </span>
                    <Badge className={c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>
                      {c.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Used {c.timesUsed} time{c.timesUsed !== 1 ? 's' : ''}
                    {c.usesTotal !== null && ` · ${c.usesRemaining} of ${c.usesTotal} remaining`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => toggle(c.id)} size="sm" variant="outline">
                    {c.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => remove(c.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
