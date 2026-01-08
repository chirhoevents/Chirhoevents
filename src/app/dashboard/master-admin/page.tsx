'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  Users,
  DollarSign,
  Bell,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  FileText,
  Ticket,
  BarChart3,
  Settings,
  ArrowRight
} from 'lucide-react'

interface DashboardStats {
  platformOverview: {
    totalOrganizations: number
    activeOrganizations: number
    pendingOrganizations: number
    suspendedOrganizations: number
    totalEvents: number
    activeEvents: number
    totalRegistrations: number
    thisMonthRegistrations: number
    totalRevenue: number
    thisMonthRevenue: number
  }
  mrr: {
    currentMRR: number
    annualRunRate: number
    growth: number
    growthDescription: string
  }
  pendingActions: {
    newOrgRequests: number
    openSupportTickets: number
    orgsPastDue: number
    orgsNearLimits: number
  }
  subscriptionBreakdown: {
    starter: number
    smallDiocese: number
    growing: number
    conference: number
    enterprise: number
    testFree: number
    totalActive: number
  }
  recentActivity: Array<{
    description: string
    timestamp: string
    type: 'payment' | 'event' | 'ticket' | 'org'
  }>
}

export default function MasterAdminDashboard() {
  const { getToken } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken()
        const response = await fetch('/api/master-admin/dashboard/stats', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [getToken])

  // Default stats while loading or if API fails
  const displayStats: DashboardStats = stats || {
    platformOverview: {
      totalOrganizations: 2,
      activeOrganizations: 2,
      pendingOrganizations: 0,
      suspendedOrganizations: 0,
      totalEvents: 5,
      activeEvents: 3,
      totalRegistrations: 456,
      thisMonthRegistrations: 234,
      totalRevenue: 52380,
      thisMonthRevenue: 12450,
    },
    mrr: {
      currentMRR: 348,
      annualRunRate: 4176,
      growth: 249,
      growthDescription: 'Saint Joseph added',
    },
    pendingActions: {
      newOrgRequests: 0,
      openSupportTickets: 0,
      orgsPastDue: 0,
      orgsNearLimits: 0,
    },
    subscriptionBreakdown: {
      starter: 0,
      smallDiocese: 0,
      growing: 0,
      conference: 1,
      enterprise: 0,
      testFree: 1,
      totalActive: 1,
    },
    recentActivity: [
      { description: 'Saint Joseph paid $2,490 (annual)', timestamp: 'Today, 2:15 PM', type: 'payment' },
      { description: 'Mount St Mary\'s created new event', timestamp: 'Yesterday, 4:30 PM', type: 'event' },
      { description: 'Support ticket #001 resolved', timestamp: 'Dec 26, 11:00 AM', type: 'ticket' },
    ],
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-4 w-4 text-green-500" />
      case 'event': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'ticket': return <Ticket className="h-4 w-4 text-orange-500" />
      case 'org': return <Building2 className="h-4 w-4 text-purple-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const pendingActionsTotal =
    displayStats.pendingActions.newOrgRequests +
    displayStats.pendingActions.openSupportTickets +
    displayStats.pendingActions.orgsPastDue +
    displayStats.pendingActions.orgsNearLimits

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of ChiRho Events platform</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/master-admin/organizations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Card 1: Platform Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Platform Overview</h2>
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-purple-600">{displayStats.platformOverview.totalOrganizations}</p>
              <p className="text-sm text-gray-600">Total Organizations</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Active: {displayStats.platformOverview.activeOrganizations}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Pending: {displayStats.platformOverview.pendingOrganizations}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Suspended: {displayStats.platformOverview.suspendedOrganizations}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Total Events (All Time)</span>
                <span className="text-lg font-semibold text-gray-900">{displayStats.platformOverview.totalEvents}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-sm text-gray-600">Active Events</span>
                <span className="text-lg font-semibold text-gray-900">{displayStats.platformOverview.activeEvents}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Total Registrations</span>
                <span className="text-lg font-semibold text-gray-900">{displayStats.platformOverview.totalRegistrations.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-lg font-semibold text-gray-900">{displayStats.platformOverview.thisMonthRegistrations.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="text-lg font-semibold text-green-600">{formatCurrency(displayStats.platformOverview.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-lg font-semibold text-green-600">{formatCurrency(displayStats.platformOverview.thisMonthRevenue)}</span>
              </div>
            </div>

            <Link href="/dashboard/master-admin/revenue" className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium pt-2">
              View Full Analytics <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: Monthly Recurring Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Recurring Revenue</h2>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(displayStats.mrr.currentMRR)}</p>
              <p className="text-sm text-gray-600">Current MRR</p>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Annual Run Rate</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(displayStats.mrr.annualRunRate)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-green-600">+{formatCurrency(displayStats.mrr.growth)} this month</p>
                  <p className="text-xs text-gray-500">({displayStats.mrr.growthDescription})</p>
                </div>
              </div>
            </div>

            <Link href="/dashboard/master-admin/revenue" className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium pt-2">
              View Revenue Details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Card 3: Pending Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending Actions</h2>
            <Bell className="h-5 w-5 text-orange-600" />
          </div>

          <div className="space-y-3">
            <Link href="/dashboard/master-admin/pending-requests" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">New Organization Requests</span>
              </div>
              <span className={`text-lg font-bold ${displayStats.pendingActions.newOrgRequests > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {displayStats.pendingActions.newOrgRequests}
              </span>
            </Link>

            <Link href="/dashboard/master-admin/support-tickets" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm text-gray-700">Open Support Tickets</span>
              </div>
              <span className={`text-lg font-bold ${displayStats.pendingActions.openSupportTickets > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {displayStats.pendingActions.openSupportTickets}
              </span>
            </Link>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm text-gray-700">Orgs Past Due</span>
              </div>
              <span className={`text-lg font-bold ${displayStats.pendingActions.orgsPastDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {displayStats.pendingActions.orgsPastDue}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-700">Orgs Near Limits</span>
              </div>
              <span className={`text-lg font-bold ${displayStats.pendingActions.orgsNearLimits > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {displayStats.pendingActions.orgsNearLimits}
              </span>
            </div>

            {pendingActionsTotal === 0 && (
              <div className="flex items-center gap-2 pt-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">All caught up!</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Platform Activity</h2>
            <Clock className="h-5 w-5 text-gray-600" />
          </div>

          <div className="space-y-4">
            {displayStats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm text-gray-700">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium pt-4">
            View All Activity <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Card 5: Subscription Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Subscription Breakdown</h2>
            <Users className="h-5 w-5 text-purple-600" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Starter ($49/mo)</span>
              <span className="text-sm font-medium text-gray-900">{displayStats.subscriptionBreakdown.starter} orgs</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Small Diocese ($99/mo)</span>
              <span className="text-sm font-medium text-gray-900">{displayStats.subscriptionBreakdown.smallDiocese} orgs</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Growing ($149/mo)</span>
              <span className="text-sm font-medium text-gray-900">{displayStats.subscriptionBreakdown.growing} orgs</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Conference ($249/mo)</span>
              <span className="text-sm font-medium text-purple-600 font-semibold">{displayStats.subscriptionBreakdown.conference} orgs</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Enterprise ($499+/mo)</span>
              <span className="text-sm font-medium text-gray-900">{displayStats.subscriptionBreakdown.enterprise} orgs</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Test/Free</span>
              <span className="text-sm font-medium text-gray-500">{displayStats.subscriptionBreakdown.testFree} orgs</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Total Active Subscriptions</span>
              <span className="text-lg font-bold text-purple-600">{displayStats.subscriptionBreakdown.totalActive}</span>
            </div>
          </div>
        </div>

        {/* Card 6: Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <Settings className="h-5 w-5 text-gray-600" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/dashboard/master-admin/organizations/new"
              className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Plus className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Create New Organization</span>
            </Link>

            <Link
              href="/dashboard/master-admin/pending-requests"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">View Pending Requests</span>
            </Link>

            <Link
              href="/dashboard/master-admin/support-tickets"
              className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Ticket className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">View Support Tickets</span>
            </Link>

            <Link
              href="/dashboard/master-admin/revenue"
              className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Generate Revenue Report</span>
            </Link>

            <Link
              href="/dashboard/master-admin/settings"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Platform Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
