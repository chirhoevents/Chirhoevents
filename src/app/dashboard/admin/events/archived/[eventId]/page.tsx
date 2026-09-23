'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, notFound } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { format } from 'date-fns'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Users,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ArchiveEventDialog from '@/components/admin/ArchiveEventDialog'
import { parseDateOnly } from '@/lib/utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const money = (v: unknown) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDateTime = (v: string | null | undefined) =>
  v ? format(new Date(v), 'MMM d, yyyy h:mm a') : '—'

const hasValue = (v: unknown) => v !== null && v !== undefined && v !== ''

// Pricing fields shown in the setup summary, in display order.
const PRICE_FIELDS: Array<[string, string]> = [
  ['youthEarlyBirdPrice', 'Youth — early bird'],
  ['youthRegularPrice', 'Youth — regular'],
  ['youthLatePrice', 'Youth — late'],
  ['chaperoneEarlyBirdPrice', 'Chaperone — early bird'],
  ['chaperoneRegularPrice', 'Chaperone — regular'],
  ['chaperoneLatePrice', 'Chaperone — late'],
  ['priestPrice', 'Priest'],
  ['onCampusYouthPrice', 'On-campus youth'],
  ['offCampusYouthPrice', 'Off-campus youth'],
  ['dayPassYouthPrice', 'Day pass youth'],
  ['onCampusChaperonePrice', 'On-campus chaperone'],
  ['offCampusChaperonePrice', 'Off-campus chaperone'],
  ['dayPassChaperonePrice', 'Day pass chaperone'],
  ['individualEarlyBirdPrice', 'Individual — early bird'],
  ['individualBasePrice', 'Individual — base'],
  ['individualLatePrice', 'Individual — late'],
  ['singleRoomPrice', 'Single room'],
  ['doubleRoomPrice', 'Double room'],
  ['tripleRoomPrice', 'Triple room'],
  ['quadRoomPrice', 'Quad room'],
  ['individualOffCampusPrice', 'Individual off-campus'],
  ['individualDayPassPrice', 'Individual day pass'],
  ['individualMealPackagePrice', 'Individual meal package'],
]

// Feature toggles shown in the setup summary.
const FEATURE_FIELDS: Array<[string, string]> = [
  ['groupRegistrationEnabled', 'Group registration'],
  ['individualRegistrationEnabled', 'Individual registration'],
  ['staffRegistrationEnabled', 'Staff / volunteer registration'],
  ['vendorRegistrationEnabled', 'Vendor registration'],
  ['waitlistEnabled', 'Waitlist'],
  ['checkPaymentEnabled', 'Pay by check'],
  ['couponsEnabled', 'Coupons'],
  ['tshirtsEnabled', 'T-shirts'],
  ['individualMealsEnabled', 'Individual meals'],
  ['porosEnabled', 'Poros (housing & logistics)'],
  ['porosHousingEnabled', 'Poros housing'],
  ['porosSmallGroupEnabled', 'Small groups'],
  ['porosSeatingEnabled', 'Seating'],
  ['porosMealColorsEnabled', 'Meal colors'],
  ['porosPublicPortalEnabled', 'Poros public portal'],
  ['salveCheckinEnabled', 'SALVE check-in'],
  ['raphaMedicalEnabled', 'Rapha medical'],
  ['registrationAcknowledgmentEnabled', 'Pre-checkout acknowledgment'],
]

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#F3F4F6] last:border-0 text-sm">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-medium text-[#111827] text-right">{value}</span>
    </div>
  )
}

