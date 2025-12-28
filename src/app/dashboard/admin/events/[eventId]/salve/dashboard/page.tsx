'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Check,
  AlertCircle,
  Building2,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Activity,
  UserCheck,
  UserX,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface StatsData {
  totalParticipants: number
  checkedIn: number
  remaining: number
  percentCheckedIn: number
  totalGroups: number
  groupsWithCheckIns: number
  fullyCheckedInGroups: number
  checkInsToday: number
  recentActivity: ActivityLog[]
}

interface ActivityLog {
  id: string
  action: 'check_in' | 'check_out'
  timestamp: string
  participantName: string | null
  groupName: string | null
  stationId: string | null
  notes: string | null
}

interface GroupProgress {
  id: string
  groupName: string
  diocese: string | null
  total: number
  checkedIn: number
  percentage: number
  lastCheckIn: string | null
}

export default function SalveDashboardPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [eventName, setEventName] = useState('')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [groups, setGroups] = useState<GroupProgress[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [eventRes, statsRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`),
        fetch(`/api/admin/events/${eventId}/salve/stats`),
        fetch(`/api/admin/events/${eventId}/groups?includeCheckInStats=true`),
      ])

      if (eventRes.ok) {
        const eventData = await eventRes.json()
        setEventName(eventData.name || 'Event')
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        const groupProgress = groupsData.map((g: any) => ({
          id: g.id,
          groupName: g.groupName,
          diocese: g.diocese,
          total: g._count?.participants || g.participantCount || 0,
          checkedIn: g.checkedInCount || 0,
          percentage: g.participantCount > 0
            ? Math.round((g.checkedInCount / g.participantCount) * 100)
            : 0,
          lastCheckIn: g.lastCheckIn || null,
        }))
        setGroups(groupProgress)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to refresh dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchData(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  const pendingGroups = groups.filter(g => g.percentage < 100 && g.percentage > 0)
  const notStartedGroups = groups.filter(g => g.percentage === 0)
  const completedGroups = groups.filter(g => g.percentage === 100)

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}/salve`} className="hover:text-navy">SALVE</Link>
          <span>/</span>
          <span className="text-navy font-medium">Dashboard</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">SALVE Dashboard</h1>
            <p className="text-muted-foreground">Real-time check-in monitoring for {eventName}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {lastUpdate && (
                <>Last updated: {lastUpdate.toLocaleTimeString()}</>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'border-green-500 text-green-600' : ''}
            >
              <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href={`/dashboard/admin/events/${eventId}/salve`}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Check-In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Checked In</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.checkedIn || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <Progress value={stats?.percentCheckedIn || 0} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.percentCheckedIn || 0}% of {stats?.totalParticipants || 0} participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-3xl font-bold text-amber-600">
                  {stats?.remaining || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <UserX className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              participants not yet checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Groups Complete</p>
                <p className="text-3xl font-bold text-navy">
                  {stats?.fullyCheckedInGroups || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-navy" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              of {stats?.totalGroups || 0} total groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Check-Ins Today</p>
                <p className="text-3xl font-bold text-gold">
                  {stats?.checkInsToday || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gold" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              participants processed today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Group Progress */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Group Check-In Progress</CardTitle>
              <Tabs defaultValue="pending" className="w-auto">
                <TabsList>
                  <TabsTrigger value="pending">
                    In Progress ({pendingGroups.length})
                  </TabsTrigger>
                  <TabsTrigger value="not-started">
                    Not Started ({notStartedGroups.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedGroups.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending">
                <TabsContent value="pending" className="mt-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {pendingGroups.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No groups in progress
                        </p>
                      ) : (
                        pendingGroups
                          .sort((a, b) => b.percentage - a.percentage)
                          .map((group) => (
                            <GroupProgressCard key={group.id} group={group} eventId={eventId} />
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="not-started" className="mt-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {notStartedGroups.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          All groups have started check-in
                        </p>
                      ) : (
                        notStartedGroups.map((group) => (
                          <GroupProgressCard key={group.id} group={group} eventId={eventId} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {completedGroups.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No groups fully checked in yet
                        </p>
                      ) : (
                        completedGroups.map((group) => (
                          <GroupProgressCard key={group.id} group={group} eventId={eventId} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[440px]">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GroupProgressCard({ group, eventId }: { group: GroupProgress; eventId: string }) {
  return (
    <Link
      href={`/dashboard/admin/events/${eventId}/salve?groupId=${group.id}`}
      className="block"
    >
      <div className="flex items-center gap-4 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{group.groupName}</span>
            {group.percentage === 100 && (
              <Badge className="bg-green-500">Complete</Badge>
            )}
          </div>
          {group.diocese && (
            <p className="text-xs text-muted-foreground truncate">{group.diocese}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Progress value={group.percentage} className="h-2 flex-1" />
            <span className="text-sm font-medium w-16 text-right">
              {group.checkedIn}/{group.total}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function ActivityCard({ activity }: { activity: ActivityLog }) {
  const getActionIcon = () => {
    switch (activity.action) {
      case 'check_in':
        return <UserCheck className="w-4 h-4 text-green-600" />
      case 'check_out':
        return <UserX className="w-4 h-4 text-red-600" />
      default:
        return <Users className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionLabel = () => {
    switch (activity.action) {
      case 'check_in':
        return 'checked in'
      case 'check_out':
        return 'checked out'
      default:
        return activity.action
    }
  }

  const timestamp = new Date(activity.timestamp)
  const timeAgo = getTimeAgo(timestamp)

  return (
    <div className="flex items-start gap-3 p-2 rounded border-l-2 border-l-gray-200 bg-gray-50">
      <div className="mt-0.5">{getActionIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.participantName || 'Unknown'}</span>
          <span className="text-muted-foreground"> {getActionLabel()}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {activity.groupName}
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return date.toLocaleDateString()
}
