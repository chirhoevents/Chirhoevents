'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LayoutDashboard,
  Home,
  Users,
  Grid3X3,
  Utensils,
  UserCheck,
  Settings,
  Accessibility,
  FileText,
  Building2,
  Upload,
  Church,
  Info,
  Sun,
  Bed,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface PorosPortalClientProps {
  eventId: string
  eventName: string
  settings: {
    porosHousingEnabled?: boolean
    porosSeatingEnabled?: boolean
    porosSmallGroupEnabled?: boolean
    porosMealColorsEnabled?: boolean
    porosAdaEnabled?: boolean
    porosConfessionsEnabled?: boolean
    porosInfoEnabled?: boolean
    porosAdorationEnabled?: boolean
  }
}

export default function PorosPortalClient({
  eventId,
  eventName,
  settings,
}: PorosPortalClientProps) {
  const housingEnabled = settings.porosHousingEnabled ?? true
  const seatingEnabled = settings.porosSeatingEnabled ?? false
  const smallGroupsEnabled = settings.porosSmallGroupEnabled ?? false
  const mealGroupsEnabled = settings.porosMealColorsEnabled ?? false
  const adaEnabled = settings.porosAdaEnabled ?? false
  const confessionsEnabled = settings.porosConfessionsEnabled ?? false
  const infoEnabled = settings.porosInfoEnabled ?? false
  const adorationEnabled = settings.porosAdorationEnabled ?? false

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <span className="text-navy font-medium">Poros Portal</span>
        </div>
        <h1 className="text-3xl font-bold text-navy">Poros Portal</h1>
        <p className="text-muted-foreground">
          Housing, seating, small groups, and assignment management
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          {housingEnabled && (
            <TabsTrigger value="housing" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Housing
            </TabsTrigger>
          )}
          {housingEnabled && (
            <TabsTrigger value="group-allocations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Group Allocations
            </TabsTrigger>
          )}
          {seatingEnabled && (
            <TabsTrigger value="seating" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Seating
            </TabsTrigger>
          )}
          {smallGroupsEnabled && (
            <TabsTrigger value="small-groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Small Groups
            </TabsTrigger>
          )}
          {mealGroupsEnabled && (
            <TabsTrigger value="meal-groups" className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Meal Groups
            </TabsTrigger>
          )}
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Staff
          </TabsTrigger>
          {adaEnabled && (
            <TabsTrigger value="ada" className="flex items-center gap-2">
              <Accessibility className="w-4 h-4" />
              ADA
            </TabsTrigger>
          )}
          {confessionsEnabled && (
            <TabsTrigger value="confessions" className="flex items-center gap-2">
              <Church className="w-4 h-4" />
              Confessions
            </TabsTrigger>
          )}
          {infoEnabled && (
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Info
            </TabsTrigger>
          )}
          {adorationEnabled && (
            <TabsTrigger value="adoration" className="flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Adoration
            </TabsTrigger>
          )}
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <OverviewStat icon={Bed} label="Rooms" value="42" />
            <OverviewStat icon={Users} label="Housed" value="189 / 247" />
            <OverviewStat icon={Utensils} label="Meal groups" value="12" />
            <OverviewStat icon={UserCheck} label="Staff assigned" value="24" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Poros Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The Overview tab shows real-time stats: housing occupancy, meal
                group balance, small group assignments, staff coverage, and
                open ADA / confession slots. Click any stat to drill down into
                the corresponding tab.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="housing">
          <HousingTab />
        </TabsContent>

        <TabsContent value="group-allocations">
          <PlaceholderTab
            title="Group Allocations"
            description="Reserve blocks of rooms for specific groups (e.g., Diocese of Denver → Franciscan Hall floor 2). Balances requested vs. allocated capacity across groups."
          />
        </TabsContent>

        <TabsContent value="seating">
          <PlaceholderTab
            title="Seating"
            description="Assign participants to numbered seats in the main hall. Supports import from CSV, seat swapping via drag-and-drop, and printable seating charts."
          />
        </TabsContent>

        <TabsContent value="small-groups">
          <PlaceholderTab
            title="Small Groups"
            description="Break participants into small groups for breakout sessions. Balance by age, gender, and parish. Print roster cards for group leaders."
          />
        </TabsContent>

        <TabsContent value="meal-groups">
          <PlaceholderTab
            title="Meal Groups"
            description="Assign participants to meal rotations (color-coded). Tracks dietary restrictions per group so kitchen staff can prep accordingly."
          />
        </TabsContent>

        <TabsContent value="staff">
          <PlaceholderTab
            title="Staff"
            description="Manage on-site staff and volunteers. Assign roles (registration, security, hospitality), track schedules, print name badges and lanyards."
          />
        </TabsContent>

        <TabsContent value="ada">
          <PlaceholderTab
            title="ADA Accommodations"
            description="Track participants who requested accessibility accommodations. See specific needs (mobility, hearing, vision, dietary) with room-assignment recommendations."
          />
        </TabsContent>

        <TabsContent value="confessions">
          <PlaceholderTab
            title="Confessions"
            description="Schedule confession slots across the event. Assign priests to time windows, track how many participants have used each slot."
          />
        </TabsContent>

        <TabsContent value="info">
          <PlaceholderTab
            title="Info Board"
            description="Publish event announcements, schedule changes, and updates that participants can see in the mobile portal."
          />
        </TabsContent>

        <TabsContent value="adoration">
          <PlaceholderTab
            title="Adoration"
            description="Schedule Eucharistic adoration slots. Track sign-ups for prayer times, ensure continuous coverage."
          />
        </TabsContent>

        <TabsContent value="resources">
          <PlaceholderTab
            title="Resources"
            description="Upload PDF handouts, schedules, and event guides that get sent to participants and staff."
          />
        </TabsContent>

        <TabsContent value="import">
          <PlaceholderTab
            title="Import"
            description="Bulk-import housing assignments, small groups, meal groups, and staff from CSV. Preview and validate before committing."
          />
        </TabsContent>

        <TabsContent value="settings">
          <PlaceholderTab
            title="Poros Settings"
            description="Enable or disable specific Poros modules for this event (Housing, Seating, Small Groups, Meal Groups, ADA, Confessions, Info Board, Adoration)."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-navy/10 rounded-lg">
            <Icon className="h-5 w-5 text-navy" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-navy">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HousingTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OverviewStat icon={Home} label="Buildings" value="3" />
        <OverviewStat icon={Bed} label="Total rooms" value="42" />
        <OverviewStat icon={Users} label="Assigned" value="189" />
        <OverviewStat icon={MapPin} label="Unassigned" value="58" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Housing Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { building: 'Franciscan Hall', floors: 4, rooms: 24, occupancy: '86 / 96' },
              { building: 'Chaperone Wing', floors: 2, rooms: 12, occupancy: '18 / 24' },
              { building: 'Overflow Cottage', floors: 1, rooms: 6, occupancy: '4 / 24' },
            ].map((b) => (
              <div
                key={b.building}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-navy transition"
              >
                <div>
                  <div className="font-semibold text-navy">{b.building}</div>
                  <div className="text-sm text-muted-foreground">
                    {b.floors} floors · {b.rooms} rooms
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{b.occupancy}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Click a building in the real product to see a floor-by-floor room grid with drag-and-drop assignment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground mt-4">
          The full interactive UI for this tab is being built out. In the real
          product, this section is fully functional with drag-and-drop, filters,
          and bulk operations.
        </p>
      </CardContent>
    </Card>
  )
}
