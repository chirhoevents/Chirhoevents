'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home,
  Users,
  Grid3X3,
  Utensils,
  AlertTriangle,
  CheckCircle,
  Search,
  MapPin,
  Phone,
  Mail,
  Loader2,
  FileText,
  Shield
} from 'lucide-react'

interface PorosOverviewProps {
  eventId: string
  settings: any
}

interface SearchResult {
  id: string
  type: 'group'
  groupName: string
  leaderName: string
  leaderEmail: string | null
  leaderPhone: string | null
  diocese: string | null
  housingType: string | null
  participantCount: number
  maleCount: number
  femaleCount: number
  roomAssignments: { building: string; room: string }[]
  seating: { section: string } | null
  smallGroup: { id: string; name: string } | null
  mealColor: string | null
}

// Helper function for meal color hex values
function getMealColorHex(color: string): string {
  const colors: Record<string, string> = {
    blue: '#3498db',
    red: '#e74c3c',
    orange: '#e67e22',
    yellow: '#f1c40f',
    green: '#27ae60',
    purple: '#9b59b6',
    brown: '#8b4513',
    grey: '#95a5a6',
    gray: '#95a5a6',
  }
  return colors[color.toLowerCase()] || '#6b7280'
}

interface PorosStats {
  totalParticipants: number
  onCampusCount: number
  offCampusCount: number
  dayPassCount: number
  housing: {
    totalBuildings: number
    totalRooms: number
    totalBeds: number
    assigned: number
    unassigned: number
    maleCapacity: number
    maleUsed: number
    femaleCapacity: number
    femaleUsed: number
  }
  seating: {
    totalSections: number
    totalCapacity: number
    assigned: number
    unassigned: number
  }
  smallGroups: {
    totalGroups: number
    avgSize: number
    assigned: number
    unassigned: number
    sglsAssigned: number
    sglsNeeded: number
  }
  mealGroups: {
    totalGroups: number
    assigned: number
  }
  ada: {
    totalIndividuals: number
    assigned: number
    unassigned: number
  }
}

