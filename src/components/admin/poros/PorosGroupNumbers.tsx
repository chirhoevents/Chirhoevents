'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Hash, Save, Undo2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { GROUP_NUMBER_MAX_LENGTH } from '@/lib/poros-group-directory'

interface PorosGroupNumbersProps {
  eventId: string
}

interface GroupRow {
  id: string
  groupName: string
  parishName: string | null
  groupLeaderName: string
  groupCode: string | null
  totalParticipants: number
}

type SortKey = 'name' | 'number'

// Natural sort so "2" < "10" and "53A" < "53B"
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function PorosGroupNumbers({ eventId }: PorosGroupNumbersProps) {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/poros/group-numbers`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroups(data.groups || [])
      setDrafts({})
    } catch {
      toast.error('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  function currentNumber(g: GroupRow): string {
    return drafts[g.id] ?? g.groupCode ?? ''
  }

  const changed = useMemo(
    () => groups.filter(g => drafts[g.id] !== undefined && drafts[g.id].trim() !== (g.groupCode ?? '')),
    [groups, drafts]
  )

  // How many groups share each number (case-insensitive), to flag combined groups
  const numberCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const g of groups) {
      const n = currentNumber(g).trim().toLowerCase()
      if (n) counts[n] = (counts[n] || 0) + 1
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, drafts])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = term
      ? groups.filter(g =>
          g.groupName.toLowerCase().includes(term) ||
          (g.parishName || '').toLowerCase().includes(term) ||
          g.groupLeaderName.toLowerCase().includes(term) ||
          currentNumber(g).toLowerCase().includes(term)
        )
      : groups
    return [...list].sort((a, b) => {
      if (sortKey === 'number') {
        const an = currentNumber(a).trim()
        const bn = currentNumber(b).trim()
        if (an && !bn) return -1
        if (!an && bn) return 1
        const byNumber = collator.compare(an, bn)
        if (byNumber !== 0) return byNumber
      }
      return collator.compare(a.groupName, b.groupName)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, drafts, search, sortKey])

  const numbered = groups.filter(g => currentNumber(g).trim()).length

  async function save() {
    if (changed.length === 0) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/poros/group-numbers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: changed.map(g => ({ groupId: g.id, groupNumber: drafts[g.id].trim() })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to save')
      toast.success(`Saved ${changed.length} group number${changed.length === 1 ? '' : 's'}`)
      setGroups(prev =>
        prev.map(g =>
          drafts[g.id] !== undefined ? { ...g, groupCode: drafts[g.id].trim() || null } : g
        )
      )
      setDrafts({})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Group Numbers
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Give each group a number for the public portal. People can search for it there.
              To combine two groups, give both the same number (for example &quot;53&quot;), or use
              letters (&quot;53A&quot;, &quot;53B&quot;). Searching &quot;53&quot; finds both either way.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {changed.length > 0 && (
              <Button variant="outline" onClick={() => setDrafts({})} disabled={saving}>
                <Undo2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
            )}
            <Button onClick={save} disabled={saving || changed.length === 0}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save{changed.length > 0 ? ` ${changed.length} change${changed.length === 1 ? '' : 's'}` : ''}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search group, parish, leader or number..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground mr-1">Sort:</span>
            <Button size="sm" variant={sortKey === 'name' ? 'default' : 'outline'} onClick={() => setSortKey('name')}>
              Name
            </Button>
            <Button size="sm" variant={sortKey === 'number' ? 'default' : 'outline'} onClick={() => setSortKey('number')}>
              Number
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {numbered} of {groups.length} numbered
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No group registrations yet.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {visible.map(g => {
              const value = currentNumber(g)
              const shared = value.trim() ? numberCounts[value.trim().toLowerCase()] || 0 : 0
              const isChanged = drafts[g.id] !== undefined && drafts[g.id].trim() !== (g.groupCode ?? '')
              return (
                <div key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="w-28 flex-shrink-0">
                    <Input
                      value={value}
                      maxLength={GROUP_NUMBER_MAX_LENGTH}
                      onChange={e => setDrafts(prev => ({ ...prev, [g.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') save()
                      }}
                      placeholder="#"
                      aria-label={`Group number for ${g.groupName}`}
                      className={`font-semibold text-center ${isChanged ? 'border-amber-500 bg-amber-50' : ''}`}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{g.groupName}</div>
                    <div className="text-sm text-muted-foreground">
                      {[g.parishName && g.parishName !== g.groupName ? g.parishName : null, g.groupLeaderName]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shared > 1 && (
                      <Badge variant="secondary" title="These groups share a number and show together on the portal">
                        Combined ×{shared}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground w-20 text-right">
                      {g.totalParticipants} people
                    </span>
                  </div>
                </div>
              )
            })}
            {visible.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No groups match your search.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
