'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Download,
  Mail,
  Eye,
  Filter,
  ChevronDown,
  Users,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Pencil,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import EditGroupRegistrationModal from '@/components/admin/EditGroupRegistrationModal'
import EditIndividualRegistrationModal from '@/components/admin/EditIndividualRegistrationModal'

interface GroupRegistration {
  id: string
  type: 'group'
  groupName: string
  parishName: string | null
  leaderName: string
  leaderEmail: string
  leaderPhone: string
  participantCount: number
  housingType: string
  registeredAt: string
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: string
  formsCompleted: number
  formsTotal: number
}

interface IndividualRegistration {
  id: string
  type: 'individual'
  firstName: string
  lastName: string
  email: string
  phone: string
  age: number | null
  housingType: string | null
  registeredAt: string
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: string
  formCompleted: boolean
}

interface RegistrationsClientProps {
  eventId: string
  eventName: string
  groupRegistrations: GroupRegistration[]
  individualRegistrations: IndividualRegistration[]
  totalRegistrations: number
  totalParticipants: number
}

type RegistrationType = 'all' | 'group' | 'individual'
type PaymentFilter = 'all' | 'paid' | 'balance' | 'overdue'
type FormsFilter = 'all' | 'complete' | 'pending'

export default function RegistrationsClient({
  eventId,
  eventName,
  groupRegistrations,
  individualRegistrations,
  totalRegistrations,
  totalParticipants,
}: RegistrationsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [registrationTypeFilter, setRegistrationTypeFilter] =
    useState<RegistrationType>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [formsFilter, setFormsFilter] = useState<FormsFilter>('all')
  const [editingRegistration, setEditingRegistration] = useState<GroupRegistration | null>(null)
  const [editingIndividualRegistration, setEditingIndividualRegistration] = useState<IndividualRegistration | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Filter registrations
  const filteredGroupRegs = useMemo(() => {
    let filtered = groupRegistrations

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (reg) =>
          reg.groupName.toLowerCase().includes(query) ||
          reg.parishName?.toLowerCase().includes(query) ||
          reg.leaderName.toLowerCase().includes(query) ||
          reg.leaderEmail.toLowerCase().includes(query)
      )
    }

    // Payment filter
    if (paymentFilter === 'paid') {
      filtered = filtered.filter((reg) => reg.balance === 0)
    } else if (paymentFilter === 'balance') {
      filtered = filtered.filter((reg) => reg.balance > 0)
    }

    // Forms filter
    if (formsFilter === 'complete') {
      filtered = filtered.filter(
        (reg) => reg.formsCompleted === reg.formsTotal
      )
    } else if (formsFilter === 'pending') {
      filtered = filtered.filter((reg) => reg.formsCompleted < reg.formsTotal)
    }

    return filtered
  }, [groupRegistrations, searchQuery, paymentFilter, formsFilter])

  const filteredIndividualRegs = useMemo(() => {
    let filtered = individualRegistrations

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (reg) =>
          reg.firstName.toLowerCase().includes(query) ||
          reg.lastName.toLowerCase().includes(query) ||
          reg.email.toLowerCase().includes(query)
      )
    }

    // Payment filter
    if (paymentFilter === 'paid') {
      filtered = filtered.filter((reg) => reg.balance === 0)
    } else if (paymentFilter === 'balance') {
      filtered = filtered.filter((reg) => reg.balance > 0)
    }

    return filtered
  }, [individualRegistrations, searchQuery, paymentFilter])

  const showGroups =
    registrationTypeFilter === 'all' || registrationTypeFilter === 'group'
  const showIndividuals =
    registrationTypeFilter === 'all' || registrationTypeFilter === 'individual'

  const getPaymentStatusBadge = (status: string, balance: number) => {
    if (balance === 0) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      )
    } else if (status === 'overdue') {
      return (
        <Badge className="bg-red-500 text-white">
          <XCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-orange-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Balance Due
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/admin/events/${eventId}`}
          className="text-sm text-[#9C8466] hover:underline mb-2 inline-block"
        >
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Registrations - {eventName}
        </h1>
        <p className="text-[#6B7280]">
          {totalRegistrations} registrations ({totalParticipants} participants)
        </p>
      </div>

      {/* Actions Bar */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, parish, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/dashboard/admin/events/${eventId}/registrations/new`}>
                <Button
                  size="sm"
                  className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manual Registration
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="border-[#1E3A5F] text-[#1E3A5F]"
                disabled
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#1E3A5F] text-[#1E3A5F]"
                disabled
              >
                <Mail className="h-4 w-4 mr-2" />
                Email All
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">Filters:</span>
            </div>

            {/* Registration Type Filter */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={registrationTypeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setRegistrationTypeFilter('all')}
                className={
                  registrationTypeFilter === 'all'
                    ? 'bg-[#1E3A5F] text-white'
                    : ''
                }
              >
                All
              </Button>
              <Button
                size="sm"
                variant={
                  registrationTypeFilter === 'group' ? 'default' : 'outline'
                }
                onClick={() => setRegistrationTypeFilter('group')}
                className={
                  registrationTypeFilter === 'group'
                    ? 'bg-[#1E3A5F] text-white'
                    : ''
                }
              >
                <Users className="h-3 w-3 mr-1" />
                Groups
              </Button>
              <Button
                size="sm"
                variant={
                  registrationTypeFilter === 'individual' ? 'default' : 'outline'
                }
                onClick={() => setRegistrationTypeFilter('individual')}
                className={
                  registrationTypeFilter === 'individual'
                    ? 'bg-[#1E3A5F] text-white'
                    : ''
                }
              >
                <User className="h-3 w-3 mr-1" />
                Individuals
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Payment Filter */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={paymentFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setPaymentFilter('all')}
                className={
                  paymentFilter === 'all' ? 'bg-[#1E3A5F] text-white' : ''
                }
              >
                All Payments
              </Button>
              <Button
                size="sm"
                variant={paymentFilter === 'paid' ? 'default' : 'outline'}
                onClick={() => setPaymentFilter('paid')}
                className={
                  paymentFilter === 'paid' ? 'bg-green-600 text-white' : ''
                }
              >
                Paid
              </Button>
              <Button
                size="sm"
                variant={paymentFilter === 'balance' ? 'default' : 'outline'}
                onClick={() => setPaymentFilter('balance')}
                className={
                  paymentFilter === 'balance' ? 'bg-orange-600 text-white' : ''
                }
              >
                Balance Due
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Forms Filter */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={formsFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setFormsFilter('all')}
                className={
                  formsFilter === 'all' ? 'bg-[#1E3A5F] text-white' : ''
                }
              >
                All Forms
              </Button>
              <Button
                size="sm"
                variant={formsFilter === 'complete' ? 'default' : 'outline'}
                onClick={() => setFormsFilter('complete')}
                className={
                  formsFilter === 'complete' ? 'bg-green-600 text-white' : ''
                }
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant={formsFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFormsFilter('pending')}
                className={
                  formsFilter === 'pending' ? 'bg-orange-600 text-white' : ''
                }
              >
                Pending
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Registrations Table */}
      {showGroups && filteredGroupRegs.length > 0 && (
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Registrations ({filteredGroupRegs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">
                      Group Name
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">
                      Leader
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Participants
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Total
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Paid
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Balance
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Forms
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupRegs.map((reg) => (
                    <tr
                      key={reg.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-[#1E3A5F]">
                            {reg.groupName}
                          </p>
                          {reg.parishName && (
                            <p className="text-sm text-gray-500">
                              {reg.parishName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium">{reg.leaderName}</p>
                          <p className="text-xs text-gray-500">
                            {reg.leaderEmail}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="font-mono">
                          {reg.participantCount}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono">
                        ${reg.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-green-600">
                        ${reg.amountPaid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-600">
                        ${reg.balance.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-sm ${
                            reg.formsCompleted === reg.formsTotal
                              ? 'text-green-600 font-semibold'
                              : 'text-orange-600'
                          }`}
                        >
                          {reg.formsCompleted}/{reg.formsTotal}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {getPaymentStatusBadge(reg.paymentStatus, reg.balance)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingRegistration(reg)
                              setShowEditModal(true)
                            }}
                            title="Quick Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Link href={`/dashboard/admin/events/${eventId}/registrations/${reg.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View Full Registration"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="ghost" disabled>
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Group Registration Modal */}
      {editingRegistration && (
        <EditGroupRegistrationModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingRegistration(null)
          }}
          registration={{
            id: editingRegistration.id,
            groupName: editingRegistration.groupName,
            parishName: editingRegistration.parishName || '',
            groupLeaderName: editingRegistration.leaderName,
            groupLeaderEmail: editingRegistration.leaderEmail,
            groupLeaderPhone: editingRegistration.leaderPhone,
            totalParticipants: editingRegistration.participantCount,
            housingType: editingRegistration.housingType as 'on_campus' | 'off_campus' | 'day_pass',
            registeredAt: editingRegistration.registeredAt,
            participants: [], // Will be fetched by the modal
            paymentBalance: {
              totalAmountDue: editingRegistration.totalAmount,
              amountPaid: editingRegistration.amountPaid,
              amountRemaining: editingRegistration.balance,
              paymentStatus: editingRegistration.paymentStatus,
            },
          }}
          eventId={eventId}
          eventPricing={null} // Will need to be passed from parent
          onUpdate={() => {
            // Refresh the page data
            window.location.reload()
          }}
        />
      )}

      {/* Edit Individual Registration Modal */}
      {editingIndividualRegistration && (
        <EditIndividualRegistrationModal
          isOpen={true}
          onClose={() => setEditingIndividualRegistration(null)}
          registration={editingIndividualRegistration}
          eventId={eventId}
          onUpdate={() => {
            // Refresh the page data
            window.location.reload()
          }}
        />
      )}

      {/* Individual Registrations Table */}
      {showIndividuals && filteredIndividualRegs.length > 0 && (
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <User className="h-5 w-5" />
              Individual Registrations ({filteredIndividualRegs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">
                      Contact
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Age
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Total
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Paid
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Balance
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIndividualRegs.map((reg) => (
                    <tr
                      key={reg.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#1E3A5F]">
                          {reg.firstName} {reg.lastName}
                        </p>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm">{reg.email}</p>
                          <p className="text-xs text-gray-500">{reg.phone}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">{reg.age || 'N/A'}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono">
                        ${reg.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-green-600">
                        ${reg.amountPaid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-600">
                        ${reg.balance.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        {getPaymentStatusBadge(reg.paymentStatus, reg.balance)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingIndividualRegistration(reg)}
                            title="Quick Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Link href={`/dashboard/admin/events/${eventId}/registrations/${reg.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View Full Registration"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="ghost" disabled>
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredGroupRegs.length === 0 && filteredIndividualRegs.length === 0 && (
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No registrations found
            </h3>
            <p className="text-gray-500">
              {searchQuery || paymentFilter !== 'all' || formsFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No registrations for this event yet'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
