'use client'

import { useState, useEffect } from 'react'
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

// DEMO: hardcoded data
const DEMO_EVENTS = [
  { id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026', slug: 'summer-retreat-2026' },
  { id: 'evt-diocesan-conference', name: 'Diocesan Youth Conference', slug: 'diocesan-conference' },
  { id: 'evt-mens-retreat', name: "Men's Silent Retreat", slug: 'mens-retreat' },
]

const DEMO_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-1',
    type: 'group',
    eventId: 'evt-summer-retreat',
    eventName: 'Summer Youth Retreat 2026',
    eventSlug: 'summer-retreat-2026',
    groupName: "St. Mary's Youth Group",
    parishName: "St. Mary's Catholic Church",
    leaderName: 'Sample Leader',
    leaderEmail: 'leader@example.com',
    leaderPhone: '555-0100',
    participantCount: 10,
    totalAmount: 2850,
    amountPaid: 855,
    balance: 1995,
    paymentStatus: 'partial',
    formsCompleted: 7,
    formsTotal: 10,
    formsStatus: 'partial',
    housingType: 'on_campus',
    createdAt: '2026-05-12T14:22:00Z',
  },
  {
    id: 'reg-2',
    type: 'group',
    eventId: 'evt-summer-retreat',
    eventName: 'Summer Youth Retreat 2026',
    eventSlug: 'summer-retreat-2026',
    groupName: 'St. John Paul II Parish',
    parishName: 'St. John Paul II Parish',
    leaderName: 'Fr. Michael Kowalski',
    leaderEmail: 'frmichael@sjp2.org',
    leaderPhone: '555-0220',
    participantCount: 4,
    totalAmount: 1140,
    amountPaid: 1140,
    balance: 0,
    paymentStatus: 'paid_full',
    formsCompleted: 4,
    formsTotal: 4,
    formsStatus: 'complete',
    housingType: 'on_campus',
    createdAt: '2026-04-28T09:15:00Z',
  },
  {
    id: 'reg-3',
    type: 'group',
    eventId: 'evt-diocesan-conference',
    eventName: 'Diocesan Youth Conference',
    eventSlug: 'diocesan-conference',
    groupName: 'Holy Family Community',
    parishName: 'Holy Family',
    leaderName: 'Sarah Martinez',
    leaderEmail: 'smartinez@holyfamily.org',
    leaderPhone: '555-0311',
    participantCount: 8,
    totalAmount: 1560,
    amountPaid: 780,
    balance: 780,
    paymentStatus: 'partial',
    formsCompleted: 6,
    formsTotal: 8,
    formsStatus: 'partial',
    housingType: 'off_campus',
    createdAt: '2026-06-22T09:45:00Z',
  },
  {
    id: 'reg-4',
    type: 'individual',
    eventId: 'evt-mens-retreat',
    eventName: "Men's Silent Retreat",
    eventSlug: 'mens-retreat',
    groupName: 'Thomas Wright',
    parishName: null,
    leaderName: 'Thomas Wright',
    leaderEmail: 'twright@example.com',
    leaderPhone: '555-0301',
    participantCount: 1,
    totalAmount: 320,
    amountPaid: 320,
    balance: 0,
    paymentStatus: 'paid_full',
    formsCompleted: 1,
    formsTotal: 1,
    formsStatus: 'complete',
    housingType: 'on_campus',
    createdAt: '2026-06-18T18:44:00Z',
  },
  {
    id: 'reg-5',
    type: 'individual',
    eventId: 'evt-mens-retreat',
    eventName: "Men's Silent Retreat",
    eventSlug: 'mens-retreat',
    groupName: 'Robert Chen',
    parishName: null,
    leaderName: 'Robert Chen',
    leaderEmail: 'rchen@example.com',
    leaderPhone: '555-0302',
    participantCount: 1,
    totalAmount: 320,
    amountPaid: 0,
    balance: 320,
    paymentStatus: 'pending',
    formsCompleted: 0,
    formsTotal: 1,
    formsStatus: 'pending',
    housingType: 'on_campus',
    createdAt: '2026-07-01T10:12:00Z',
  },
]

