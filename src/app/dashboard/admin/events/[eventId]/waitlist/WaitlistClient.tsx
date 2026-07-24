'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  MoreHorizontal,
  Trash2,
  Search,
  Download,
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
  Phone,
  Timer,
  AlertTriangle,
  TrendingUp,
  Hourglass,
  BarChart3,
  ExternalLink,
  ArrowRight,
  MailOpen,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface WaitlistEntry {
  id: string
  name: string
  email: string
  phone: string | null
  partySize: number
  notes: string | null
  status: 'pending' | 'contacted' | 'registered' | 'expired'
  position: number
  notifiedAt: string | null
  invitationExpires: string | null
  hasToken: boolean
  createdAt: string
  updatedAt: string
  registrationType: 'group' | 'individual' | null
  preferredHousingType: 'on_campus' | 'off_campus' | 'day_pass' | null
  preferredRoomType: 'single' | 'double' | 'triple' | 'quad' | null
  preferredTicketType: 'general_admission' | 'day_pass' | null
  preferredDayPassOptionId: string | null
  preferredDayPassOptionName: string | null
  youthCount: number | null
  chaperoneCount: number | null
  priestCount: number | null
}

interface WaitlistSummary {
  total: number
  pending: number
  contacted: number
  registered: number
  expired: number
}

interface WaitlistAnalytics {
  conversionRate: number
  totalInvited: number
  spotsConverted: number
  averageWaitTime: {
    hours: number
    days: number
    sampleSize: number
  }
}

interface WaitlistClientProps {
  eventId: string
  eventName: string
}

function describeRequest(e: WaitlistEntry): string {
  const parts: string[] = []
  parts.push(`${e.partySize} spot${e.partySize === 1 ? '' : 's'}`)
  if (e.registrationType === 'group' && (e.youthCount || e.chaperoneCount || e.priestCount)) {
    const mix = [
      e.youthCount ? `${e.youthCount} youth` : null,
      e.chaperoneCount ? `${e.chaperoneCount} chaperone${e.chaperoneCount === 1 ? '' : 's'}` : null,
      e.priestCount ? `${e.priestCount} priest${e.priestCount === 1 ? '' : 's'}` : null,
    ]
      .filter(Boolean)
      .join(' + ')
    if (mix) parts.push(`(${mix})`)
  } else if (e.registrationType) {
    parts.push(`(${e.registrationType})`)
  }
  if (e.preferredDayPassOptionName) {
    parts.push(`— ${e.preferredDayPassOptionName}`)
  } else if (e.preferredHousingType) {
    const label =
      e.preferredHousingType === 'on_campus'
        ? 'On-Campus'
        : e.preferredHousingType === 'off_campus'
        ? 'Off-Campus'
        : 'Day Pass'
    parts.push(`— ${label}${e.preferredRoomType ? ` · ${e.preferredRoomType}` : ''}`)
  }
  return parts.join(' ')
}

