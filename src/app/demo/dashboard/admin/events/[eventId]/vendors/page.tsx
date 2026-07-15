'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Store, Check, X, Mail, DollarSign, ArrowLeft, Plus } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface DemoVendor {
  id: string
  businessName: string
  contactName: string
  contactEmail: string
  boothType: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  amountPaid: number
}

const INITIAL_VENDORS: DemoVendor[] = [
  { id: 'v1', businessName: 'Sacred Heart Rosary Co.', contactName: 'Jane Vendor', contactEmail: 'jane@rosaryco.com', boothType: 'Standard 10x10', description: 'Handmade rosaries, chapel veils, sacramentals.', status: 'approved', amountPaid: 150 },
  { id: 'v2', businessName: 'Word on Fire Books', contactName: 'Peter Callahan', contactEmail: 'peter@wordonfire.example', boothType: 'Premium 10x20', description: 'Catholic books, DVDs, study programs.', status: 'approved', amountPaid: 300 },
  { id: 'v3', businessName: 'Steubenville T-Shirts', contactName: 'Sarah Bell', contactEmail: 'sarah@stubtees.example', boothType: 'Standard 10x10', description: 'Retreat merchandise, custom parish t-shirts.', status: 'pending', amountPaid: 0 },
  { id: 'v4', businessName: 'Ave Maria Coffee', contactName: 'Mike Roberts', contactEmail: 'mike@amcoffee.example', boothType: 'Non-profit', description: 'Fair-trade coffee from monastery.', status: 'pending', amountPaid: 0 },
]

export default function EventVendorsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [vendors, setVendors] = useState<DemoVendor[]>(INITIAL_VENDORS)

  if (!eventName) notFound()

  const approve = (id: string) => setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'approved' as const } : v)))
  const reject = (id: string) => setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'rejected' as const } : v)))

  const pending = vendors.filter((v) => v.status === 'pending')
  const approved = vendors.filter((v) => v.status === 'approved')
  const rejected = vendors.filter((v) => v.status === 'rejected')
  const revenue = approved.reduce((n, v) => n + v.amountPaid, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Vendors</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Vendors for {eventName}</h1>
          <p className="text-[#6B7280]">Review applications, approve booths, track fees</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/demo/dashboard/admin/events/${eventId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Event
            </Button>
          </Link>
          <Button
            onClick={() => alert('Demo: Would open a form to invite a vendor directly, bypassing the public application.')}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Invite Vendor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1E3A5F]/10 rounded-lg">
                <Store className="h-5 w-5 text-[#1E3A5F]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Vendors</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">{vendors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-emerald-700">{approved.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Mail className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor Revenue</p>
                <p className="text-2xl font-bold text-green-700">${revenue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Pending Applications ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {pending.map((v) => (
                <VendorRow key={v.id} vendor={v} onApprove={() => approve(v.id)} onReject={() => reject(v.id)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Approved Vendors ({approved.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {approved.map((v) => (
              <VendorRow key={v.id} vendor={v} />
            ))}
          </div>
        </CardContent>
      </Card>

      {rejected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Rejected ({rejected.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {rejected.map((v) => (
                <VendorRow key={v.id} vendor={v} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VendorRow({
  vendor,
  onApprove,
  onReject,
}: {
  vendor: DemoVendor
  onApprove?: () => void
  onReject?: () => void
}) {
  return (
    <div className="p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 bg-[#9C8466]/10 rounded-lg flex-shrink-0">
          <Store className="h-5 w-5 text-[#9C8466]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-navy">{vendor.businessName}</h3>
            <Badge
              className={
                vendor.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : vendor.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
              }
            >
              {vendor.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {vendor.contactName} · {vendor.contactEmail}
          </p>
          <p className="text-sm text-muted-foreground">
            {vendor.boothType} · Paid ${vendor.amountPaid}
          </p>
          <p className="text-sm text-gray-700 mt-1">{vendor.description}</p>
        </div>
      </div>
      {vendor.status === 'pending' && onApprove && onReject && (
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={onApprove} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button onClick={onReject} size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
