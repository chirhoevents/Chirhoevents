'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle, AlertCircle, Clock, XCircle, Users, CreditCard,
  Upload, Copy, Building2, Mail, Phone, Calendar, ArrowLeft, Trash2,
} from 'lucide-react'

interface VendorData {
  businessName: string
  contactFirstName: string
  contactLastName: string
  email: string
  phone: string
  boothDescription: string
  selectedTier: string
  tierPrice: number
  additionalNeeds: string | null
  logoUrl: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string | null
  invoiceTotal: number
  invoiceLineItems: Array<{ description: string; amount: number }>
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  amountPaid: number
  balance: number
  vendorCode: string
}

interface EventData {
  name: string
  dates: string
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  tshirtSize: string
  checkedIn: boolean
  liabilityStatus: string
}

const VENDORS: Record<string, { vendor: VendorData; event: EventData; staff: StaffMember[] }> = {
  'VNDACC-DEMO0001': {
    vendor: {
      businessName: 'Sacred Heart Rosary Co.',
      contactFirstName: 'Jane', contactLastName: 'Vendor',
      email: 'jane@rosaryco.com', phone: '555-0501',
      boothDescription: 'Handmade rosaries, chapel veils, sacramentals, holy medals, and Marian art.',
      selectedTier: 'Standard 10x10',
      tierPrice: 150,
      additionalNeeds: 'Electrical outlet, one 6-ft table.',
      logoUrl: null,
      status: 'approved',
      rejectionReason: null,
      invoiceTotal: 200,
      invoiceLineItems: [
        { description: 'Standard 10x10 booth', amount: 150 },
        { description: 'Extra table', amount: 25 },
        { description: 'Electrical outlet', amount: 25 },
      ],
      paymentStatus: 'unpaid',
      amountPaid: 0,
      balance: 200,
      vendorCode: 'VND-SHR-2026',
    },
    event: { name: 'Summer Youth Retreat 2026', dates: 'July 15 - 18, 2026' },
    staff: [
      { id: 's1', firstName: 'Jane', lastName: 'Vendor', email: 'jane@rosaryco.com', role: 'Owner', tshirtSize: 'M', checkedIn: false, liabilityStatus: 'complete' },
      { id: 's2', firstName: 'Michael', lastName: 'Ford', email: 'mford@rosaryco.com', role: 'Sales', tshirtSize: 'L', checkedIn: false, liabilityStatus: 'pending' },
    ],
  },
  'VNDACC-DEMO0002': {
    vendor: {
      businessName: 'Word on Fire Books', contactFirstName: 'Peter', contactLastName: 'Callahan',
      email: 'peter@wordonfire.example', phone: '555-0502',
      boothDescription: 'Catholic books, DVDs, study programs, audio talks.',
      selectedTier: 'Premium 10x20', tierPrice: 300,
      additionalNeeds: 'Two power outlets, three tables, WiFi.',
      logoUrl: null, status: 'approved', rejectionReason: null,
      invoiceTotal: 300, invoiceLineItems: [{ description: 'Premium 10x20 booth', amount: 300 }],
      paymentStatus: 'paid', amountPaid: 300, balance: 0,
      vendorCode: 'VND-WOF-2026',
    },
    event: { name: 'Summer Youth Retreat 2026', dates: 'July 15 - 18, 2026' },
    staff: [
      { id: 's1', firstName: 'Peter', lastName: 'Callahan', email: 'peter@wordonfire.example', role: 'Manager', tshirtSize: 'L', checkedIn: false, liabilityStatus: 'complete' },
      { id: 's2', firstName: 'Anne', lastName: 'Rodriguez', email: 'anne@wordonfire.example', role: 'Sales', tshirtSize: 'M', checkedIn: false, liabilityStatus: 'complete' },
      { id: 's3', firstName: 'Tom', lastName: 'Williams', email: 'tom@wordonfire.example', role: 'Sales', tshirtSize: 'XL', checkedIn: false, liabilityStatus: 'pending' },
    ],
  },
  'VNDACC-DEMO0003': {
    vendor: {
      businessName: 'Steubenville T-Shirts', contactFirstName: 'Sarah', contactLastName: 'Bell',
      email: 'sarah@stubtees.example', phone: '555-0503',
      boothDescription: 'Retreat merchandise, custom parish t-shirts, hats.',
      selectedTier: 'Standard 10x10', tierPrice: 150,
      additionalNeeds: null, logoUrl: null, status: 'pending', rejectionReason: null,
      invoiceTotal: 0, invoiceLineItems: [],
      paymentStatus: 'unpaid', amountPaid: 0, balance: 0,
      vendorCode: '',
    },
    event: { name: 'Summer Youth Retreat 2026', dates: 'July 15 - 18, 2026' },
    staff: [],
  },
}