export default function WaitlistClient({ eventId, eventName }: WaitlistClientProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [summary, setSummary] = useState<WaitlistSummary>({
    total: 0,
    pending: 0,
    contacted: 0,
    registered: 0,
    expired: 0,
  })
  const [analytics, setAnalytics] = useState<WaitlistAnalytics>({
    conversionRate: 0,
    totalInvited: 0,
    spotsConverted: 0,
    averageWaitTime: { hours: 0, days: 0, sampleSize: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<WaitlistEntry | null>(null)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideEntry, setOverrideEntry] = useState<WaitlistEntry | null>(null)
  const [overrideInfo, setOverrideInfo] = useState<{ capacityRemaining: number; spotsNeeded: number } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)

  // Entry Manager dialog — the single view where an admin sees an entry's
  // full state and takes any action on it. Consolidates the old dropdown.
  const [manageEntry, setManageEntry] = useState<WaitlistEntry | null>(null)
  const [manageMode, setManageMode] = useState<'view' | 'edit' | 'offer'>('view')

  // Edit-in-place and counter-offer dialog state. Both dialogs reuse the same
  // draft shape; the endpoint differs.
  const [preferences, setPreferences] = useState<{
    groupRegistrationEnabled: boolean
    individualRegistrationEnabled: boolean
    housingTypes: Array<'on_campus' | 'off_campus' | 'day_pass'>
    roomTypes: Array<'single' | 'double' | 'triple' | 'quad'>
    dayPassOptions: Array<{ id: string; name: string }>
  } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [draftEntry, setDraftEntry] = useState<WaitlistEntry | null>(null)
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    partySize: '1',
    youthCount: '',
    chaperoneCount: '',
    priestCount: '',
    registrationType: '' as '' | 'group' | 'individual',
    preferredHousingType: '' as '' | 'on_campus' | 'off_campus' | 'day_pass',
    preferredDayPassOptionId: '',
    notes: '',
  })
  const [draftSubmitting, setDraftSubmitting] = useState(false)

  const fetchWaitlist = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/waitlist`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        // Surface the actual server error instead of silently rendering an
        // empty state — that behavior turned a DB-schema mismatch into
        // "everything looks fine but shows 0 entries" for the admin.
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
            : `Server returned ${response.status} loading the waitlist.`
        )
      }

      const data = await response.json()
      setEntries(data.entries)
      setSummary(data.summary)
      if (data.analytics) {
        setAnalytics(data.analytics)
      }
      if (data.preferences) {
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error)
      setLoadError(error instanceof Error ? error.message : 'Unknown error loading waitlist')
      // Keep entries as whatever we had (probably []) so the error banner
      // isn't drowned out by "No one on the waitlist yet".
    } finally {
      setLoading(false)
    }
  }, [eventId, getToken])

  useEffect(() => {
    fetchWaitlist()
  }, [fetchWaitlist])

  const sendContact = async (
    entry: WaitlistEntry,
    opts?: { override?: boolean; overrideReason?: string }
  ) => {
    const token = await getToken()
    const response = await fetch(`/api/admin/waitlist/${entry.id}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(opts ?? {}),
    })
    return response
  }

  const handleMarkContacted = async (entry: WaitlistEntry) => {
    try {
      setActionLoading(entry.id)
      const response = await sendContact(entry)

      if (response.status === 409) {
        const data = await response.json().catch(() => ({}))
        if (data.canOverride) {
          setOverrideEntry(entry)
          setOverrideInfo({
            capacityRemaining: data.capacityRemaining ?? 0,
            spotsNeeded: data.spotsNeeded ?? entry.partySize,
          })
          setOverrideReason('')
          setOverrideDialogOpen(true)
          return
        }
        alert(data.error || 'Cannot send invitation.')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to mark as contacted')
      }

      await fetchWaitlist()
    } catch (error) {
      console.error('Error marking as contacted:', error)
      alert('Failed to mark as contacted. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const openManage = (entry: WaitlistEntry) => {
    setManageEntry(entry)
    setManageMode('view')
  }

  const openEditDialog = (entry: WaitlistEntry, mode: 'edit' | 'offer') => {
    setDraftEntry(entry)
    setDraft({
      name: entry.name,
      phone: entry.phone ?? '',
      partySize: String(entry.partySize),
      youthCount: entry.youthCount !== null ? String(entry.youthCount) : '',
      chaperoneCount: entry.chaperoneCount !== null ? String(entry.chaperoneCount) : '',
      priestCount: entry.priestCount !== null ? String(entry.priestCount) : '',
      registrationType: entry.registrationType ?? '',
      preferredHousingType: entry.preferredHousingType ?? '',
      preferredDayPassOptionId: entry.preferredDayPassOptionId ?? '',
      notes: entry.notes ?? '',
    })
    if (mode === 'edit') setEditDialogOpen(true)
    else setOfferDialogOpen(true)
  }

  const submitDraft = async (mode: 'edit' | 'offer') => {
    if (!draftEntry) return
    const isGroup = draft.registrationType === 'group'
    const parsedYouth = parseInt(draft.youthCount) || 0
    const parsedChaperone = parseInt(draft.chaperoneCount) || 0
    const parsedPriest = parseInt(draft.priestCount) || 0
    const parsedPartySize = isGroup
      ? parsedYouth + parsedChaperone + parsedPriest
      : parseInt(draft.partySize) || 0

    if (isGroup && parsedPartySize <= 0) {
      alert('Enter a mix of youth / chaperone / priest.')
      return
    }
    if (draft.registrationType === 'individual' && parsedPartySize !== 1) {
      alert('Individual entries hold exactly 1 spot.')
      return
    }

    setDraftSubmitting(true)
    try {
      const authToken = await getToken()
      const commonBody = {
        partySize: parsedPartySize,
        youthCount: isGroup ? parsedYouth : null,
        chaperoneCount: isGroup ? parsedChaperone : null,
        priestCount: isGroup ? parsedPriest : null,
        registrationType: draft.registrationType || null,
        preferredHousingType: draft.preferredHousingType || null,
        preferredDayPassOptionId: draft.preferredDayPassOptionId || null,
      }

      let response: Response
      if (mode === 'edit') {
        response = await fetch(`/api/admin/waitlist/${draftEntry.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            name: draft.name,
            phone: draft.phone,
            notes: draft.notes,
            ...commonBody,
          }),
        })
      } else {
        response = await fetch(`/api/admin/waitlist/${draftEntry.id}/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ offer: commonBody }),
        })
      }

      if (response.status === 409 && mode === 'offer') {
        const info = await response.json().catch(() => ({}))
        alert(info?.error || 'Not enough capacity for this offer.')
        return
      }
      if (!response.ok) {
        const info = await response.json().catch(() => ({}))
        throw new Error(info?.error || `Server returned ${response.status}`)
      }

      setEditDialogOpen(false)
      setOfferDialogOpen(false)
      setDraftEntry(null)
      await fetchWaitlist()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save.')
    } finally {
      setDraftSubmitting(false)
    }
  }

  const handleConfirmOverride = async () => {
    if (!overrideEntry) return
    const reason = overrideReason.trim()
    if (reason.length === 0) return

    try {
      setOverrideSubmitting(true)
      const response = await sendContact(overrideEntry, {
        override: true,
        overrideReason: reason,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send invitation with override')
      }
      setOverrideDialogOpen(false)
      setOverrideEntry(null)
      setOverrideInfo(null)
      setOverrideReason('')
      await fetchWaitlist()
    } catch (error) {
      console.error('Error overriding capacity:', error)
      alert(error instanceof Error ? error.message : 'Failed to override capacity.')
    } finally {
      setOverrideSubmitting(false)
    }
  }

  const handleUpdateStatus = async (entryId: string, newStatus: string) => {
    try {
      setActionLoading(entryId)
      const token = await getToken()
      const response = await fetch(`/api/admin/waitlist/${entryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      await fetchWaitlist()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!entryToDelete) return

    try {
      setActionLoading(entryToDelete.id)
      const token = await getToken()
      const response = await fetch(`/api/admin/waitlist/${entryToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }

      await fetchWaitlist()
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Position', 'Name', 'Email', 'Phone', 'Party Size', 'Status', 'Joined Date', 'Notes']
    const rows = filteredEntries.map((entry) => [
      entry.position,
      entry.name,
      entry.email,
      entry.phone || '',
      entry.partySize,
      entry.status,
      format(new Date(entry.createdAt), 'yyyy-MM-dd HH:mm'),
      entry.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `waitlist-${eventId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const getInvitationTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const expires = new Date(expiresAt).getTime()
    const now = Date.now()
    const remaining = expires - now

    if (remaining <= 0) return { expired: true, text: 'Expired' }

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return { expired: false, text: `${days}d ${hours % 24}h` }
    }
    return { expired: false, text: `${hours}h ${minutes}m`, urgent: hours < 6 }
  }

  const getStatusBadge = (entry: WaitlistEntry) => {
    const { status, invitationExpires, hasToken } = entry
    const timeInfo = status === 'contacted' ? getInvitationTimeRemaining(invitationExpires) : null

    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: {
        label: 'Waiting',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="h-3 w-3" />,
      },
      contacted: {
        label: timeInfo?.expired ? 'Invite Expired' : 'Invited',
        className: timeInfo?.expired
          ? 'bg-orange-100 text-orange-800 border-orange-200'
          : timeInfo?.urgent
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-blue-100 text-blue-800 border-blue-200',
        icon: timeInfo?.expired ? <AlertTriangle className="h-3 w-3" /> : <Timer className="h-3 w-3" />,
      },
      registered: {
        label: 'Registered',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />,
      },
      expired: {
        label: 'Expired',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <XCircle className="h-3 w-3" />,
      },
    }

    const config = statusConfig[status] || statusConfig.pending
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
          {config.icon}
          {config.label}
        </Badge>
        {status === 'contacted' && timeInfo && !timeInfo.expired && (
          <span className={`text-xs ${timeInfo.urgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {timeInfo.text} left
          </span>
        )}
      </div>
    )
  }

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalSpotsRequested = entries
    .filter((e) => e.status === 'pending' || e.status === 'contacted')
    .reduce((sum, e) => sum + e.partySize, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/admin/events/${eventId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Waitlist</h1>
            <p className="text-sm text-[#6B7280]">{eventName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchWaitlist} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={entries.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Total Entries</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">{summary.total}</p>
              </div>
              <Users className="h-6 w-6 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Waiting</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Contacted</p>
                <p className="text-2xl font-bold text-blue-600">{summary.contacted}</p>
              </div>
              <Mail className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Registered</p>
                <p className="text-2xl font-bold text-green-600">{summary.registered}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Spots Requested</p>
                <p className="text-2xl font-bold text-[#9C8466]">{totalSpotsRequested}</p>
              </div>
              <UserCheck className="h-6 w-6 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards */}
      {(analytics.totalInvited > 0 || analytics.averageWaitTime.sampleSize > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Conversion Rate</p>
                  <p className="text-3xl font-bold text-purple-700">{analytics.conversionRate}%</p>
                  <p className="text-xs text-purple-500 mt-1">
                    {summary.registered} of {analytics.totalInvited} invited
                  </p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 font-medium">Average Wait Time</p>
                  <p className="text-3xl font-bold text-amber-700">
                    {analytics.averageWaitTime.days > 1
                      ? `${analytics.averageWaitTime.days}d`
                      : `${analytics.averageWaitTime.hours}h`}
                  </p>
                  <p className="text-xs text-amber-500 mt-1">
                    Based on {analytics.averageWaitTime.sampleSize} invitation{analytics.averageWaitTime.sampleSize !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-amber-100 rounded-full p-3">
                  <Hourglass className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Spots Filled from Waitlist</p>
                  <p className="text-3xl font-bold text-emerald-700">{analytics.spotsConverted}</p>
                  <p className="text-xs text-emerald-500 mt-1">
                    Total registrations via waitlist
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-full p-3">
                  <BarChart3 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'contacted', 'registered', 'expired'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={
                    statusFilter === status
                      ? 'bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white'
                      : 'border-[#D1D5DB]'
                  }
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Table */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">
            Waitlist Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
            </div>
          ) : loadError ? (
            <div className="py-12 px-4">
              <div className="mx-auto max-w-lg rounded-lg border-2 border-red-300 bg-red-50 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <p className="mb-1 font-semibold text-red-800">
                  Could not load the waitlist
                </p>
                <p className="mb-4 text-sm text-red-700 break-words">{loadError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchWaitlist}
                  className="border-red-400 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-[#D1D5DB] mx-auto mb-4" />
              <p className="text-[#6B7280]">
                {entries.length === 0
                  ? 'No one on the waitlist yet'
                  : 'No entries match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Party Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-[#1E3A5F]">
                        {entry.position}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#1E3A5F]">{entry.name}</p>
                          {entry.notes && (
                            <p className="text-xs text-[#6B7280] truncate max-w-[200px]">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <a
                            href={`mailto:${entry.email}`}
                            className="text-sm text-[#9C8466] hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {entry.email}
                          </a>
                          {entry.phone && (
                            <a
                              href={`tel:${entry.phone}`}
                              className="text-sm text-[#6B7280] hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {entry.phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="secondary" className="bg-[#F5F1E8] text-[#1E3A5F]">
                            {entry.partySize} {entry.partySize === 1 ? 'spot' : 'spots'}
                          </Badge>
                          {(entry.preferredHousingType ||
                            entry.preferredDayPassOptionName ||
                            entry.preferredTicketType === 'day_pass') && (
                            <Badge
                              variant="outline"
                              className="text-xs border-[#9C8466] text-[#9C8466] whitespace-nowrap"
                            >
                              {entry.preferredDayPassOptionName
                                ? entry.preferredDayPassOptionName
                                : entry.preferredHousingType === 'on_campus'
                                ? entry.preferredRoomType
                                  ? `On-Campus · ${entry.preferredRoomType}`
                                  : 'On-Campus'
                                : entry.preferredHousingType === 'off_campus'
                                ? 'Off-Campus'
                                : entry.preferredHousingType === 'day_pass'
                                ? 'Day Pass'
                                : 'Day Pass'}
                            </Badge>
                          )}
                          {entry.registrationType && (
                            <span className="text-xs text-[#6B7280]">
                              {entry.registrationType === 'group' ? 'Group' : 'Individual'}
                            </span>
                          )}
                          {entry.registrationType === 'group' &&
                            (entry.youthCount !== null ||
                              entry.chaperoneCount !== null ||
                              entry.priestCount !== null) && (
                              <span className="text-[10px] text-[#6B7280] whitespace-nowrap">
                                {[
                                  entry.youthCount ? `${entry.youthCount} youth` : null,
                                  entry.chaperoneCount ? `${entry.chaperoneCount} chap` : null,
                                  entry.priestCount ? `${entry.priestCount} priest` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' + ')}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-[#1E3A5F]">
                            {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {format(new Date(entry.createdAt), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManage(entry)}
                          disabled={actionLoading === entry.id}
                          className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                        >
                          {actionLoading === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Manage
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capacity Override Dialog */}
      <AlertDialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Event is Over Capacity
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Inviting <strong>{overrideEntry?.name}</strong> needs{' '}
                  <strong>{overrideInfo?.spotsNeeded}</strong> spot
                  {overrideInfo?.spotsNeeded === 1 ? '' : 's'}, but only{' '}
                  <strong>{overrideInfo?.capacityRemaining}</strong> remain.
                </p>
                <p>
                  You can force the invitation through, but the event will go over its
                  configured capacity. This action is recorded.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="override-reason">Reason (required)</Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Priest added last minute at organizer's request"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={overrideSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmOverride()
              }}
              disabled={overrideSubmitting || overrideReason.trim().length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {overrideSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending
                </>
              ) : (
                'Force invite anyway'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Entry Manager Dialog — the single view for one waitlist entry.
          Shows status, contact, request/reservation, and every action. */}
      <AlertDialog
        open={!!manageEntry}
        onOpenChange={(open) => {
          if (!open) setManageEntry(null)
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          {manageEntry && (() => {
            const e = manageEntry
            const statusLabel = {
              pending: 'Waiting',
              contacted: 'Invited',
              registered: 'Registered',
              expired: 'Expired',
            }[e.status]
            const statusClass = {
              pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
              contacted: 'bg-blue-100 text-blue-800 border-blue-200',
              registered: 'bg-green-100 text-green-800 border-green-200',
              expired: 'bg-gray-100 text-gray-800 border-gray-200',
            }[e.status]
            const expiresInfo =
              e.status === 'contacted' && e.invitationExpires
                ? getInvitationTimeRemaining(e.invitationExpires)
                : null
            const summary = describeRequest(e)
            return (
              <>
                <AlertDialogHeader>
                  <div className="flex items-center justify-between">
                    <AlertDialogTitle className="text-xl">
                      {e.name}
                    </AlertDialogTitle>
                    <Badge variant="outline" className={statusClass}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <AlertDialogDescription asChild>
                    <div className="text-sm text-[#6B7280]">
                      #{e.position} on the waitlist · Joined{' '}
                      {format(new Date(e.createdAt), 'MMM d, yyyy')}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Contact */}
                  <div className="rounded-md border border-[#D1D5DB] p-3">
                    <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">
                      Contact
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-[#1E3A5F]">
                        <Mail className="inline h-3 w-3 mr-1" />
                        {e.email}
                      </p>
                      {e.phone && (
                        <p className="text-[#1E3A5F]">
                          <Phone className="inline h-3 w-3 mr-1" />
                          {e.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* What they asked for */}
                  <div className="rounded-md border border-[#D1D5DB] p-3">
                    <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">
                      Their request
                    </p>
                    <p className="text-sm text-[#1E3A5F] font-medium">{summary}</p>
                    {e.notes && (
                      <p className="mt-2 text-xs text-[#6B7280] italic">
                        Notes: {e.notes}
                      </p>
                    )}
                  </div>

                  {/* Current reservation (contacted only) */}
                  {e.status === 'contacted' && (
                    <div className="rounded-md border-2 border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-blue-800 mb-2">
                        Current invitation
                      </p>
                      <p className="text-sm text-blue-900">
                        Invite sent{' '}
                        {e.notifiedAt
                          ? format(new Date(e.notifiedAt), 'MMM d, h:mm a')
                          : 'recently'}
                        {expiresInfo && !expiresInfo.expired && (
                          <>
                            {' '}· expires in{' '}
                            <span
                              className={
                                expiresInfo.urgent ? 'font-bold text-red-700' : 'font-medium'
                              }
                            >
                              {expiresInfo.text}
                            </span>
                          </>
                        )}
                        {expiresInfo?.expired && (
                          <span className="font-medium text-orange-700"> · expired</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {e.status === 'pending' && (
                      <>
                        <p className="text-xs uppercase tracking-wide text-[#6B7280]">
                          Send an invitation
                        </p>
                        <Button
                          className="w-full justify-start bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                          onClick={() => {
                            setManageEntry(null)
                            handleMarkContacted(e)
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email invite — as they requested
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-[#9C8466] text-[#9C8466] hover:bg-[#9C8466] hover:text-white"
                          onClick={() => {
                            setManageEntry(null)
                            openEditDialog(e, 'offer')
                          }}
                        >
                          <MailOpen className="h-4 w-4 mr-2" />
                          Email invite — with a different offer
                        </Button>
                        <div className="h-2" />
                        <p className="text-xs uppercase tracking-wide text-[#6B7280]">
                          Manage this request
                        </p>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setManageEntry(null)
                            openEditDialog(e, 'edit')
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit their request (no email sent)
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setManageEntry(null)
                            handleUpdateStatus(e.id, 'expired')
                          }}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Mark as expired (remove from queue)
                        </Button>
                      </>
                    )}

                    {e.status === 'contacted' && (
                      <>
                        <p className="text-xs uppercase tracking-wide text-[#6B7280]">
                          Update status
                        </p>
                        <Button
                          className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            setManageEntry(null)
                            handleUpdateStatus(e.id, 'registered')
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Mark them as registered
                          <span className="ml-2 text-xs opacity-80">
                            (if they signed up offline)
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setManageEntry(null)
                            handleUpdateStatus(e.id, 'pending')
                          }}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Put back on waitlist (release held spots)
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setManageEntry(null)
                            handleUpdateStatus(e.id, 'expired')
                          }}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Mark invitation as expired
                        </Button>
                      </>
                    )}

                    {(e.status === 'expired' || e.status === 'registered') && (
                      <>
                        <p className="text-xs uppercase tracking-wide text-[#6B7280]">
                          Update status
                        </p>
                        {e.status === 'expired' && (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setManageEntry(null)
                              handleUpdateStatus(e.id, 'pending')
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Put back on waitlist
                          </Button>
                        )}
                      </>
                    )}

                    <div className="h-2" />
                    <Button
                      variant="outline"
                      className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setManageEntry(null)
                        setEntryToDelete(e)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete this entry permanently
                    </Button>
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
              </>
            )
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit / Adjust-Offer Dialog — same form, two entry points */}
      <AlertDialog
        open={editDialogOpen || offerDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false)
            setOfferDialogOpen(false)
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editDialogOpen ? 'Edit request' : 'Adjust the offer'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-[#6B7280]">
                {editDialogOpen
                  ? 'Change what this entry is asking for. Only pending entries can be edited.'
                  : 'Send an invite for something different than what they asked for. The reservation and match at registration will use these values.'}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {editDialogOpen && (
              <>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            {preferences?.groupRegistrationEnabled &&
              preferences?.individualRegistrationEnabled && (
                <div>
                  <Label>Registration Type</Label>
                  <select
                    value={draft.registrationType}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        registrationType: e.target.value as '' | 'group' | 'individual',
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="group">Group</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              )}

            {draft.registrationType === 'group' && (
              <div className="rounded-md border border-[#D1D5DB] p-3 space-y-2">
                <p className="text-sm font-medium text-[#1E3A5F]">Participant mix</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Youth</Label>
                    <Input
                      type="number"
                      min="0"
                      value={draft.youthCount}
                      onChange={(e) => setDraft({ ...draft, youthCount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Chaperones</Label>
                    <Input
                      type="number"
                      min="0"
                      value={draft.chaperoneCount}
                      onChange={(e) => setDraft({ ...draft, chaperoneCount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Priests</Label>
                    <Input
                      type="number"
                      min="0"
                      value={draft.priestCount}
                      onChange={(e) => setDraft({ ...draft, priestCount: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Total:{' '}
                  <span className="font-medium text-[#1E3A5F]">
                    {(parseInt(draft.youthCount) || 0) +
                      (parseInt(draft.chaperoneCount) || 0) +
                      (parseInt(draft.priestCount) || 0)}
                  </span>{' '}
                  spots
                </p>
              </div>
            )}

            {draft.registrationType === 'individual' && (
              <p className="text-sm text-[#6B7280]">Individual — 1 spot.</p>
            )}

            {preferences && preferences.housingTypes.length > 1 && (
              <div>
                <Label>Housing</Label>
                <select
                  value={draft.preferredHousingType}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      preferredHousingType: e.target.value as any,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any / not set</option>
                  {preferences.housingTypes.map((h) => (
                    <option key={h} value={h}>
                      {h === 'on_campus'
                        ? 'On-Campus'
                        : h === 'off_campus'
                        ? 'Off-Campus'
                        : 'Day Pass'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {preferences && preferences.dayPassOptions.length > 1 && (
              <div>
                <Label>Day Pass</Label>
                <select
                  value={draft.preferredDayPassOptionId}
                  onChange={(e) =>
                    setDraft({ ...draft, preferredDayPassOptionId: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any / not set</option>
                  {preferences.dayPassOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editDialogOpen && (
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={2}
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={draftSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                submitDraft(editDialogOpen ? 'edit' : 'offer')
              }}
              disabled={draftSubmitting}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              {draftSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving
                </>
              ) : editDialogOpen ? (
                'Save changes'
              ) : (
                'Send invite'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{entryToDelete?.name}</strong> from the
              waitlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
