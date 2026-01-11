'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Key,
  Search,
  Link2,
  Link2Off,
  Users,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
} from 'lucide-react'

interface LinkedAccount {
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  lastAccessed: string | null
}

interface AccessCode {
  id: string
  accessCode: string
  groupName: string
  parishName: string | null
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  totalParticipants: number
  registeredAt: string
  linkedAccount: LinkedAccount | null
}

interface Stats {
  total: number
  linked: number
  unlinked: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AccessCodesClientProps {
  eventId: string
  eventName: string
}

export default function AccessCodesClient({ eventId, eventName }: AccessCodesClientProps) {
  const { getToken } = useAuth()

  // Filter states
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Data states
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, linked: 0, unlinked: 0 })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<AccessCode | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch access codes
  const fetchAccessCodes = useCallback(
    async (page = 1) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (linkedFilter !== 'all') params.set('linked', linkedFilter)
        if (debouncedSearch) params.set('search', debouncedSearch)
        params.set('page', String(page))
        params.set('limit', '50')

        const token = await getToken()
        const response = await fetch(`/api/admin/events/${eventId}/access-codes?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!response.ok) throw new Error('Failed to fetch access codes')

        const data = await response.json()
        setAccessCodes(data.accessCodes)
        setStats(data.stats)
        setPagination(data.pagination)
      } catch (error) {
        console.error('Error fetching access codes:', error)
        setErrorMessage('Failed to load access codes')
      } finally {
        setIsLoading(false)
      }
    },
    [eventId, linkedFilter, debouncedSearch, getToken]
  )

  useEffect(() => {
    fetchAccessCodes(1)
  }, [fetchAccessCodes])

  const handlePageChange = (page: number) => {
    fetchAccessCodes(page)
  }

  const handleDisconnect = async (accessCode: AccessCode) => {
    setDisconnectingId(accessCode.id)
    setErrorMessage(null)

    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/access-codes/${accessCode.id}/disconnect`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect account')
      }

      setSuccessMessage(
        `Successfully disconnected account from ${accessCode.accessCode}`
      )
      setConfirmDisconnect(null)
      fetchAccessCodes(pagination.page)
    } catch (error: any) {
      console.error('Error disconnecting account:', error)
      setErrorMessage(error.message || 'Failed to disconnect account')
    } finally {
      setDisconnectingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/admin/events/${eventId}`}
          className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#1E3A5F] mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {eventName}
        </Link>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Access Code Management
        </h1>
        <p className="text-[#6B7280]">
          View access codes and manage linked accounts for {eventName}. Disconnect accounts when
          group leaders change or need to transfer access.
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1E3A5F]/10 rounded-lg">
                <Key className="h-5 w-5 text-[#1E3A5F]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Access Codes</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Link2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Linked to Account</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.linked}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Link2Off className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Not Linked</p>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.unlinked}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by access code, group name, leader name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>

            {/* Linked Filter */}
            <select
              value={linkedFilter}
              onChange={(e) =>
                setLinkedFilter(e.target.value as 'all' | 'linked' | 'unlinked')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="linked">Linked</option>
              <option value="unlinked">Not Linked</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Access Codes Table */}
      <Card className="bg-white border-[#D1D5DB]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Access Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Group Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Registration Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Linked Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading access codes...
                  </td>
                </tr>
              ) : accessCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No access codes found for this event
                  </td>
                </tr>
              ) : (
                accessCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    {/* Access Code */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-[#9C8466]" />
                        <span className="font-mono font-semibold text-[#1E3A5F]">
                          {code.accessCode}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Registered {formatDate(code.registeredAt)}
                      </div>
                    </td>

                    {/* Group Info */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {code.groupName}
                      </div>
                      {code.parishName && (
                        <div className="text-sm text-gray-500">
                          {code.parishName}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Users className="h-3 w-3" />
                        {code.totalParticipants} participants
                      </div>
                    </td>

                    {/* Registration Contact */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {code.groupLeaderName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="h-3 w-3" />
                        {code.groupLeaderEmail}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" />
                        {code.groupLeaderPhone}
                      </div>
                    </td>

                    {/* Linked Account */}
                    <td className="px-4 py-4">
                      {code.linkedAccount ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm font-medium text-gray-900">
                              {code.linkedAccount.firstName || code.linkedAccount.lastName
                                ? `${code.linkedAccount.firstName || ''} ${code.linkedAccount.lastName || ''}`.trim()
                                : 'Linked'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Mail className="h-3 w-3" />
                            {code.linkedAccount.email}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Calendar className="h-3 w-3" />
                            Last accessed: {formatDateTime(code.linkedAccount.lastAccessed)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-2 h-2 bg-gray-300 rounded-full" />
                          <span className="text-sm">Not linked</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      {code.linkedAccount ? (
                        <button
                          onClick={() => setConfirmDisconnect(code)}
                          disabled={disconnectingId === code.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Link2Off className="h-4 w-4" />
                          {disconnectingId === code.id ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          No action needed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} access codes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Confirm Disconnect Modal */}
      {confirmDisconnect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Disconnect Account?
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to disconnect the account from access code{' '}
              <span className="font-mono font-semibold">
                {confirmDisconnect.accessCode}
              </span>
              ?
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {confirmDisconnect.groupName}
                </div>
                <div className="text-gray-500">
                  Currently linked to: {confirmDisconnect.linkedAccount?.email}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              After disconnecting, the group leader will need to link their access
              code again to access the dashboard. This is useful when the group
              leader has changed or they need to use a different email account.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmDisconnect(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDisconnect(confirmDisconnect)}
                disabled={disconnectingId === confirmDisconnect.id}
              >
                {disconnectingId === confirmDisconnect.id
                  ? 'Disconnecting...'
                  : 'Yes, Disconnect'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