function VendorDashboardContent() {
  const searchParams = useSearchParams()
  const accessCode = searchParams.get('code') || ''
  const record = VENDORS[accessCode]

  const [vendor, setVendor] = useState(record?.vendor)
  const [staff, setStaff] = useState(record?.staff ?? [])
  const [copySuccess, setCopySuccess] = useState(false)
  const [payAmount, setPayAmount] = useState(vendor?.balance ?? 0)
  const [cardNumber, setCardNumber] = useState('')

  if (!record || !vendor) {
    return (
      <div className="min-h-[calc(100vh-36px)] flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <p className="text-navy mb-4">No access code provided.</p>
          <Link href="/demo/vendor-portal">
            <Button className="bg-navy text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Portal
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const copyCode = () => {
    navigator.clipboard.writeText(vendor.vendorCode).catch(() => {})
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 1500)
  }

  const handlePay = () => {
    setVendor({ ...vendor, amountPaid: vendor.amountPaid + payAmount, balance: vendor.balance - payAmount, paymentStatus: vendor.balance - payAmount <= 0 ? 'paid' : 'partial' })
    setPayAmount(0)
    setCardNumber('')
    alert(`Demo: Charged $${payAmount}. No real card was charged.`)
  }

  const removeStaff = (id: string) => setStaff((prev) => prev.filter((s) => s.id !== id))

  const getStatusBadge = () => {
    if (vendor.paymentStatus === 'paid') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle className="h-4 w-4 mr-1" />Paid</span>
    if (vendor.paymentStatus === 'partial') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"><Clock className="h-4 w-4 mr-1" />Partial</span>
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><AlertCircle className="h-4 w-4 mr-1" />Unpaid</span>
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/demo">
                <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={140} height={35} className="h-9 w-auto" />
              </Link>
              <div className="hidden sm:block w-px h-8 bg-white/30" />
              <div className="hidden sm:block">
                <p className="text-sm text-white/70">Vendor Portal</p>
                <p className="font-semibold">{record.event.name}</p>
              </div>
            </div>
            <Link href="/demo/vendor-portal">
              <Button variant="outline" className="text-white border-white/40 hover:bg-white/10" size="sm">
                Exit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {vendor.status === 'pending' && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-amber-800 font-medium">Application Under Review</h3>
              <p className="text-amber-700 text-sm mt-1">
                Your vendor booth application is being reviewed. You will receive an email once a decision has been made.
              </p>
            </div>
          </div>
        )}

        {vendor.status === 'rejected' && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Application Not Approved</h3>
              <p className="text-red-700 text-sm mt-1">
                {vendor.rejectionReason || 'Your vendor booth application was not approved at this time.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1E3A5F]">Business Information</h2>
                {vendor.status === 'approved' && getStatusBadge()}
                {vendor.status === 'pending' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"><Clock className="h-4 w-4 mr-1" />Pending</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field icon={Building2} label="Business Name" value={vendor.businessName} />
                <Field label="Contact" value={`${vendor.contactFirstName} ${vendor.contactLastName}`} />
                <Field icon={Mail} label="Email" value={vendor.email} />
                <Field icon={Phone} label="Phone" value={vendor.phone} />
                <Field icon={Calendar} label="Event" value={record.event.name} />
                <Field label="Event Dates" value={record.event.dates} />
                <div className="sm:col-span-2">
                  <p className="text-sm text-[#6B7280]">Booth Description</p>
                  <p className="font-medium text-[#1F2937]">{vendor.boothDescription}</p>
                </div>
                <Field label="Selected Booth Tier" value={vendor.selectedTier} />
                {vendor.additionalNeeds && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-[#6B7280]">Additional Needs</p>
                    <p className="font-medium text-[#1F2937]">{vendor.additionalNeeds}</p>
                  </div>
                )}
              </div>
            </Card>

            {vendor.status === 'approved' && vendor.vendorCode && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">Your Vendor Code</h2>
                <p className="text-[#6B7280] mb-4">
                  Share this code with your booth staff so they can register for the event.
                </p>
                <div className="flex items-center gap-3 bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                  <code className="text-2xl font-mono font-bold text-[#1E3A5F] tracking-wider flex-1">{vendor.vendorCode}</code>
                  <Button onClick={copyCode} variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                    {copySuccess ? (
                      <><CheckCircle className="h-4 w-4 mr-2 text-green-600" />Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" />Copy</>
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => alert('Demo: Would open the staff-registration page with your vendor code pre-filled.')}
                  className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white mt-4"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Staff Registration Page
                </Button>
              </Card>
            )}

            {vendor.status === 'approved' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#1E3A5F]">Registered Booth Staff ({staff.length})</h2>
                </div>
                {staff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No booth staff registered yet.</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {staff.map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-navy">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.email} · {s.role} · T-shirt {s.tshirtSize}
                          </p>
                          <p className="text-xs mt-1">
                            Liability:{' '}
                            <span className={s.liabilityStatus === 'complete' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                              {s.liabilityStatus === 'complete' ? '✓ Complete' : 'Pending'}
                            </span>
                          </p>
                        </div>
                        <Button onClick={() => removeStaff(s.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {vendor.status === 'approved' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">Invoice</h2>
                <div className="space-y-2 mb-4">
                  {vendor.invoiceLineItems.map((line, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-700">{line.description}</span>
                      <span className="font-medium">${line.amount}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-navy border-t pt-2">
                    <span>Total</span>
                    <span>${vendor.invoiceTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>Paid</span>
                    <span>${vendor.amountPaid}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Balance</span>
                    <span className={vendor.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}>${vendor.balance}</span>
                  </div>
                </div>

                {vendor.balance > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <label className="text-xs text-muted-foreground">Amount to pay</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value) || 0)} className="pl-7" />
                    </div>
                    <label className="text-xs text-muted-foreground">Card number (demo)</label>
                    <Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="font-mono" />
                    <Button onClick={handlePay} disabled={payAmount < 1 || payAmount > vendor.balance} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
                      <CreditCard className="w-4 h-4 mr-1" />
                      Pay ${payAmount}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Demo mode — no real card charged.</p>
                  </div>
                )}
                {vendor.balance === 0 && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2 text-sm text-emerald-800">
                    <CheckCircle className="w-4 h-4" />
                    Paid in full
                  </div>
                )}
              </Card>
            )}

            {vendor.status === 'approved' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">Business Logo</h2>
                <p className="text-sm text-muted-foreground mb-3">Upload your logo so it appears on your booth signage.</p>
                <Button onClick={() => alert('Demo: Would upload logo image.')} variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Logo
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="font-medium text-[#1F2937] flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-[#9C8466]" />}
        {value}
      </p>
    </div>
  )
}

export default function VendorDashboard() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-36px)] flex items-center justify-center">Loading...</div>}>
      <VendorDashboardContent />
    </Suspense>
  )
}