export function PorosOverview({ eventId, settings }: PorosOverviewProps) {
  const [stats, setStats] = useState<PorosStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [eventId])

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      performSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, eventId])

  async function performSearch(query: string) {
    setSearching(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/search?q=${encodeURIComponent(query)}`
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-navy border-t-transparent rounded-full" />
      </div>
    )
  }

  const housingEnabled = settings?.porosHousingEnabled ?? true
  const seatingEnabled = settings?.porosSeatingEnabled ?? false
  const smallGroupsEnabled = settings?.porosSmallGroupEnabled ?? false
  const mealGroupsEnabled = settings?.porosMealColorsEnabled ?? false
  const adaEnabled = settings?.porosAdaEnabled ?? false

  const maleUtilization = stats?.housing?.maleCapacity
    ? Math.round((stats.housing.maleUsed / stats.housing.maleCapacity) * 100)
    : 0

  const femaleUtilization = stats?.housing?.femaleCapacity
    ? Math.round((stats.housing.femaleUsed / stats.housing.femaleCapacity) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold text-navy">
                  {stats?.totalParticipants || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-Campus</p>
                <p className="text-2xl font-bold text-navy">
                  {stats?.onCampusCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Off-Campus</p>
                <p className="text-2xl font-bold text-navy">
                  {stats?.offCampusCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Utensils className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Day Pass</p>
                <p className="text-2xl font-bold text-navy">
                  {stats?.dayPassCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Housing Status */}
        {housingEnabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="w-5 h-5 text-navy" />
                Housing Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Buildings</span>
                    <p className="font-semibold">{stats?.housing?.totalBuildings || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rooms</span>
                    <p className="font-semibold">{stats?.housing?.totalRooms || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Beds</span>
                    <p className="font-semibold">{stats?.housing?.totalBeds || 0}</p>
                  </div>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Assigned</span>
                    <span className="font-semibold text-green-600">
                      {stats?.housing?.assigned || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Unassigned</span>
                    <span className="font-semibold text-red-600">
                      {stats?.housing?.unassigned || 0}
                    </span>
                  </div>
                </div>

                {/* Male/Female Capacity */}
                <div className="pt-3 border-t space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Male Housing</span>
                      <span>{stats?.housing?.maleUsed || 0} / {stats?.housing?.maleCapacity || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${maleUtilization > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(maleUtilization, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Female Housing</span>
                      <span>{stats?.housing?.femaleUsed || 0} / {stats?.housing?.femaleCapacity || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${femaleUtilization > 90 ? 'bg-red-500' : 'bg-pink-500'}`}
                        style={{ width: `${Math.min(femaleUtilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {stats?.housing?.unassigned && stats.housing.unassigned > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      {stats.housing.unassigned} participants need room assignments
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seating Status */}
        {seatingEnabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Grid3X3 className="w-5 h-5 text-navy" />
                Seating Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sections</span>
                    <p className="font-semibold">{stats?.seating?.totalSections || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacity</span>
                    <p className="font-semibold">{stats?.seating?.totalCapacity || 0}</p>
                  </div>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Groups Assigned</span>
                    <span className="font-semibold text-green-600">
                      {stats?.seating?.assigned || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Groups Unassigned</span>
                    <span className="font-semibold text-red-600">
                      {stats?.seating?.unassigned || 0}
                    </span>
                  </div>
                </div>

                {stats?.seating?.unassigned && stats.seating.unassigned > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      {stats.seating.unassigned} groups need seating assignments
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Small Groups Status */}
        {smallGroupsEnabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-navy" />
                Small Groups Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Groups</span>
                    <p className="font-semibold">{stats?.smallGroups?.totalGroups || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Size</span>
                    <p className="font-semibold">{stats?.smallGroups?.avgSize || 0}</p>
                  </div>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Participants Assigned</span>
                    <span className="font-semibold text-green-600">
                      {stats?.smallGroups?.assigned || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">SGLs Assigned</span>
                    <span className="font-semibold">
                      {stats?.smallGroups?.sglsAssigned || 0} / {stats?.smallGroups?.totalGroups || 0}
                    </span>
                  </div>
                </div>

                {(stats?.smallGroups?.unassigned && stats.smallGroups.unassigned > 0) ||
                  (stats?.smallGroups?.sglsNeeded && stats.smallGroups.sglsNeeded > 0) ? (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      {stats?.smallGroups?.unassigned || 0} unassigned
                      {stats?.smallGroups?.sglsNeeded ? ` • ${stats.smallGroups.sglsNeeded} groups need SGLs` : ''}
                    </span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meal Groups Status */}
        {mealGroupsEnabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="w-5 h-5 text-navy" />
                Meal Groups Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Active Color Groups</span>
                  <span className="font-semibold">{stats?.mealGroups?.totalGroups || 0}</span>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Groups Assigned</span>
                    <span className="font-semibold text-green-600">
                      {stats?.mealGroups?.assigned || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Parish/Group Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by parish name, group ID, leader name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchTerm.length >= 2 && (
            <ScrollArea className="mt-4 max-h-[500px]">
              {searchResults.length === 0 && !searching ? (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    No groups found matching &quot;{searchTerm}&quot;
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-navy">{result.groupName}</h4>
                          {result.diocese && (
                            <p className="text-sm text-muted-foreground">{result.diocese}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {result.housingType && (
                            <Badge variant="outline" className="text-xs">
                              {result.housingType === 'on_campus' ? 'On-Campus' :
                               result.housingType === 'off_campus' ? 'Off-Campus' : 'Day Pass'}
                            </Badge>
                          )}
                          {result.mealColor && (
                            <Badge
                              className="text-xs text-white"
                              style={{
                                backgroundColor: getMealColorHex(result.mealColor)
                              }}
                            >
                              {result.mealColor}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span>{result.participantCount} participants</span>
                          <span className="text-blue-600">({result.maleCount}M</span>
                          <span className="text-pink-600">{result.femaleCount}F)</span>
                        </div>
                        {result.leaderName && (
                          <div className="text-muted-foreground">
                            Leader: {result.leaderName}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {result.leaderPhone && (
                          <a
                            href={`tel:${result.leaderPhone}`}
                            className="flex items-center gap-1 text-navy hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {result.leaderPhone}
                          </a>
                        )}
                        {result.leaderEmail && (
                          <a
                            href={`mailto:${result.leaderEmail}`}
                            className="flex items-center gap-1 text-navy hover:underline"
                          >
                            <Mail className="w-3 h-3" />
                            {result.leaderEmail}
                          </a>
                        )}
                      </div>

                      {/* Assignments Summary */}
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 text-xs">
                        {result.roomAssignments.length > 0 && (
                          <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                            <Home className="w-3 h-3" />
                            {result.roomAssignments.map((r, i) => (
                              <span key={i}>
                                {r.building} {r.room}
                                {i < result.roomAssignments.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {result.seating && (
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            <Grid3X3 className="w-3 h-3" />
                            {result.seating.section}
                          </div>
                        )}
                        {result.smallGroup && (
                          <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded">
                            <Users className="w-3 h-3" />
                            {result.smallGroup.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Type at least 2 characters to search...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Liability Platform Link */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start text-left border-2 border-navy hover:bg-navy/5"
              onClick={() => window.location.href = `/dashboard/admin/events/${eventId}/poros-liability`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-navy" />
                <span className="font-semibold text-navy">Liability Platform</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage liability forms & certificates
              </p>
            </Button>

            {housingEnabled && stats?.housing?.unassigned && stats.housing.unassigned > 0 && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start text-left border-2 border-navy hover:bg-navy/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-navy" />
                  <span className="font-semibold text-navy">Assign Housing</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Auto-assign {stats.housing.unassigned} participants to rooms
                </p>
              </Button>
            )}

            {smallGroupsEnabled && stats?.smallGroups?.totalGroups === 0 && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start text-left border-2 border-navy hover:bg-navy/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-navy" />
                  <span className="font-semibold text-navy">Create Small Groups</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Auto-generate balanced small groups
                </p>
              </Button>
            )}

            {settings?.publicPortalEnabled && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start text-left border-2 border-navy hover:bg-navy/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-navy" />
                  <span className="font-semibold text-navy">Publish Assignments</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Make assignments visible in public portal
                </p>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