const notImplemented = (what: string) => () =>
  alert(`Demo: ${what} — this action would run in the real product but is disabled in the demo.`)

export default function AllRegistrationsClient() {
  // Filter states
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [registrationType, setRegistrationType] = useState<RegistrationType>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [formsFilter, setFormsFilter] = useState<FormsFilter>('all')
  const [housingFilter, setHousingFilter] = useState<HousingFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [filtered, setFiltered] = useState<Registration[]>(DEMO_REGISTRATIONS)

  useEffect(() => {
    let out = DEMO_REGISTRATIONS
    if (selectedEventId !== 'all') out = out.filter((r) => r.eventId === selectedEventId)
    if (registrationType !== 'all') out = out.filter((r) => r.type === registrationType)
    if (paymentFilter !== 'all') out = out.filter((r) => r.paymentStatus === paymentFilter)
    if (formsFilter !== 'all') out = out.filter((r) => r.formsStatus === formsFilter)
    if (housingFilter !== 'all') out = out.filter((r) => r.housingType === housingFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      out = out.filter(
        (r) =>
          r.groupName.toLowerCase().includes(q) ||
          r.leaderName.toLowerCase().includes(q) ||
          r.leaderEmail.toLowerCase().includes(q),
      )
    }
    setFiltered(out)
  }, [selectedEventId, registrationType, paymentFilter, formsFilter, housingFilter, searchQuery])

  const stats = {
    totalRegistrations: DEMO_REGISTRATIONS.length,
    totalGroups: DEMO_REGISTRATIONS.filter((r) => r.type === 'group').length,
    totalGroupParticipants: DEMO_REGISTRATIONS.filter((r) => r.type === 'group').reduce((n, r) => n + r.participantCount, 0),
    totalIndividuals: DEMO_REGISTRATIONS.filter((r) => r.type === 'individual').length,
    totalRevenue: DEMO_REGISTRATIONS.reduce((n, r) => n + r.amountPaid, 0),
  }

  const handleClearFilters = () => {
    setSelectedEventId('all')
    setRegistrationType('all')
    setPaymentFilter('all')
    setFormsFilter('all')
    setHousingFilter('all')
    setSearchQuery('')
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">All Registrations</h1>
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
                <p className="text-2xl font-bold text-[#1E3A5F]">{stats.totalRegistrations}</p>
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
                  <span className="text-sm font-normal text-gray-500 ml-1">people</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onEmailSelected={notImplemented('Email selected registrants')}
        onApplyLateFee={notImplemented('Apply bulk late fee')}
        onExportSelected={notImplemented('Export selected as CSV')}
        onMarkPayments={notImplemented('Mark bulk payments received')}
        isExporting={false}
      />

      {/* Filters */}
      <AllRegistrationsFilters
        events={DEMO_EVENTS}
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
        onExport={notImplemented('Export all filtered registrations')}
        isExporting={false}
        canViewPayments={true}
      />

      {/* Table */}
      <AllRegistrationsTable
        registrations={filtered}
        pagination={{ total: filtered.length, page: 1, limit: 50, totalPages: 1 }}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onPageChange={() => {}}
        onEditGroup={notImplemented('Edit group registration')}
        onEditIndividual={notImplemented('Edit individual registration')}
        onEmail={notImplemented('Send email to registrant')}
        onApplyLateFee={notImplemented('Apply late fee to registration')}
        onMarkPayment={notImplemented('Record payment for registration')}
        onRefund={notImplemented('Process refund')}
        isLoading={false}
        canViewPayments={true}
        canEdit={true}
        canProcessPayments={true}
        canProcessRefunds={true}
        canApplyLateFees={true}
      />
    </div>
  )
}
