'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { CustomBadge } from '@/lib/custom-badges'

// Everyone the Name Tag Designer can print a badge for, in one picker:
// parish groups, individual registrants, staff, vendors, and custom badges
// (speakers, guests…) that have no registration at all.

export interface PickerGroup {
  id: string
  groupName: string
  diocese: string | null
  participantCount: number
}

interface RosterEntry {
  id: string
  name: string
  detail: string | null
}

interface MealGroupOption {
  name: string
  hex: string
}

export interface BadgeSelection {
  groupIds: string[]
  individualIds: string[]
  staffIds: string[]
  vendorIds: string[]
  customBadges: CustomBadge[]
  badgeCount: number
}

type Source = 'groups' | 'individuals' | 'staff' | 'vendors' | 'custom'

interface BadgeSourcePickerProps {
  eventId: string
  groups: PickerGroup[]
  getAuthHeaders: () => Promise<Record<string, string>>
  onChange: (selection: BadgeSelection) => void
}

const NO_MEAL = '__none__'

function emptyBadge(): CustomBadge {
  return {
    id: '',
    firstName: '',
    lastName: '',
    label: 'Speaker',
    organization: '',
    housing: '',
    mealColorName: '',
    mealColorHex: '',
    note: '',
  }
}

export function BadgeSourcePicker({ eventId, groups, getAuthHeaders, onChange }: BadgeSourcePickerProps) {
  const [tab, setTab] = useState<Source>('groups')
  const [search, setSearch] = useState('')
  const [roster, setRoster] = useState<{ individuals: RosterEntry[]; staff: RosterEntry[]; vendors: RosterEntry[] }>({
    individuals: [],
    staff: [],
    vendors: [],
  })
  const [mealGroups, setMealGroups] = useState<MealGroupOption[]>([])
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([])
  const [selected, setSelected] = useState<Record<Source, Set<string>>>({
    groups: new Set(),
    individuals: new Set(),
    staff: new Set(),
    vendors: new Set(),
    custom: new Set(),
  })

  const [editing, setEditing] = useState<CustomBadge | null>(null)
  const [savingBadge, setSavingBadge] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const headers = await getAuthHeaders()
        const [rosterRes, customRes] = await Promise.all([
          fetch(`/api/admin/events/${eventId}/salve/badge-roster`, { headers }),
          fetch(`/api/admin/events/${eventId}/salve/custom-badges`, { headers }),
        ])
        if (cancelled) return
        if (rosterRes.ok) {
          const data = await rosterRes.json()
          setRoster({ individuals: data.individuals, staff: data.staff, vendors: data.vendors })
          setMealGroups(data.mealGroups)
        }
        if (customRes.ok) {
          const data = await customRes.json()
          setCustomBadges(data.badges)
        }
      } catch (error) {
        console.error('Failed to load badge roster:', error)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [eventId, getAuthHeaders])

  // Report the selection up whenever it (or the lists behind it) changes
  useEffect(() => {
    const groupIds = groups.filter((g) => selected.groups.has(g.id)).map((g) => g.id)
    const pickedCustom = customBadges.filter((b) => selected.custom.has(b.id))
    const groupBadges = groups
      .filter((g) => selected.groups.has(g.id))
      .reduce((sum, g) => sum + g.participantCount, 0)
    onChange({
      groupIds,
      individualIds: roster.individuals.filter((r) => selected.individuals.has(r.id)).map((r) => r.id),
      staffIds: roster.staff.filter((r) => selected.staff.has(r.id)).map((r) => r.id),
      vendorIds: roster.vendors.filter((r) => selected.vendors.has(r.id)).map((r) => r.id),
      customBadges: pickedCustom,
      badgeCount:
        groupBadges +
        selected.individuals.size +
        selected.staff.size +
        selected.vendors.size +
        pickedCustom.length,
    })
  }, [selected, groups, roster, customBadges, onChange])

  const entriesFor = (source: Source): RosterEntry[] => {
    switch (source) {
      case 'groups':
        return groups.map((g) => ({ id: g.id, name: g.groupName, detail: g.diocese }))
      case 'custom':
        return customBadges.map((b) => ({
          id: b.id,
          name: `${b.firstName} ${b.lastName}`.trim(),
          detail: [b.label, b.organization].filter(Boolean).join(' · ') || null,
        }))
      default:
        return roster[source]
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const entries = entriesFor(tab)
    if (!q) return entries
    return entries.filter((e) => e.name.toLowerCase().includes(q) || e.detail?.toLowerCase().includes(q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, groups, roster, customBadges])

  function toggle(source: Source, id: string) {
    setSelected((prev) => {
      const next = new Set(prev[source])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [source]: next }
    })
  }

  function setAllVisible(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev[tab])
      for (const e of visible) {
        if (on) next.add(e.id)
        else next.delete(e.id)
      }
      return { ...prev, [tab]: next }
    })
  }

  async function saveCustomBadges(next: CustomBadge[]): Promise<boolean> {
    setSavingBadge(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/events/${eventId}/salve/custom-badges`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ badges: next }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      setCustomBadges(data.badges)
      return true
    } catch {
      toast.error('Failed to save custom badges')
      return false
    } finally {
      setSavingBadge(false)
    }
  }

  async function handleSaveBadge() {
    if (!editing) return
    if (!editing.firstName.trim() && !editing.lastName.trim()) {
      toast.error('Enter a name')
      return
    }
    const isNew = !editing.id
    const badge = isNew ? { ...editing, id: crypto.randomUUID() } : editing
    const next = isNew
      ? [...customBadges, badge]
      : customBadges.map((b) => (b.id === badge.id ? badge : b))
    if (await saveCustomBadges(next)) {
      // A newly added badge is almost always meant to be printed
      if (isNew) toggle('custom', badge.id)
      setEditing(null)
    }
  }

  async function handleDeleteBadge(id: string) {
    const badge = customBadges.find((b) => b.id === id)
    if (!badge || !confirm(`Delete the badge for ${badge.firstName} ${badge.lastName}?`)) return
    if (await saveCustomBadges(customBadges.filter((b) => b.id !== id))) {
      setSelected((prev) => {
        const next = new Set(prev.custom)
        next.delete(id)
        return { ...prev, custom: next }
      })
    }
  }

  const tabLabel = (source: Source, label: string) => {
    const count = selected[source].size
    return count > 0 ? `${label} (${count})` : label
  }

  return (
    <div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as Source)
          setSearch('')
        }}
      >
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="groups" className="text-xs px-1">{tabLabel('groups', 'Groups')}</TabsTrigger>
          <TabsTrigger value="individuals" className="text-xs px-1">{tabLabel('individuals', 'Indiv.')}</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs px-1">{tabLabel('staff', 'Staff')}</TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs px-1">{tabLabel('vendors', 'Vendors')}</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs px-1">{tabLabel('custom', 'Custom')}</TabsTrigger>
        </TabsList>

        {(['groups', 'individuals', 'staff', 'vendors', 'custom'] as Source[]).map((source) => (
          <TabsContent key={source} value={source} className="mt-3">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={() => setAllVisible(true)}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAllVisible(false)}>
                Deselect All
              </Button>
              {source === 'custom' && (
                <Button size="sm" onClick={() => setEditing(emptyBadge())}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Badge
                </Button>
              )}
            </div>

            {source === 'custom' && (
              <p className="text-xs text-muted-foreground mb-2">
                For people who aren&apos;t registered &mdash; speakers, guests, musicians. Saved for this event.
              </p>
            )}

            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-2">
                {visible.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {search ? 'No matches' : source === 'custom' ? 'No custom badges yet' : 'Nobody here yet'}
                  </p>
                )}
                {visible.map((entry) => {
                  const isSelected = selected[source].has(entry.id)
                  const group = source === 'groups' ? groups.find((g) => g.id === entry.id) : null
                  return (
                    <label
                      key={entry.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'bg-navy/5 border-navy' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggle(source, entry.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{entry.name}</div>
                        {entry.detail && (
                          <div className="text-xs text-muted-foreground truncate">{entry.detail}</div>
                        )}
                      </div>
                      {group && <Badge variant="secondary">{group.participantCount}</Badge>}
                      {source === 'custom' && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.preventDefault()
                              const badge = customBadges.find((b) => b.id === entry.id)
                              if (badge) setEditing({ ...badge })
                            }}
                            aria-label="Edit badge"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={(e) => {
                              e.preventDefault()
                              handleDeleteBadge(entry.id)
                            }}
                            aria-label="Delete badge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Custom Badge' : 'Add Custom Badge'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cb-first">First name</Label>
                  <Input
                    id="cb-first"
                    value={editing.firstName}
                    onChange={(e) => setEditing({ ...editing, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cb-last">Last name</Label>
                  <Input
                    id="cb-last"
                    value={editing.lastName}
                    onChange={(e) => setEditing({ ...editing, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cb-label">Badge label</Label>
                <Input
                  id="cb-label"
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Speaker, Guest, Musician..."
                />
                <p className="text-xs text-muted-foreground mt-1">Prints in the colored tag where others say Youth / Chaperone.</p>
              </div>
              <div>
                <Label htmlFor="cb-org">Organization / title</Label>
                <Input
                  id="cb-org"
                  value={editing.organization}
                  onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
                  placeholder="Prints on the group / parish line"
                />
              </div>
              <div>
                <Label htmlFor="cb-housing">Housing (optional)</Label>
                <Input
                  id="cb-housing"
                  value={editing.housing}
                  onChange={(e) => setEditing({ ...editing, housing: e.target.value })}
                  placeholder="e.g. Guest House 2"
                />
              </div>
              <div>
                <Label>Meal color (optional)</Label>
                <Select
                  value={editing.mealColorName || NO_MEAL}
                  onValueChange={(v) => {
                    const meal = mealGroups.find((m) => m.name === v)
                    setEditing({
                      ...editing,
                      mealColorName: meal?.name ?? '',
                      mealColorHex: meal?.hex ?? '',
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MEAL}>None</SelectItem>
                    {mealGroups.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: m.hex }} />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cb-note">Note (optional)</Label>
                <Input
                  id="cb-note"
                  value={editing.note}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  placeholder="Small italic line, e.g. Saturday keynote"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingBadge}>
              Cancel
            </Button>
            <Button onClick={handleSaveBadge} disabled={savingBadge}>
              {savingBadge && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
