'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Search,
  Users,
  User,
  Loader2,
  Check,
  AlertCircle,
  X,
  Printer,
  FileText,
  BarChart3,
  RefreshCw,
  Tag,
  ExternalLink,
  QrCode,
  Settings,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { ReprintBadgeModal } from '@/components/salve/ReprintBadgeModal'

type CheckInMode = 'group' | 'individual'

// SALVE management page in the admin dashboard. Everything except the actual
// check-in lives here (packets, name tags, badge reprints, attendance, stats,
// settings). Check-in itself only happens in the dedicated portal at
// /portal/salve/[eventId].
export default function SalveManagementPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [eventName, setEventName] = useState('')
  const [stats, setStats] = useState({ totalExpected: 0, checkedIn: 0, issues: 0 })

  // SALVE settings
  const [checkInMode, setCheckInMode] = useState<CheckInMode>('group')
  const [groupRegistrationEnabled, setGroupRegistrationEnabled] = useState(true)
  const [canEditSettings, setCanEditSettings] = useState(false)
  const [savingMode, setSavingMode] = useState(false)

  // Reprint modal
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false)

  // Attendance modal (view only; check-in happens in the portal)
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)
  const [attendance, setAttendance] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all')

  useEffect(() => {
    fetchSettings()
    fetchStats()
  }, [eventId])

  async function fetchSettings() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/settings`)
      if (response.ok) {
        const data = await response.json()
        setEventName(data.eventName || 'Event')
        setCheckInMode(data.checkInMode === 'individual' ? 'individual' : 'group')
        setGroupRegistrationEnabled(data.groupRegistrationEnabled !== false)
        setCanEditSettings(!!data.canEdit)
      }
    } catch (error) {
      console.error('Failed to fetch SALVE settings:', error)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function handleModeChange(mode: CheckInMode) {
    if (mode === checkInMode || savingMode) return
    const previous = checkInMode
    setCheckInMode(mode)
    setSavingMode(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInMode: mode }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save check-in mode')
      }
      toast.success(mode === 'individual' ? 'Individual check-in turned on' : 'Group check-in turned on')
    } catch (error) {
      setCheckInMode(previous)
      toast.error(error instanceof Error ? error.message : 'Failed to save check-in mode')
    } finally {
      setSavingMode(false)
    }
  }

  async function fetchAttendance() {
    setAttendanceLoading(true)
    try {
      const params = new URLSearchParams()
      if (attendanceSearch) params.set('search', attendanceSearch)
      if (attendanceFilter !== 'all') params.set('status', attendanceFilter)

      const response = await fetch(`/api/admin/events/${eventId}/salve/participants?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAttendance(data.participants || [])
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  useEffect(() => {
    if (isAttendanceOpen) {
      fetchAttendance()
    }
  }, [isAttendanceOpen, attendanceFilter])

  const totalExpected = stats?.totalExpected || 0
  const checkedIn = stats?.checkedIn || 0
  const issues = stats?.issues || 0
  const notCheckedIn = totalExpected - checkedIn
  const progressPercentage = totalExpected > 0
    ? Math.round((checkedIn / totalExpected) * 100)
    : 0

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <span className="text-navy font-medium">SALVE</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-navy">SALVE Check-In</h1>
            <p className="text-muted-foreground">{eventName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/admin/events/${eventId}/salve/welcome-packets`}>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                Edit Packets
              </Button>
            </Link>
            <Link href={`/dashboard/admin/events/${eventId}/salve/name-tags`}>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <Tag className="w-4 h-4 mr-2" />
                Edit Name Tags
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
              onClick={() => setIsReprintModalOpen(true)}
            >
              <Printer className="w-4 h-4 mr-2" />
              Reprint Badge
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
              onClick={() => setIsAttendanceOpen(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              View All Attendance
            </Button>
            <Link href={`/dashboard/admin/events/${eventId}/salve/dashboard`}>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 md:pt-4 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Checked In</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {checkedIn} / {totalExpected}
                </p>
              </div>
              <Check className="w-6 h-6 md:w-8 md:h-8 text-green-500 hidden sm:block" />
            </div>
            <Progress value={progressPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:pt-4 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Issues</p>
                <p className="text-lg md:text-2xl font-bold text-amber-600">{issues}</p>
              </div>
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-amber-500 hidden sm:block" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 hidden md:block">Missing forms or payments</p>
          </CardContent>
        </Card>

        <Card className="bg-navy text-white">
          <CardContent className="p-3 md:pt-4 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-white/70">Not Checked In</p>
                <p className="text-lg md:text-2xl font-bold">
                  {notCheckedIn}
                </p>
              </div>
              <Users className="w-6 h-6 md:w-8 md:h-8 text-white/50 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in happens in the portal */}
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <QrCode className="w-14 h-14 mx-auto text-emerald-600" />
            <div>
              <h2 className="text-xl font-semibold mb-1">Check-In Portal</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Scanning QR codes and checking people in happens in the dedicated check-in
                portal. Open it on each check-in station&apos;s device.
              </p>
            </div>
            <Link href={`/portal/salve/${eventId}`} target="_blank">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <ExternalLink className="w-5 h-5 mr-2" />
                Open Check-In Portal
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* SALVE Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-navy flex items-center gap-2">
              <Settings className="w-5 h-5" />
              SALVE Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-navy">Check-in mode</p>
            {groupRegistrationEnabled ? (
              <>
                <p className="text-xs text-muted-foreground">
                  How group registrations are checked in at the portal. Individual
                  registrations are always checked in one person at a time.
                </p>
                {([
                  {
                    value: 'group',
                    icon: Users,
                    title: 'Group check-in',
                    description:
                      'The group leader checks in the whole group at once. Staff scan the group QR code or search the group, tick who is here, then print the group welcome packet (with the group\'s balance and invoice, if turned on) and everyone\'s name tags.',
                  },
                  {
                    value: 'individual',
                    icon: User,
                    title: 'Individual check-in',
                    description:
                      'Each participant checks in on their own. Staff scan the participant\'s personal QR code or search their name, and print just that person\'s name tag. The group\'s balance, housing summary and welcome packet are not shown at the table; hand group packets to group leaders separately.',
                  },
                ] as const).map((option) => {
                  const Icon = option.icon
                  const selected = checkInMode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!canEditSettings || savingMode}
                      onClick={() => handleModeChange(option.value)}
                      className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors disabled:cursor-not-allowed ${
                        selected ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${selected ? 'text-navy' : 'text-muted-foreground'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-navy">{option.title}</p>
                          {selected && (
                            savingMode
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-navy" />
                              : <Badge className="bg-navy text-white">On</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
                {!canEditSettings && (
                  <p className="text-xs text-muted-foreground">
                    Only org admins, event managers and SALVE coordinators can change this.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                This event only takes individual registrations, so everyone is checked in one
                person at a time.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reprint / Walk-Up Modal */}
      <ReprintBadgeModal
        open={isReprintModalOpen}
        onClose={() => setIsReprintModalOpen(false)}
        eventId={eventId}
        eventName={eventName}
      />

      {/* Attendance Modal (view only) */}
      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-navy flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Attendance - {eventName}
            </DialogTitle>
            <DialogDescription>
              Check-in status for all participants. To check someone in, use the check-in portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAttendance()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={attendanceFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={attendanceFilter === 'checked_in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('checked_in')}
                  className={attendanceFilter === 'checked_in' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Checked In
                </Button>
                <Button
                  variant={attendanceFilter === 'not_checked_in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('not_checked_in')}
                  className={attendanceFilter === 'not_checked_in' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  <X className="w-4 h-4 mr-1" />
                  Not Checked In
                </Button>
                <Button variant="outline" size="sm" onClick={fetchAttendance}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Participants List */}
            <ScrollArea className="h-[500px] border rounded-lg">
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-navy" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mb-2 opacity-50" />
                  <p>No participants found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {attendance.map((participant) => (
                    <div
                      key={`${participant.registrationType}-${participant.id}`}
                      className={`flex items-center justify-between p-3 ${
                        participant.checkedIn ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {participant.firstName} {participant.lastName}
                          </span>
                          {participant.checkedIn ? (
                            <Badge className="bg-green-500">Checked In</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Not Checked In
                            </Badge>
                          )}
                          {participant.registrationType === 'individual' && (
                            <Badge variant="secondary">Individual</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {participant.groupName}
                          {participant.email && ` • ${participant.email}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>Showing {attendance.length} participants</span>
              <span>
                {attendance.filter(p => p.checkedIn).length} checked in / {attendance.filter(p => !p.checkedIn).length} not checked in
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
