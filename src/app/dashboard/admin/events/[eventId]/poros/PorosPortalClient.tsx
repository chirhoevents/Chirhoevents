'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PorosOverview } from '@/components/admin/poros/PorosOverview'
import { PorosHousing } from '@/components/admin/poros/PorosHousing'
import { PorosSeating } from '@/components/admin/poros/PorosSeating'
import { PorosSmallGroups } from '@/components/admin/poros/PorosSmallGroups'
import { PorosMealGroups } from '@/components/admin/poros/PorosMealGroups'
import { PorosStaff } from '@/components/admin/poros/PorosStaff'
import { PorosSettings } from '@/components/admin/poros/PorosSettings'
import { PorosADA } from '@/components/admin/poros/PorosADA'
import { PorosResources } from '@/components/admin/poros/PorosResources'
import { GroupAllocations } from '@/components/admin/poros/GroupAllocations'
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
  Building2
} from 'lucide-react'

interface PorosPortalClientProps {
  eventId: string
  eventName: string
  settings: any
}

export default function PorosPortalClient({
  eventId,
  eventName,
  settings: initialSettings
}: PorosPortalClientProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [loading, setLoading] = useState(false)

  async function refreshSettings() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error)
    }
  }

  const housingEnabled = settings?.porosHousingEnabled ?? true
  const seatingEnabled = settings?.porosSeatingEnabled ?? false
  const smallGroupsEnabled = settings?.porosSmallGroupEnabled ?? false
  const mealGroupsEnabled = settings?.porosMealColorsEnabled ?? false
  const adaEnabled = settings?.porosAdaEnabled ?? false

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <a href="/dashboard/admin" className="hover:text-navy">Dashboard</a>
          <span>/</span>
          <a href="/dashboard/admin/events" className="hover:text-navy">Events</a>
          <span>/</span>
          <a href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</a>
          <span>/</span>
          <span className="text-navy font-medium">Poros Portal</span>
        </div>
        <h1 className="text-3xl font-bold text-navy">Poros Portal</h1>
        <p className="text-muted-foreground">
          Housing, seating, small groups, and assignment management
        </p>
      </div>

      {/* Tabs */}
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

          <TabsTrigger value="resources" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Resources
          </TabsTrigger>

          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PorosOverview eventId={eventId} settings={settings} />
        </TabsContent>

        {housingEnabled && (
          <TabsContent value="housing">
            <PorosHousing eventId={eventId} settings={settings} />
          </TabsContent>
        )}

        {housingEnabled && (
          <TabsContent value="group-allocations">
            <GroupAllocations eventId={eventId} />
          </TabsContent>
        )}

        {seatingEnabled && (
          <TabsContent value="seating">
            <PorosSeating eventId={eventId} />
          </TabsContent>
        )}

        {smallGroupsEnabled && (
          <TabsContent value="small-groups">
            <PorosSmallGroups eventId={eventId} />
          </TabsContent>
        )}

        {mealGroupsEnabled && (
          <TabsContent value="meal-groups">
            <PorosMealGroups eventId={eventId} />
          </TabsContent>
        )}

        <TabsContent value="staff">
          <PorosStaff eventId={eventId} />
        </TabsContent>

        {adaEnabled && (
          <TabsContent value="ada">
            <PorosADA eventId={eventId} />
          </TabsContent>
        )}

        <TabsContent value="resources">
          <PorosResources eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings">
          <PorosSettings
            eventId={eventId}
            settings={settings}
            onUpdate={refreshSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
