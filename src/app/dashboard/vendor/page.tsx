'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Users,
  CreditCard,
  Upload,
  Copy,
  Building2,
  Mail,
  Phone,
  Calendar,
  Trash2,
  Loader2,
} from 'lucide-react'

interface VendorData {
  id: string
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
  approvedAt: string | null
  invoiceLineItems: Array<{ description: string; amount: number }> | null
  invoiceTotal: number
  invoiceNotes: string | null
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  amountPaid: number
  balance: number
  paidAt: string | null
  vendorCode: string
  createdAt: string
}

interface EventData {
  id: string
  name: string
  slug: string
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

function VendorPortalContent() {
  const searchParams = useSearchParams()
  const accessCode = searchParams.get('code')

  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [event, setEvent] = useState<EventData | null>(null)
  const [boothStaff, setBoothStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!accessCode) {
        setError('No access code provided. Please use the link from your approval email.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/vendor/portal?code=${accessCode}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load vendor data')
        }

        const data = await response.json()
        setVendor(data.vendor)
        setEvent(data.event)
        setBoothStaff(data.boothStaff || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendor data')
      } finally {
        setLoading(false)
      }
    }

    fetchVendorData()
  }, [accessCode])

  const copyVendorCode = () => {
    if (vendor) {
      navigator.clipboard.writeText(vendor.vendorCode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !accessCode) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accessCode', accessCode)

      const response = await fetch('/api/vendor/logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload logo')
      }

      const data = await response.json()
      setVendor(prev => prev ? { ...prev, logoUrl: data.logoUrl } : null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!accessCode || !confirm('Are you sure you want to delete your logo?')) return

    setDeletingLogo(true)
    try {
      const response = await fetch(`/api/vendor/logo?code=${accessCode}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete logo')
      }

      setVendor(prev => prev ? { ...prev, logoUrl: null } : null)
    } catch (err) {
      alert('Failed to delete logo')
    } finally {
      setDeletingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F] mx-auto mb-4" />
          <p className="text-[#6B7280]">Loading vendor portal...</p>
        </div>
      </div>
    )
  }

  if (error || !vendor || !event) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2">
            Unable to Access Portal
          </h2>
          <p className="text-[#6B7280] mb-4">
            {error || 'Vendor not found'}
          </p>
          <Link href="/">
            <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              Go to Home
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
            <Clock className="h-4 w-4 mr-1" />
            Pending Review
          </span>
        )
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Paid
          </span>
        )
      case 'partial':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
            <Clock className="h-4 w-4 mr-1" />
            Partial
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-4 w-4 mr-1" />
            Unpaid
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Image
                  src="/light-logo-horizontal.png"
                  alt="ChiRho Events"
                  width={140}
                  height={35}
                  className="h-9 w-auto"
                />
              </Link>
              <div className="hidden sm:block w-px h-8 bg-white/30" />
              <div className="hidden sm:block">
                <p className="text-sm text-white/70">Vendor Portal</p>
                <p className="font-semibold">{event.name}</p>
              </div>
            </div>
            {vendor.logoUrl && (
              <div className="bg-white rounded-lg p-2">
                <img
                  src={vendor.logoUrl}
                  alt={vendor.businessName}
                  className="h-10 w-auto object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {vendor.status === 'pending' && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex">
              <Clock className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-amber-800 font-medium">Application Under Review</h3>
                <p className="text-amber-700 text-sm mt-1">
                  Your vendor booth application is being reviewed. You will receive an email once a decision has been made.
                </p>
              </div>
            </div>
          </div>
        )}

        {vendor.status === 'rejected' && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-medium">Application Not Approved</h3>
                <p className="text-red-700 text-sm mt-1">
                  {vendor.rejectionReason || 'Your vendor booth application was not approved at this time.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Business Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Details Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1E3A5F]">
                  Business Information
                </h2>
                {getStatusBadge(vendor.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#6B7280]">Business Name</p>
                  <p className="font-medium text-[#1F2937] flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#9C8466]" />
                    {vendor.businessName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Contact</p>
                  <p className="font-medium text-[#1F2937]">
                    {vendor.contactFirstName} {vendor.contactLastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Email</p>
                  <p className="font-medium text-[#1F2937] flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#9C8466]" />
                    {vendor.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Phone</p>
                  <p className="font-medium text-[#1F2937] flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#9C8466]" />
                    {vendor.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Event</p>
                  <p className="font-medium text-[#1F2937] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#9C8466]" />
                    {event.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Event Dates</p>
                  <p className="font-medium text-[#1F2937]">{event.dates}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-[#6B7280]">Booth Description</p>
                  <p className="font-medium text-[#1F2937]">{vendor.boothDescription}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Selected Booth Tier</p>
                  <p className="font-medium text-[#1F2937]">{vendor.selectedTier}</p>
                </div>
                {vendor.additionalNeeds && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-[#6B7280]">Additional Needs</p>
                    <p className="font-medium text-[#1F2937]">{vendor.additionalNeeds}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Vendor Code Card - Only show if approved */}
            {vendor.status === 'approved' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">
                  Your Vendor Code
                </h2>
                <p className="text-[#6B7280] mb-4">
                  Share this code with your booth staff so they can register for the event.
                </p>
                <div className="flex items-center gap-3 bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                  <code className="text-2xl font-mono font-bold text-[#1E3A5F] tracking-wider flex-1">
                    {vendor.vendorCode}
                  </code>
                  <Button
                    onClick={copyVendorCode}
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F]"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Link href={`/events/${event.slug}/register-staff`} className="mt-4 block">
                  <Button className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white">
                    <Users className="h-4 w-4 mr-2" />
                    Staff Registration Page
                  </Button>
                </Link>
              </Card>
            )}

            {/* Booth Staff Card - Only show if approved */}
            {vendor.status === 'approved' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#1E3A5F]">
                    Registered Booth Staff
                  </h2>
                  <span className="text-[#6B7280]">
                    {boothStaff.length} {boothStaff.length === 1 ? 'person' : 'people'}
                  </span>
                </div>

                {boothStaff.length === 0 ? (
                  <div className="text-center py-8 text-[#6B7280]">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No staff have registered yet.</p>
                    <p className="text-sm mt-1">
                      Share your vendor code with your team to get started.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E5E7EB]">
                          <th className="text-left py-3 px-2 text-sm font-medium text-[#6B7280]">Name</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-[#6B7280]">Role</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-[#6B7280]">Liability Form</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-[#6B7280]">Checked In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boothStaff.map((staff) => (
                          <tr key={staff.id} className="border-b border-[#E5E7EB] last:border-0">
                            <td className="py-3 px-2">
                              <p className="font-medium text-[#1F2937]">
                                {staff.firstName} {staff.lastName}
                              </p>
                              <p className="text-sm text-[#6B7280]">{staff.email}</p>
                            </td>
                            <td className="py-3 px-2 text-[#1F2937]">{staff.role}</td>
                            <td className="py-3 px-2">
                              {staff.liabilityStatus === 'completed' ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  Completed
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              {staff.checkedIn ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  Yes
                                </span>
                              ) : (
                                <span className="text-[#6B7280]">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right Column - Payment & Logo */}
          <div className="space-y-6">
            {/* Invoice Card - Only show if approved */}
            {vendor.status === 'approved' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#1E3A5F]">
                    Invoice
                  </h2>
                  {getPaymentBadge(vendor.paymentStatus)}
                </div>

                {vendor.invoiceLineItems && vendor.invoiceLineItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {vendor.invoiceLineItems.map((item, index) => (
                            <tr key={index} className="border-b border-[#E5E7EB] last:border-0">
                              <td className="py-3 px-4 text-[#1F2937]">{item.description}</td>
                              <td className="py-3 px-4 text-right text-[#1F2937] font-medium">
                                ${Number(item.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-[#F9FAFB] font-semibold">
                            <td className="py-3 px-4 text-[#1E3A5F]">Total</td>
                            <td className="py-3 px-4 text-right text-[#1E3A5F]">
                              ${vendor.invoiceTotal.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {vendor.invoiceNotes && (
                      <div className="bg-[#F9FAFB] p-3 rounded-lg">
                        <p className="text-sm text-[#6B7280]">Notes:</p>
                        <p className="text-sm text-[#1F2937]">{vendor.invoiceNotes}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                      <span className="text-[#6B7280]">Paid</span>
                      <span className="font-medium text-green-600">${vendor.amountPaid.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7280]">Balance Due</span>
                      <span className={`text-xl font-bold ${vendor.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${vendor.balance.toFixed(2)}
                      </span>
                    </div>

                    {vendor.paymentStatus !== 'paid' && (
                      <Button className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                    )}

                    {vendor.paidAt && (
                      <p className="text-sm text-center text-green-600">
                        Paid in full on {new Date(vendor.paidAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[#6B7280] text-center py-4">
                    Invoice details will appear here once finalized.
                  </p>
                )}
              </Card>
            )}

            {/* Logo Upload Card - Only show if approved */}
            {vendor.status === 'approved' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">
                  Business Logo
                </h2>
                <p className="text-sm text-[#6B7280] mb-4">
                  Upload your logo to be displayed at the event.
                </p>

                {vendor.logoUrl ? (
                  <div className="space-y-4">
                    <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB] flex items-center justify-center">
                      <img
                        src={vendor.logoUrl}
                        alt={vendor.businessName}
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                        <Button
                          variant="outline"
                          className="w-full border-[#1E3A5F] text-[#1E3A5F]"
                          disabled={uploadingLogo}
                          asChild
                        >
                          <span>
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Change
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <Button
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50"
                        onClick={handleDeleteLogo}
                        disabled={deletingLogo}
                      >
                        {deletingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                    <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center cursor-pointer hover:border-[#9C8466] transition-colors">
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="h-8 w-8 mx-auto mb-2 text-[#9C8466] animate-spin" />
                          <p className="text-[#6B7280]">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-[#9C8466]" />
                          <p className="text-[#6B7280]">Click to upload logo</p>
                          <p className="text-xs text-[#9CA3AF] mt-1">PNG, JPG, GIF up to 5MB</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </Card>
            )}

            {/* Quick Links Card */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">
                Quick Links
              </h2>
              <div className="space-y-2">
                <a href={`mailto:support@chirhoevents.com?subject=Vendor Question - ${vendor.businessName}`}>
                  <Button variant="outline" className="w-full border-[#1E3A5F] text-[#1E3A5F]">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Organizers
                  </Button>
                </a>
                <Link href="/">
                  <Button variant="outline" className="w-full border-[#1E3A5F] text-[#1E3A5F]">
                    ChiRho Events Home
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-[#6B7280]">
          <p>Powered by ChiRho Events</p>
        </div>
      </footer>
    </div>
  )
}

export default function VendorPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F] mx-auto mb-4" />
          <p className="text-[#6B7280]">Loading vendor portal...</p>
        </div>
      </div>
    }>
      <VendorPortalContent />
    </Suspense>
  )
}
