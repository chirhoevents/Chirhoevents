'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Home,
  Users,
  Grid3X3,
  Utensils,
  Loader2,
  User,
  MapPin,
  Clock,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react'

interface ResourcePortalClientProps {
  eventId: string
  eventName: string
  organizationName: string
  settings: {
    showRoommateNames: boolean
    showSmallGroupMembers: boolean
    showSglContact: boolean
  }
}

interface AssignmentData {
  publishedAt?: string
  participant: {
    firstName: string
    lastName: string
    gender: string
    parishName?: string
  }
  housing?: {
    buildingName: string
    roomNumber: string
    floor: number
    roommates: { firstName: string; lastName: string }[]
  }
  smallGroup?: {
    name: string
    groupNumber: number | null
    meetingTime: string | null
    meetingPlace: string | null
    sgl?: { firstName: string; lastName: string; email?: string; phone?: string }
    members: { firstName: string; lastName: string }[]
  }
  seating?: {
    sectionName: string
    sectionCode: string | null
    color: string
    locationDescription: string | null
  }
  mealGroup?: {
    name: string
    color: string
    colorHex: string
    breakfastTime: string | null
    lunchTime: string | null
    dinnerTime: string | null
  }
}

export default function ResourcePortalClient({
  eventId,
  eventName,
  organizationName,
  settings,
}: ResourcePortalClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AssignmentData | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setData(null)
    setSearched(true)

    try {
      const response = await fetch(
        `/api/events/${eventId}/resources/lookup?q=${encodeURIComponent(searchQuery)}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          setError('No participant found with that name. Please check your spelling and try again.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError('Failed to search. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/5 to-white">
      {/* Header */}
      <div className="bg-navy text-white py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-white/80 text-sm mb-2">{organizationName}</p>
          <h1 className="text-3xl font-bold mb-2">{eventName}</h1>
          <p className="text-white/80">Resource Portal</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Your Assignments
            </CardTitle>
            <CardDescription>
              Enter your first and last name to look up your housing, small group, and other assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">
                  Your Name
                </Label>
                <Input
                  id="search"
                  placeholder="Enter your first and last name (e.g., John Smith)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-2">Search</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Participant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {data.participant.firstName} {data.participant.lastName}
                </CardTitle>
                {data.participant.parishName && (
                  <CardDescription>{data.participant.parishName}</CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Housing */}
            {data.housing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Home className="w-5 h-5 text-blue-600" />
                    Housing Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Building</p>
                      <p className="font-medium">{data.housing.buildingName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Room</p>
                      <p className="font-medium">{data.housing.roomNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Floor</p>
                      <p className="font-medium">{data.housing.floor}</p>
                    </div>
                  </div>
                  {settings.showRoommateNames && data.housing.roommates.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Roommates</p>
                        <div className="flex flex-wrap gap-2">
                          {data.housing.roommates.map((rm, i) => (
                            <Badge key={i} variant="outline">
                              {rm.firstName} {rm.lastName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Small Group */}
            {data.smallGroup && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-green-600" />
                    Small Group
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg">{data.smallGroup.name}</span>
                    {data.smallGroup.groupNumber && (
                      <Badge>#{data.smallGroup.groupNumber}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {data.smallGroup.meetingTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{data.smallGroup.meetingTime}</span>
                      </div>
                    )}
                    {data.smallGroup.meetingPlace && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{data.smallGroup.meetingPlace}</span>
                      </div>
                    )}
                  </div>
                  {data.smallGroup.sgl && settings.showSglContact && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Small Group Leader</p>
                        <p className="font-medium">
                          {data.smallGroup.sgl.firstName} {data.smallGroup.sgl.lastName}
                        </p>
                        {data.smallGroup.sgl.email && (
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <a
                              href={`mailto:${data.smallGroup.sgl.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {data.smallGroup.sgl.email}
                            </a>
                          </div>
                        )}
                        {data.smallGroup.sgl.phone && (
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <a
                              href={`tel:${data.smallGroup.sgl.phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {data.smallGroup.sgl.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {settings.showSmallGroupMembers && data.smallGroup.members.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Group Members</p>
                        <div className="flex flex-wrap gap-2">
                          {data.smallGroup.members.map((m, i) => (
                            <Badge key={i} variant="outline">
                              {m.firstName} {m.lastName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Seating */}
            {data.seating && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Grid3X3 className="w-5 h-5 text-purple-600" />
                    Seating Section
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: data.seating.color }}
                    />
                    <div>
                      <p className="font-medium text-lg">
                        {data.seating.sectionName}
                        {data.seating.sectionCode && ` (${data.seating.sectionCode})`}
                      </p>
                      {data.seating.locationDescription && (
                        <p className="text-sm text-muted-foreground">
                          {data.seating.locationDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meal Group */}
            {data.mealGroup && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Utensils className="w-5 h-5 text-orange-600" />
                    Meal Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: data.mealGroup.colorHex }}
                    />
                    <span className="font-medium text-lg">{data.mealGroup.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {data.mealGroup.breakfastTime && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Breakfast</p>
                        <p className="font-medium">{data.mealGroup.breakfastTime}</p>
                      </div>
                    )}
                    {data.mealGroup.lunchTime && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Lunch</p>
                        <p className="font-medium">{data.mealGroup.lunchTime}</p>
                      </div>
                    )}
                    {data.mealGroup.dinnerTime && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Dinner</p>
                        <p className="font-medium">{data.mealGroup.dinnerTime}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Assignments */}
            {!data.housing && !data.smallGroup && !data.seating && !data.mealGroup && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>No assignments found for this participant yet.</p>
                  <p className="text-sm mt-2">
                    Assignments may not have been made yet. Please check back later.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty Search State */}
        {searched && !loading && !data && !error && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>Enter your name above to find your assignments.</p>
            </CardContent>
          </Card>
        )}

        {/* Last Updated Footer */}
        {data?.publishedAt && (
          <div className="text-center text-xs text-muted-foreground pt-6 mt-8 border-t">
            <p>
              Assignments last updated:{' '}
              {new Date(data.publishedAt).toLocaleString('en-US', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
            <p className="mt-1">
              Check back regularly - assignments may be updated closer to the event
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
