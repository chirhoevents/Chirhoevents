'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PorosOverview } from '@/components/admin/poros/PorosOverview'
import { PorosHousing } from '@/components/admin/poros/PorosHousing'
import { PorosSeating } from '@/components/admin/poros/PorosSeating'
import { PorosSmallGroupsSimple } from '@/components/admin/poros/PorosSmallGroupsSimple'
import { PorosMealGroups } from '@/components/admin/poros/PorosMealGroups'
import { PorosStaff } from '@/components/admin/poros/PorosStaff'
import { PorosSettings } from '@/components/admin/poros/PorosSettings'
import { PorosADA } from '@/components/admin/poros/PorosADA'
import { PorosResources } from '@/components/admin/poros/PorosResources'
import { PorosConfessions } from '@/components/admin/poros/PorosConfessions'
import { PorosInfo } from '@/components/admin/poros/PorosInfo'
import { PorosAdoration } from '@/components/admin/poros/PorosAdoration'
import { GroupAllocations } from '@/components/admin/poros/GroupAllocations'
import { PorosImport } from '@/components/admin/poros/PorosImport'
import { PorosGroupNumbers } from '@/components/admin/poros/PorosGroupNumbers'
import { PorosPublicPortalCard } from '@/components/admin/poros/PorosPublicPortalCard'
import { PorosFeatureGate, PorosSectionIntro } from '@/components/admin/poros/PorosFeatureGate'
import { isPorosFeatureOn } from '@/components/admin/poros/poros-features'
import { isGroupDirectoryEvent } from '@/lib/poros-group-directory'
import { toast } from '@/lib/toast'
import {
  LayoutDashboard,
  Home,
  Users,
  Grid3X3,
  Utensils,
  UserCheck,
  Settings,
  Accessibility,
  Building2,
  Upload,
  Church,
  Info,
  Sun,
  Hash,
  BedDouble,
  CalendarDays,
  Globe,
  Megaphone,
  Link as LinkIcon,
} from 'lucide-react'

interface PorosPortalClientProps {
  eventId: string
  eventName: string
  settings: any
}

const SECTIONS = ['overview', 'rooms', 'meals', 'schedule', 'staff', 'group-numbers', 'import', 'settings'] as const
type Section = (typeof SECTIONS)[number]

