'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<WaitlistEntry | null>(null)

  const fetchWaitlist = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/waitlist`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error('Failed to fetch waitlist')
      }

      const data = await response.json()
      setEntries(data.entries)
      setSummary(data.summary)
      if (data.analytics) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId, getToken])

  useEffect(() => {
    fetchWaitlist()
  }, [fetchWaitlist])

  const handleMarkContacted = async (entry: WaitlistEntry) => {
    try {
      setActionLoading(entry.id)
      const token = await getToken()
      const response = await fetch(`/api/admin/waitlist/${entry.id}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

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
                        <Badge variant="secondary" className="bg-[#F5F1E8] text-[#1E3A5F]">
                          {entry.partySize} {entry.partySize === 1 ? 'spot' : 'spots'}
                        </Badge>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === entry.id}
                            >
                              {actionLoading === entry.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {entry.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleMarkContacted(entry)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Mark as Contacted
                              </DropdownMenuItem>
                            )}
                            {entry.status === 'contacted' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(entry.id, 'registered')}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Mark as Registered
                              </DropdownMenuItem>
                            )}
                            {(entry.status === 'contacted' || entry.status === 'expired') && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(entry.id, 'pending')}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Move Back to Waiting
                              </DropdownMenuItem>
                            )}
                            {entry.status !== 'expired' && entry.status !== 'registered' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(entry.id, 'expired')}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Mark as Expired
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setEntryToDelete(entry)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Waitlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
