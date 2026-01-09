'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Users, User, DollarSign, FileText } from 'lucide-react'
import AllRegistrationsFilters, {
  type RegistrationType,
  type PaymentFilter,
  type FormsFilter,
  type HousingFilter,
} from '@/components/admin/registrations/AllRegistrationsFilters'
import AllRegistrationsTable, {
  type Registration,
} from '@/components/admin/registrations/AllRegistrationsTable'
import BulkActionsBar from '@/components/admin/registrations/BulkActionsBar'
import BulkEmailModal from '@/components/admin/registrations/BulkEmailModal'
import EditGroupRegistrationModal from '@/components/admin/EditGroupRegistrationModal'
import EditIndividualRegistrationModal from '@/components/admin/EditIndividualRegistrationModal'
import RefundModal from '@/components/admin/RefundModal'
import EmailResendModal from '@/components/admin/EmailResendModal'
import { usePermissions } from '@/hooks/usePermissions'

interface Event {
  id: string
  name: string
  slug: string
}

interface Stats {
  totalRegistrations: number
  totalGroups: number
  totalGroupParticipants: number
  totalIndividuals: number
  totalRevenue: number
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AllRegistrationsClient() {
  // Auth hook for API calls
  const { getToken } = useAuth()
  // Permission checks
  const { can, canViewPayments } = usePermissions()
  const canViewPaymentInfo = canViewPayments()
  const canEditRegistrations = can('registrations.edit')
  const canProcessPayments = can('payments.process')
  const canProcessRefunds = can('payments.refund')
  const canApplyLateFees = can('payments.late_fees')

  // Filter states
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [registrationType, setRegistrationType] = useState<RegistrationType>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [formsFilter, setFormsFilter] = useState<FormsFilter>('all')
  const [housingFilter, setHousingFilter] = useState<HousingFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Data states
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  })
  const [stats, setStats] = useState<Stats>({
    totalRegistrations: 0,
    totalGroups: 0,
    totalGroupParticipants: 0,
    totalIndividuals: 0,
    totalRevenue: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal states
  const [editingGroupReg, setEditingGroupReg] = useState<Registration | null>(null)
  const [editingIndividualReg, setEditingIndividualReg] = useState<Registration | null>(null)
  const [emailModalReg, setEmailModalReg] = useState<Registration | null>(null)
  const [refundModalReg, setRefundModalReg] = useState<Registration | null>(null)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch registrations
  const fetchRegistrations = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedEventId !== 'all') params.set('eventId', selectedEventId)
      if (registrationType !== 'all') params.set('type', registrationType)
      if (paymentFilter !== 'all') params.set('paymentStatus', paymentFilter)
      if (formsFilter !== 'all') params.set('formsStatus', formsFilter)
      if (housingFilter !== 'all') params.set('housingType', housingFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', String(page))
      params.set('limit', '50')

      const token = await getToken()
      const response = await fetch(`/api/admin/registrations?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch registrations')

      const data = await response.json()
      setRegistrations(data.registrations)
      setPagination(data.pagination)
      setStats(data.stats)
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedEventId, registrationType, paymentFilter, formsFilter, housingFilter, debouncedSearch, getToken])

  useEffect(() => {
    fetchRegistrations(1)
    setSelectedIds(new Set())
  }, [fetchRegistrations])

  const handlePageChange = (page: number) => {
    fetchRegistrations(page)
    setSelectedIds(new Set())
  }

  const handleClearFilters = () => {
    setSelectedEventId('all')
    setRegistrationType('all')
    setPaymentFilter('all')
    setFormsFilter('all')
    setHousingFilter('all')
    setSearchQuery('')
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const body: Record<string, any> = {}
      if (selectedEventId !== 'all') body.eventId = selectedEventId
      if (registrationType !== 'all') body.type = registrationType
      if (paymentFilter !== 'all') body.paymentStatus = paymentFilter
      if (formsFilter !== 'all') body.formsStatus = formsFilter
      if (housingFilter !== 'all') body.housingType = housingFilter
      if (debouncedSearch) body.search = debouncedSearch

      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/admin/registrations/export', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registrations-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export registrations')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSelected = async () => {
    if (selectedIds.size === 0) return

    setIsExporting(true)
    try {
      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/admin/registrations/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registrationIds: Array.from(selectedIds),
        }),
      })

      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registrations-selected-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export selected registrations')
    } finally {
      setIsExporting(false)
    }
  }

  const handleApplyLateFee = (reg: Registration) => {
    // For now, redirect to the registration page where late fee can be applied
    window.location.href = `/dashboard/admin/events/${reg.eventId}/registrations/${reg.id}`
  }

  const handleMarkPayment = (reg: Registration) => {
    // For now, redirect to the registration page where payment can be recorded
    window.location.href = `/dashboard/admin/events/${reg.eventId}/registrations/${reg.id}`
  }

  const handleBulkApplyLateFee = () => {
    alert('Bulk late fee application: This will be implemented with individual payment management.')
  }

  const handleBulkMarkPayments = () => {
    alert('Bulk payment marking: This will be implemented with individual payment management.')
  }

  const getSelectedRecipients = () => {
    return registrations
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        id: r.id,
        type: r.type,
        email: r.leaderEmail,
        name: r.leaderName,
        eventId: r.eventId,
        eventName: r.eventName,
      }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          All Registrations
        </h1>
        <p className="text-[#6B7280]">
          View and manage registrations across all events
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1E3A5F]/10 rounded-lg">
                <FileText className="h-5 w-5 text-[#1E3A5F]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Registrations</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {stats.totalRegistrations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#9C8466]/10 rounded-lg">
                <Users className="h-5 w-5 text-[#9C8466]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Groups</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {stats.totalGroups}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    ({stats.totalGroupParticipants} people)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Individuals</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {stats.totalIndividuals}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    people
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {canViewPaymentInfo && (
          <Card className="bg-white border-[#D1D5DB]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onEmailSelected={() => setShowBulkEmailModal(true)}
        onApplyLateFee={handleBulkApplyLateFee}
        onExportSelected={handleExportSelected}
        onMarkPayments={handleBulkMarkPayments}
        isExporting={isExporting}
      />

      {/* Filters */}
      <AllRegistrationsFilters
        events={events}
        selectedEventId={selectedEventId}
        onEventChange={setSelectedEventId}
        registrationType={registrationType}
        onRegistrationTypeChange={setRegistrationType}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        formsFilter={formsFilter}
        onFormsFilterChange={setFormsFilter}
        housingFilter={housingFilter}
        onHousingFilterChange={setHousingFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearFilters={handleClearFilters}
        onExport={handleExport}
        isExporting={isExporting}
        canViewPayments={canViewPaymentInfo}
      />

      {/* Table */}
      <AllRegistrationsTable
        registrations={registrations}
        pagination={pagination}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onPageChange={handlePageChange}
        onEditGroup={setEditingGroupReg}
        onEditIndividual={setEditingIndividualReg}
        onEmail={setEmailModalReg}
        onApplyLateFee={handleApplyLateFee}
        onMarkPayment={handleMarkPayment}
        onRefund={setRefundModalReg}
        isLoading={isLoading}
        canViewPayments={canViewPaymentInfo}
        canEdit={canEditRegistrations}
        canProcessPayments={canProcessPayments}
        canProcessRefunds={canProcessRefunds}
        canApplyLateFees={canApplyLateFees}
      />

      {/* Edit Group Registration Modal */}
      {editingGroupReg && (
        <EditGroupRegistrationModal
          isOpen={true}
          onClose={() => setEditingGroupReg(null)}
          registration={{
            id: editingGroupReg.id,
            groupName: editingGroupReg.groupName,
            parishName: editingGroupReg.parishName || '',
            groupLeaderName: editingGroupReg.leaderName,
            groupLeaderEmail: editingGroupReg.leaderEmail,
            groupLeaderPhone: editingGroupReg.leaderPhone,
            totalParticipants: editingGroupReg.participantCount,
            housingType: editingGroupReg.housingType as 'on_campus' | 'off_campus' | 'day_pass',
            registeredAt: editingGroupReg.createdAt,
            participants: [],
            paymentBalance: {
              totalAmountDue: editingGroupReg.totalAmount,
              amountPaid: editingGroupReg.amountPaid,
              amountRemaining: editingGroupReg.balance,
              paymentStatus: editingGroupReg.paymentStatus,
            },
          }}
          eventId={editingGroupReg.eventId}
          eventPricing={null}
          onUpdate={() => {
            fetchRegistrations(pagination.page)
            setEditingGroupReg(null)
          }}
        />
      )}

      {/* Edit Individual Registration Modal */}
      {editingIndividualReg && (
        <EditIndividualRegistrationModal
          isOpen={true}
          onClose={() => setEditingIndividualReg(null)}
          registration={{
            id: editingIndividualReg.id,
            firstName: editingIndividualReg.groupName.split(' ')[0] || '',
            lastName: editingIndividualReg.groupName.split(' ').slice(1).join(' ') || '',
            email: editingIndividualReg.leaderEmail,
            phone: editingIndividualReg.leaderPhone,
            age: null,
            housingType: editingIndividualReg.housingType,
            registeredAt: editingIndividualReg.createdAt,
            totalAmount: editingIndividualReg.totalAmount,
            amountPaid: editingIndividualReg.amountPaid,
            balance: editingIndividualReg.balance,
            paymentStatus: editingIndividualReg.paymentStatus,
          }}
          eventId={editingIndividualReg.eventId}
          onUpdate={() => {
            fetchRegistrations(pagination.page)
            setEditingIndividualReg(null)
          }}
        />
      )}

      {/* Email Modal */}
      {emailModalReg && (
        <EmailResendModal
          isOpen={true}
          onClose={() => setEmailModalReg(null)}
          registrationId={emailModalReg.id}
          registrationType={emailModalReg.type}
          defaultRecipientEmail={emailModalReg.leaderEmail}
          defaultRecipientName={emailModalReg.leaderName}
        />
      )}

      {/* Refund Modal */}
      {refundModalReg && (
        <RefundModal
          isOpen={true}
          onClose={() => setRefundModalReg(null)}
          registrationId={refundModalReg.id}
          registrationType={refundModalReg.type}
          currentBalance={refundModalReg.balance}
          amountPaid={refundModalReg.amountPaid}
          onRefundProcessed={() => {
            fetchRegistrations(pagination.page)
            setRefundModalReg(null)
          }}
        />
      )}

      {/* Bulk Email Modal */}
      <BulkEmailModal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        recipients={getSelectedRecipients()}
      />
    </div>
  )
}