/** Small pill-style sub-navigation used inside each work area. */
function SubTabs({
  value,
  onChange,
  items,
}: {
  value: string
  onChange: (v: string) => void
  items: { value: string; label: string; icon: ReactNode; off?: boolean }[]
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b pb-3">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              active
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-navy border-gray-200 hover:border-navy/40'
            }`}
          >
            {item.icon}
            {item.label}
            {item.off && (
              <span
                className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                Off
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function PorosPortalClient({
  eventId,
  eventName,
  settings: initialSettings,
}: PorosPortalClientProps) {
  const [settings, setSettings] = useState(initialSettings || {})
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<Section>('overview')
  const [roomsTab, setRoomsTab] = useState('housing')
  const [scheduleTab, setScheduleTab] = useState('portal')

  // Restore the section from the URL (?section=rooms) so links and refreshes keep your place.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('section') as Section | null
    if (s && SECTIONS.includes(s)) setSection(s)
    const sub = params.get('sub')
    if (sub && s === 'rooms') setRoomsTab(sub)
    if (sub && s === 'schedule') setScheduleTab(sub)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('section', section)
    if (section === 'rooms') params.set('sub', roomsTab)
    else if (section === 'schedule') params.set('sub', scheduleTab)
    else params.delete('sub')
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [section, roomsTab, scheduleTab])

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

  /** One place that flips any Poros feature on/off, used by every section. */
  async function toggleFeature(key: string, value: boolean) {
    const previous = settings
    setSettings({ ...settings, [key]: value })
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!response.ok) throw new Error('Failed to update setting')
      toast.success(value ? 'Turned on' : 'Turned off')
    } catch (error) {
      setSettings(previous)
      toast.error('Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const on = (key: string) => isPorosFeatureOn(settings, key)
  const gate = (key: string, children: ReactNode) => (
    <PorosFeatureGate featureKey={key} enabled={on(key)} saving={saving} onToggle={toggleFeature}>
      {children}
    </PorosFeatureGate>
  )
  const groupNumbersEnabled = isGroupDirectoryEvent(eventId)

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
          Rooms, meals, and the participant schedule portal for this event
        </p>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as Section)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <BedDouble className="w-4 h-4" />
            Rooms &amp; Housing
          </TabsTrigger>
          <TabsTrigger value="meals" className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            Meals
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Schedule &amp; Public Portal
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Staff
          </TabsTrigger>
          {groupNumbersEnabled && (
            <TabsTrigger value="group-numbers" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Group Numbers
            </TabsTrigger>
          )}
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
          <PorosOverview eventId={eventId} settings={settings} />
        </TabsContent>

        {/* ───────────── Rooms & Housing ───────────── */}
        <TabsContent value="rooms" className="space-y-6">
          <PorosSectionIntro
            title="Rooms & Housing"
            description="Everything that puts people into a physical space. Pick what you're working on below."
          >
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="font-medium text-navy flex items-center gap-2">
                  <Home className="w-4 h-4" /> Overnight Housing
                </p>
                <p className="text-muted-foreground">Where people <strong>sleep</strong>. You place groups or individuals into beds.</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium text-navy flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Room Blocks for Groups
                </p>
                <p className="text-muted-foreground">
                  Also sleeping rooms: you <strong>reserve</strong> rooms for a parish group, then their group leader fills the beds.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium text-navy flex items-center gap-2">
                  <Users className="w-4 h-4" /> Small Group Meeting Rooms
                </p>
                <p className="text-muted-foreground">Where groups <strong>meet</strong> during small group sessions, plus their SGLs.</p>
              </div>
            </div>
          </PorosSectionIntro>

          <SubTabs
            value={roomsTab}
            onChange={setRoomsTab}
            items={[
              { value: 'housing', label: 'Overnight Housing', icon: <Home className="w-4 h-4" />, off: !on('porosHousingEnabled') },
              { value: 'room-blocks', label: 'Room Blocks for Groups', icon: <Building2 className="w-4 h-4" />, off: !on('porosHousingEnabled') },
              { value: 'small-groups', label: 'Small Group Meeting Rooms', icon: <Users className="w-4 h-4" />, off: !on('porosSmallGroupEnabled') },
              { value: 'seating', label: 'Seating', icon: <Grid3X3 className="w-4 h-4" />, off: !on('porosSeatingEnabled') },
              { value: 'ada', label: 'ADA', icon: <Accessibility className="w-4 h-4" />, off: !on('porosAdaEnabled') },
            ]}
          />

          {roomsTab === 'housing' &&
            gate('porosHousingEnabled', <PorosHousing eventId={eventId} settings={settings} />)}
          {roomsTab === 'room-blocks' &&
            gate('porosHousingEnabled', <GroupAllocations eventId={eventId} />)}
          {roomsTab === 'small-groups' &&
            gate('porosSmallGroupEnabled', <PorosSmallGroupsSimple eventId={eventId} />)}
          {roomsTab === 'seating' && gate('porosSeatingEnabled', <PorosSeating eventId={eventId} />)}
          {roomsTab === 'ada' && gate('porosAdaEnabled', <PorosADA eventId={eventId} />)}
        </TabsContent>

        {/* ───────────── Meals ───────────── */}
        <TabsContent value="meals" className="space-y-6">
          <PorosSectionIntro
            title="Meals"
            description="Split groups into meal colors and set the breakfast, lunch, and dinner times for each color. Participants see their meal times on the public portal."
          />
          {gate('porosMealColorsEnabled', <PorosMealGroups eventId={eventId} />)}
        </TabsContent>

        {/* ───────────── Schedule & Public Portal ───────────── */}
        <TabsContent value="schedule" className="space-y-6">
          <PorosSectionIntro
            title="Schedule & Public Portal"
            description="Everything here shows up on the public resource portal participants open on their phones: the event schedule, confession and adoration times, announcements, and helpful links."
          />

          <SubTabs
            value={scheduleTab}
            onChange={setScheduleTab}
            items={[
              { value: 'portal', label: 'Portal Link', icon: <Globe className="w-4 h-4" />, off: !on('porosPublicPortalEnabled') },
              { value: 'schedule', label: 'Event Schedule', icon: <CalendarDays className="w-4 h-4" /> },
              { value: 'confessions', label: 'Confessions', icon: <Church className="w-4 h-4" />, off: !on('porosConfessionsEnabled') },
              { value: 'adoration', label: 'Adoration', icon: <Sun className="w-4 h-4" />, off: !on('porosAdorationEnabled') },
              { value: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
              { value: 'resources', label: 'Links & Documents', icon: <LinkIcon className="w-4 h-4" /> },
              { value: 'info', label: 'Info', icon: <Info className="w-4 h-4" />, off: !on('porosInfoEnabled') },
            ]}
          />

          {!on('porosPublicPortalEnabled') && scheduleTab !== 'portal' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-2">
              <span>
                The public portal is off, so participants can&apos;t see this yet. You can still set everything up ahead of time.
              </span>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setScheduleTab('portal')}
              >
                Go to Portal Link
              </button>
            </div>
          )}

          {scheduleTab === 'portal' && (
            <PorosPublicPortalCard eventId={eventId} settings={settings} saving={saving} onToggle={toggleFeature} />
          )}
          {scheduleTab === 'schedule' && <PorosResources eventId={eventId} sections={['schedule']} />}
          {scheduleTab === 'confessions' && gate('porosConfessionsEnabled', <PorosConfessions eventId={eventId} />)}
          {scheduleTab === 'adoration' && gate('porosAdorationEnabled', <PorosAdoration eventId={eventId} />)}
          {scheduleTab === 'announcements' && <PorosResources eventId={eventId} sections={['announcements']} />}
          {scheduleTab === 'resources' && <PorosResources eventId={eventId} sections={['resources']} />}
          {scheduleTab === 'info' && gate('porosInfoEnabled', <PorosInfo eventId={eventId} />)}
        </TabsContent>

        <TabsContent value="staff">
          <PorosStaff eventId={eventId} />
        </TabsContent>

        {groupNumbersEnabled && (
          <TabsContent value="group-numbers">
            <PorosGroupNumbers eventId={eventId} />
          </TabsContent>
        )}

        <TabsContent value="import">
          <PorosImport eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings">
          <PorosSettings
            eventId={eventId}
            settings={settings}
            saving={saving}
            onToggle={toggleFeature}
            onUpdate={refreshSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
