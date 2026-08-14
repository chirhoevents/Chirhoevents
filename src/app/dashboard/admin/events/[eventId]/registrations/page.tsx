'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import RegistrationsClient from './RegistrationsClient'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  preferredName: string | null
  email: string
  phone: string
  age: number | null
  gender: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  housingType: string | null
  roomType: string | null
  tShirtSize: string | null
  preferredRoommate: string | null
  dietaryRestrictions: string | null
  adaAccommodations: string | null
  emergencyContact1Name: string | null
  emergencyContact1Phone: string | null
  emergencyContact1Relation: string | null
  emergencyContact2Name: string | null
  emergencyContact2Phone: string | null
  emergencyContact2Relation: string | null
  registeredAt: string
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: string
  formStatus: 'complete' | 'pending' | 'not_required'
  confirmationCode: string | null
}

// NOTE: Auth is handled by the layout with proper retry logic.
// Server Components using requireAdmin() cause redirect loops in production
// because Clerk's auth() can fail during initial session hydration.
export default function EventRegistrationsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const { getToken } = useAuth()
  const [eventName, setEventName] = useState<string>('')
  const [groupRegistrations, setGroupRegistrations] = useState<GroupRegistration[]>([])
  const [individualRegistrations, setIndividualRegistrations] = useState<IndividualRegistration[]>([])
  const [totalRegistrations, setTotalRegistrations] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewFilter, setViewFilter] = useState<'active' | 'cancelled'>('active')

  useEffect(() => {
    // Validate eventId is a valid UUID
    if (!eventId || !UUID_REGEX.test(eventId)) {
      setError('Invalid event ID')
      setLoading(false)
      return
    }

    fetchRegistrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, viewFilter])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      // include=cancelled returns the soft-cancelled rows so admins can
      // see the audit trail (payments, liability forms) for people who
      // aren't coming, without those rows leaking into bulk email or the
      // default active list.
      const response = await fetch(
        `/api/admin/events/${eventId}/registrations?include=${viewFilter}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      if (response.status === 404) {
        setError('Event not found')
        setLoading(false)
        return
      }

      if (response.status === 403) {
        setError('You do not have permission to view this event')
        setLoading(false)
        return
      }

      if (!response.ok) {
        // Surface the real server error so a schema/DB mismatch (or any 500)
        // shows up in the UI instead of a generic "Failed to load".
        let serverMessage = ''
        try {
          const errBody = await response.json()
          serverMessage = errBody?.error || errBody?.message || ''
        } catch {
          try {
            serverMessage = await response.text()
          } catch {
            /* ignore */
          }
        }
        throw new Error(
          serverMessage
            ? `Server returned ${response.status}: ${serverMessage}`
            : `Server returned ${response.status} loading registrations.`
        )
      }

      const data = await response.json()

      setEventName(data.event.name)
      setGroupRegistrations(data.groupRegistrations)
      setIndividualRegistrations(data.individualRegistrations)
      setTotalRegistrations(data.totalRegistrations)
      setTotalParticipants(data.totalParticipants)
    } catch (err) {
      console.error('Error fetching registrations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading registrations...</p>
        </div>
      </div>
    )
  }

  if (error === 'Event not found' || error === 'Invalid event ID') {
    notFound()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchRegistrations(); }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Filter toggle — Active vs Cancelled. Sits above the existing
          RegistrationsClient without modifying it. Refetches on change. */}
      <div className="bg-white border-b border-[#D1D5DB] px-6 py-3 flex items-center gap-2">
        <span className="text-sm text-[#6B7280] mr-1">Show:</span>
        <button
          type="button"
          onClick={() => setViewFilter('active')}
          className={`text-sm px-3 py-1.5 rounded-md border ${
            viewFilter === 'active'
              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
              : 'bg-white text-[#1E3A5F] border-[#D1D5DB] hover:border-[#1E3A5F]'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setViewFilter('cancelled')}
          className={`text-sm px-3 py-1.5 rounded-md border ${
            viewFilter === 'cancelled'
              ? 'bg-orange-600 text-white border-orange-600'
              : 'bg-white text-orange-700 border-orange-200 hover:border-orange-500'
          }`}
        >
          Cancelled
        </button>
        {viewFilter === 'cancelled' && (
          <span className="text-xs text-[#6B7280] ml-2">
            Read-only view. These registrations don&apos;t receive bulk emails.
            Payment history and liability forms are preserved.
          </span>
        )}
      </div>
      <RegistrationsClient
        eventId={eventId}
        eventName={eventName}
        groupRegistrations={groupRegistrations}
        individualRegistrations={individualRegistrations}
        totalRegistrations={totalRegistrations}
        totalParticipants={totalParticipants}
      />
    </div>
  )
}
