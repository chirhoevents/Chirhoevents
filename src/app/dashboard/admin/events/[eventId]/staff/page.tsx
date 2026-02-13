'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Loader2,
  Search,
  Download,
  Users,
  Building2,
  CheckCircle,
  Mail,
  FileText,
  Printer,
} from 'lucide-react'
import { format } from 'date-fns'
import CustomQuestionsManager from '@/components/admin/CustomQuestionsManager'

interface CustomAnswer {
  questionText: string
  answerText: string | null
}

interface StaffRegistration {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  tshirtSize: string
  dietaryRestrictions: string | null
  isVendorStaff: boolean
  vendorCode: string | null
  pricePaid: number
  paymentStatus: string
  porosAccessCode: string | null
  liabilityFormId: string | null
  checkedIn: boolean
  createdAt: string
  vendorRegistration?: {
    businessName: string
  }
  liabilityForm?: {
    status: string
  }
  customAnswers?: CustomAnswer[]
}

interface EventData {
  id: string
  name: string
  slug: string
}

export default function StaffManagementPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { getToken } = useAuth()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [staffList, setStaffList] = useState<StaffRegistration[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'general' | 'vendor'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Fetch event
      const eventResponse = await fetch(`/api/admin/events/${eventId}`, { headers })
      if (!eventResponse.ok) throw new Error('Failed to fetch event')
      const eventData = await eventResponse.json()
      setEvent(eventData.event)

      // Fetch staff registrations
      const staffResponse = await fetch(`/api/admin/events/${eventId}/staff`, { headers })
      if (!staffResponse.ok) throw new Error('Failed to fetch staff')
      const staffData = await staffResponse.json()
      setStaffList(staffData.staff || [])
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      `${staff.firstName} ${staff.lastName} ${staff.email} ${staff.role}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    const matchesType =
      filterType === 'all' ||
      (filterType === 'general' && !staff.isVendorStaff) ||
      (filterType === 'vendor' && staff.isVendorStaff)
    return matchesSearch && matchesType
  })

  const stats = {
    total: staffList.length,
    general: staffList.filter((s) => !s.isVendorStaff).length,
    vendor: staffList.filter((s) => s.isVendorStaff).length,
    checkedIn: staffList.filter((s) => s.checkedIn).length,
    porosComplete: staffList.filter((s) => s.liabilityForm?.status === 'approved').length,
  }

  const handleExportCSV = () => {
    // Collect unique custom question texts for column headers
    const customQuestionTexts: string[] = []
    for (const s of filteredStaff) {
      for (const a of s.customAnswers || []) {
        if (!customQuestionTexts.includes(a.questionText)) {
          customQuestionTexts.push(a.questionText)
        }
      }
    }

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Type', 'T-Shirt', 'Dietary', 'Vendor', 'Payment', 'Poros', 'Checked In', ...customQuestionTexts]
    const rows = filteredStaff.map((s) => {
      const baseRow = [
        s.firstName,
        s.lastName,
        s.email,
        s.phone,
        s.role,
        s.isVendorStaff ? 'Vendor Staff' : 'General',
        s.tshirtSize,
        s.dietaryRestrictions || '',
        s.vendorRegistration?.businessName || '',
        s.paymentStatus,
        s.liabilityForm?.status || 'N/A',
        s.checkedIn ? 'Yes' : 'No',
      ]
      // Add custom answers in order
      const answerValues = customQuestionTexts.map((qt) => {
        const answer = s.customAnswers?.find((a) => a.questionText === qt)
        return answer?.answerText || ''
      })
      return [...baseRow, ...answerValues]
    })

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staff-${event?.slug || eventId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const handleResendPorosCode = async (staffId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/staff/${staffId}/resend-poros`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to resend')
      alert('Poros access code email sent!')
    } catch (err) {
      alert('Failed to resend Poros code')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={loadData} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/admin/events/${eventId}`}
            className="text-sm text-[#6B7280] hover:text-[#1E3A5F] flex items-center mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Staff & Volunteers</h1>
          <p className="text-[#6B7280]">{event?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print Name Tags
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-[#1E3A5F]">{stats.total}</p>
            <p className="text-sm text-[#6B7280]">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.general}</p>
            <p className="text-sm text-[#6B7280]">General Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.vendor}</p>
            <p className="text-sm text-[#6B7280]">Vendor Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
            <p className="text-sm text-[#6B7280]">Checked In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.porosComplete}</p>
            <p className="text-sm text-[#6B7280]">Forms Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Link */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#1E3A5F]">Staff Registration Link</p>
              <p className="text-sm text-[#6B7280]">
                {typeof window !== 'undefined' ? window.location.origin : ''}/events/{event?.slug}/register-staff
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/events/${event?.slug}/register-staff`
                navigator.clipboard.writeText(url)
                alert('Link copied!')
              }}
            >
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <CustomQuestionsManager eventId={eventId} appliesTo="staff" getToken={getToken} />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterType === 'general' ? 'default' : 'outline'}
            onClick={() => setFilterType('general')}
            size="sm"
          >
            <Users className="h-4 w-4 mr-1" />
            General
          </Button>
          <Button
            variant={filterType === 'vendor' ? 'default' : 'outline'}
            onClick={() => setFilterType('vendor')}
            size="sm"
          >
            <Building2 className="h-4 w-4 mr-1" />
            Vendor
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>T-Shirt</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Poros</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                    No staff registrations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                        <p className="text-xs text-[#6B7280]">{staff.email}</p>
                        {staff.customAnswers && staff.customAnswers.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {staff.customAnswers.map((answer, i) => (
                              <p key={i} className="text-xs text-[#6B7280]">
                                <span className="font-medium">{answer.questionText}:</span>{' '}
                                {answer.answerText || 'N/A'}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell>
                      {staff.isVendorStaff ? (
                        <div>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            Vendor
                          </Badge>
                          {staff.vendorRegistration && (
                            <p className="text-xs text-[#6B7280] mt-1">{staff.vendorRegistration.businessName}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Users className="h-3 w-3 mr-1" />
                          General
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{staff.tshirtSize}</TableCell>
                    <TableCell>
                      {staff.paymentStatus === 'paid' || staff.pricePaid === 0 ? (
                        <Badge className="bg-green-500">Paid</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.porosAccessCode ? (
                        staff.liabilityForm?.status === 'approved' ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <FileText className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )
                      ) : (
                        <span className="text-xs text-[#6B7280]">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {staff.porosAccessCode && staff.liabilityForm?.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResendPorosCode(staff.id)}
                            title="Resend Poros Code"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