// NOTE: Auth is handled by the layout with proper retry logic.
export default function ArchivedEventPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const router = useRouter()
  const { getToken } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoreOpen, setRestoreOpen] = useState(false)

  const fetchEvent = async () => {
    if (!eventId || !UUID_REGEX.test(eventId)) {
      setError('Event not found')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (response.status === 404) {
        setError('Event not found')
        return
      }
      if (!response.ok) throw new Error('Failed to load event')
      const json = await response.json()
      // Not archived (e.g. restored in another tab): use the normal event page
      if (!json.event?.archivedAt) {
        router.replace(`/dashboard/admin/events/${eventId}`)
        return
      }
      setData(json)
    } catch (err) {
      console.error('Error fetching archived event:', err)
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  if (error === 'Event not found') notFound()

  if (loading || (!error && !data)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600">{error || 'Failed to load event'}</p>
        <Button variant="outline" onClick={fetchEvent}>Retry</Button>
      </div>
    )
  }

  const event = data.event
  const stats = data.stats || {}
  const pricing = event.pricing || {}
  const settings = event.settings || {}
  const dayPassOptions: any[] = event.dayPassOptions || []
  const prices = PRICE_FIELDS.filter(([key]) => hasValue(pricing[key]) && Number(pricing[key]) > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/admin/events/archived"
          className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#1E3A5F] mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Archived Events
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">{event.name}</h1>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280]">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(parseDateOnly(event.startDate), 'MMM d')} –{' '}
                {format(parseDateOnly(event.endDate), 'MMM d, yyyy')}
              </span>
              {event.locationName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.locationName}
                </span>
              )}
              <span>Archived {format(new Date(event.archivedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/admin/events/${event.id}/reports`}>
              <Button size="sm" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports &amp; Master Report
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setRestoreOpen(true)}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </div>
        </div>
      </div>

      {/* Final stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Registrations', value: stats.totalRegistrations ?? 0, icon: Users },
          { label: 'Participants', value: stats.totalParticipants ?? 0, icon: Users },
          { label: 'Total Invoiced', value: money(stats.totalRevenue), icon: DollarSign },
          { label: 'Collected', value: money(stats.totalPaid), icon: DollarSign },
          { label: 'Outstanding Balance', value: money(stats.balance), icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-white border-[#D1D5DB]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <div className="text-2xl font-bold text-[#1E3A5F]">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How the event was set up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F] text-lg">Dates &amp; Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <Row
              label="Event dates"
              value={`${format(parseDateOnly(event.startDate), 'MMM d, yyyy')} – ${format(parseDateOnly(event.endDate), 'MMM d, yyyy')}`}
            />
            {(event.startTime || event.endTime) && (
              <Row label="Times" value={`${event.startTime || '—'} – ${event.endTime || '—'}`} />
            )}
            <Row label="Timezone" value={event.timezone || '—'} />
            <Row label="Registration opened" value={fmtDateTime(event.registrationOpenDate)} />
            <Row label="Registration closed" value={fmtDateTime(event.registrationCloseDate)} />
            <Row label="Total capacity" value={event.capacityTotal ?? 'Unlimited'} />
            {event.enableWaitlist && (
              <Row label="Waitlist capacity" value={event.waitlistCapacity ?? 'Unlimited'} />
            )}
            <Row label="Public page" value={event.isPublished ? 'Published' : 'Not published'} />
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F] text-lg">Features Used</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {FEATURE_FIELDS.map(([key, label]) => {
              const on = !!settings[key]
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {on ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <span className={on ? 'text-[#111827]' : 'text-[#9CA3AF]'}>{label}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F] text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            {prices.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No pricing was configured.</p>
            ) : (
              prices.map(([key, label]) => <Row key={key} label={label} value={money(pricing[key])} />)
            )}
            {hasValue(pricing.earlyBirdDeadline) && (
              <Row label="Early bird deadline" value={fmtDateTime(pricing.earlyBirdDeadline)} />
            )}
            {hasValue(pricing.regularDeadline) && (
              <Row label="Regular deadline" value={fmtDateTime(pricing.regularDeadline)} />
            )}
            {hasValue(pricing.fullPaymentDeadline) && (
              <Row label="Full payment deadline" value={fmtDateTime(pricing.fullPaymentDeadline)} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F] text-lg">Deposits &amp; Day Passes</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Full payment required" value={pricing.requireFullPayment ? 'Yes' : 'No'} />
            {hasValue(pricing.depositAmount) && (
              <Row
                label="Deposit"
                value={`${money(pricing.depositAmount)}${pricing.depositPerPerson ? ' per person' : ''}`}
              />
            )}
            {hasValue(pricing.depositPercentage) && (
              <Row label="Deposit percentage" value={`${Number(pricing.depositPercentage)}%`} />
            )}
            {hasValue(pricing.lateFeePercentage) && (
              <Row label="Late fee" value={`${Number(pricing.lateFeePercentage)}%`} />
            )}
            {dayPassOptions.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-[#1E3A5F] mb-1">Day pass options</div>
                {dayPassOptions.map((dp) => (
                  <Row
                    key={dp.id}
                    label={dp.name}
                    value={`${dp.capacity - dp.remaining} / ${dp.capacity} used`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ArchiveEventDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        eventId={event.id}
        eventName={event.name}
        mode="restore"
        onDone={() => router.push(`/dashboard/admin/events/${event.id}`)}
      />
    </div>
  )
}
