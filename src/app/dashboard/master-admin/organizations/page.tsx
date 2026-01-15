'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  LogIn,
  Pause,
  Play,
  MoreVertical,
  Calendar,
  Users,
  DollarSign,
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  Mail,
  Clock,
  UserCheck
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: string
  contactName: string
  contactEmail: string
  subscriptionTier: string
  subscriptionStatus: string
  status: string
  eventsUsed: number
  eventsPerYearLimit: number | null
  registrationsUsed: number
  registrationsLimit: number | null
  monthlyFee: number
  createdAt: string
  stripeAccountId: string | null
  stripeOnboardingCompleted: boolean
  orgAdmin: {
    id: string
    firstName: string
    lastName: string
    email: string
    isOnboarded: boolean
  } | null
}

// Helper function to get Stripe status display
function getStripeStatus(org: Organization): { label: string; color: string; icon: 'check' | 'warning' | 'x' } | null {
  if (org.stripeAccountId && org.stripeOnboardingCompleted) {
    return { label: 'Connected', color: 'bg-green-100 text-green-700', icon: 'check' }
  }
  if (org.stripeAccountId && !org.stripeOnboardingCompleted) {
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: 'warning' }
  }
  return { label: 'Not Connected', color: 'bg-red-100 text-red-700', icon: 'x' }
}

// Helper function to get onboarding status display
function getOnboardingStatus(org: Organization): { label: string; color: string; icon: 'check' | 'clock' } {
  if (!org.orgAdmin) {
    return { label: 'No Admin', color: 'bg-gray-100 text-gray-700', icon: 'clock' }
  }
  if (org.orgAdmin.isOnboarded) {
    return { label: 'Active', color: 'bg-green-100 text-green-700', icon: 'check' }
  }
  return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: 'clock' }
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  parish: 'Parish',
  shrine: 'Shrine',
  cathedral: 'Cathedral',
  basilica: 'Basilica',
  test: 'Test (Free)',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
}

export default function OrganizationsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const token = await getToken()
        const response = await fetch('/api/master-admin/organizations', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (response.ok) {
          const data = await response.json()
          setOrganizations(data.organizations)
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [getToken])

  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contactName?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || org.status === statusFilter
      const matchesTier = tierFilter === 'all' || org.subscriptionTier === tierFilter

      return matchesSearch && matchesStatus && matchesTier
    })
  }, [organizations, searchQuery, statusFilter, tierFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: organizations.length }
    organizations.forEach(org => {
      counts[org.status] = (counts[org.status] || 0) + 1
    })
    return counts
  }, [organizations])

  const handleImpersonate = async (orgId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${orgId}/impersonate`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        // Use full page reload so browser sends the new impersonation cookies
        // router.push() is client-side and won't pick up new cookies properly
        window.location.href = '/dashboard/admin'
      }
    } catch (error) {
      console.error('Failed to impersonate:', error)
    }
    setOpenDropdown(null)
  }

  const handleSuspend = async (orgId: string) => {
    if (!confirm('Are you sure you want to suspend this organization?')) return

    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${orgId}/suspend`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        setOrganizations(orgs =>
          orgs.map(org =>
            org.id === orgId ? { ...org, status: 'suspended' } : org
          )
        )
      }
    } catch (error) {
      console.error('Failed to suspend:', error)
    }
    setOpenDropdown(null)
  }

  const handleReactivate = async (orgId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${orgId}/reactivate`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        setOrganizations(orgs =>
          orgs.map(org =>
            org.id === orgId ? { ...org, status: 'active' } : org
          )
        )
      }
    } catch (error) {
      console.error('Failed to reactivate:', error)
    }
    setOpenDropdown(null)
  }

  const handleResendOnboarding = async (orgId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${orgId}/resend-onboarding`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (response.ok) {
        alert(`Onboarding email sent to ${data.sentTo}`)
      } else {
        alert(data.error || 'Failed to resend onboarding email')
      }
    } catch (error) {
      console.error('Failed to resend onboarding:', error)
      alert('Failed to resend onboarding email')
    }
    setOpenDropdown(null)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-600 mt-1">
            Total: {organizations.length} organizations
          </p>
        </div>
        <Link
          href="/dashboard/master-admin/organizations/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Create New Organization
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'pending', label: 'Pending' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({statusCounts[tab.value] || 0})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="parish">Parish</option>
            <option value="shrine">Shrine</option>
            <option value="cathedral">Cathedral</option>
            <option value="basilica">Basilica</option>
            <option value="test">Test (Free)</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading organizations...</div>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Building2 className="h-12 w-12 mb-4 text-gray-300" />
            <p>No organizations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Onboarding
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrations
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MRR
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrganizations.map(org => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{org.name}</p>
                          {(() => {
                            const stripeStatus = getStripeStatus(org)
                            if (!stripeStatus) return null
                            return (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${stripeStatus.color}`}>
                                {stripeStatus.icon === 'check' && <Check className="h-3 w-3" />}
                                {stripeStatus.icon === 'warning' && <AlertTriangle className="h-3 w-3" />}
                                {stripeStatus.icon === 'x' && <X className="h-3 w-3" />}
                                {stripeStatus.label}
                              </span>
                            )
                          })()}
                        </div>
                        <p className="text-xs text-gray-500">{org.contactName} • {org.contactEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {tierLabels[org.subscriptionTier] || org.subscriptionTier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[org.status]}`}>
                        {statusLabels[org.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const onboardingStatus = getOnboardingStatus(org)
                        return (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium rounded-full ${onboardingStatus.color}`}>
                            {onboardingStatus.icon === 'check' && <UserCheck className="h-3 w-3" />}
                            {onboardingStatus.icon === 'clock' && <Clock className="h-3 w-3" />}
                            {onboardingStatus.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {org.eventsUsed}
                        {org.eventsPerYearLimit && ` / ${org.eventsPerYearLimit}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {org.registrationsUsed.toLocaleString()}
                        {org.registrationsLimit && ` / ${org.registrationsLimit.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(org.monthlyFee)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/master-admin/organizations/${org.id}`}
                          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/master-admin/organizations/${org.id}/edit`}
                          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === org.id ? null : org.id)}
                            className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openDropdown === org.id && (
                            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={() => handleImpersonate(org.id)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <LogIn className="h-4 w-4" />
                                Login As Org Admin
                              </button>
                              <button
                                onClick={() => handleResendOnboarding(org.id)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Mail className="h-4 w-4" />
                                Resend Onboarding Email
                              </button>
                              {org.status === 'active' ? (
                                <button
                                  onClick={() => handleSuspend(org.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Pause className="h-4 w-4" />
                                  Suspend
                                </button>
                              ) : org.status === 'suspended' ? (
                                <button
                                  onClick={() => handleReactivate(org.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <Play className="h-4 w-4" />
                                  Reactivate
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
