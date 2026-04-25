'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Loader2,
  Printer,
  User,
  Users,
  Check,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { openBadgePrintWindow, type NameTagData, type BadgeTemplate } from '@/lib/badge-renderer'

interface ReprintBadgeModalProps {
  open: boolean
  onClose: () => void
  eventId: string
  eventName: string
  getAuthHeaders?: () => Promise<Record<string, string>>
}

const MEAL_COLORS = ['blue', 'red', 'orange', 'yellow', 'green', 'purple', 'brown', 'grey']
const MEAL_COLOR_HEX: Record<string, string> = {
  blue: '#3498db',
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#f1c40f',
  green: '#27ae60',
  purple: '#9b59b6',
  brown: '#8b4513',
  grey: '#95a5a6',
}

const SIZE_OPTIONS = [
  { value: 'thermal_4x12', label: 'Thermal 4×12"' },
  { value: 'badge_4x6', label: 'Standard 4×6"' },
  { value: 'standard', label: 'Standard (Letter)' },
  { value: 'business_card', label: 'Business Card' },
]

const DEFAULT_TEMPLATE: BadgeTemplate = {
  size: 'standard',
  showName: true,
  showGroup: true,
  showParticipantType: true,
  showHousing: true,
  showDiocese: false,
  showMealColor: false,
  showQrCode: true,
  showConferenceHeader: true,
  conferenceHeaderText: '',
  showLogo: false,
  logoUrl: '',
  showHeaderBanner: false,
  headerBannerUrl: '',
  backgroundColor: '#FFFFFF',
  textColor: '#1E3A5F',
  accentColor: '#9C8466',
  fontFamily: 'sans-serif',
  fontSize: 'medium',
  thermalMode: false,
  showBackPanel: true,
  backPanelColorMode: 'color',
}

export function ReprintBadgeModal({
  open,
  onClose,
  eventId,
  eventName,
  getAuthHeaders,
}: ReprintBadgeModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'walkup'>('search')

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [printing, setPrinting] = useState<string | null>(null)

  // Walk-up tab state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [participantType, setParticipantType] = useState('youth')
  const [customNote, setCustomNote] = useState('')
  const [mealColor, setMealColor] = useState('')
  const [showWalkUpIndicator, setShowWalkUpIndicator] = useState(true)
  const [walkUpPrinting, setWalkUpPrinting] = useState(false)

  // Shared
  const [sizeOverride, setSizeOverride] = useState('')
  const [savedTemplate, setSavedTemplate] = useState<BadgeTemplate | null>(null)
  const templateFetched = useRef(false)

  const authHeaders = useCallback(async () => {
    return getAuthHeaders ? await getAuthHeaders() : {}
  }, [getAuthHeaders])

  const fetchTemplate = useCallback(async (): Promise<BadgeTemplate> => {
    if (savedTemplate) return savedTemplate
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/events/${eventId}/salve/name-tag-template`, { headers })
      if (res.ok) {
        const data = await res.json()
        const t: BadgeTemplate = { ...DEFAULT_TEMPLATE, ...data.template }
        setSavedTemplate(t)
        setSizeOverride(prev => prev || t.size || 'standard')
        return t
      }
    } catch {}
    setSavedTemplate(DEFAULT_TEMPLATE)
    setSizeOverride(prev => prev || 'standard')
    return DEFAULT_TEMPLATE
  }, [savedTemplate, authHeaders, eventId])

  useEffect(() => {
    if (open && !templateFetched.current) {
      templateFetched.current = true
      fetchTemplate()
    }
    if (!open) {
      templateFetched.current = false
      setSavedTemplate(null)
      setSizeOverride('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch() {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchResults([])
    try {
      const headers = await authHeaders()
      const res = await fetch(
        `/api/admin/events/${eventId}/salve/participants?search=${encodeURIComponent(q)}`,
        { headers }
      )
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.participants || [])
      } else {
        toast.error('Search failed')
      }
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleReprintParticipant(participant: any) {
    setPrinting(participant.id)
    try {
      const template = await fetchTemplate()
      const effectiveTemplate: BadgeTemplate = {
        ...template,
        size: (sizeOverride || template.size) as BadgeTemplate['size'],
      }
      const headers = await authHeaders()
      const isIndividual = participant.registrationType === 'individual'
      const isStaff = participant.registrationType === 'staff'

      const res = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          participantIds: isIndividual || isStaff ? undefined : [participant.id],
          registrationId: isIndividual || isStaff ? participant.id : undefined,
          registrationType: isStaff ? 'staff' : isIndividual ? 'individual' : 'group',
          templateOverride: effectiveTemplate,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to generate badge')
      }

      const data = await res.json()
      openBadgePrintWindow(data.nameTags || [], effectiveTemplate, eventName, data.schedule ?? [])
      toast.success('Badge sent to printer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print badge')
    } finally {
      setPrinting(null)
    }
  }

  async function handleWalkUpPrint() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    setWalkUpPrinting(true)
    try {
      const template = await fetchTemplate()
      const effectiveTemplate: BadgeTemplate = {
        ...template,
        size: (sizeOverride || template.size) as BadgeTemplate['size'],
      }
      const mealColorObj = mealColor
        ? { name: mealColor, hex: MEAL_COLOR_HEX[mealColor] || '#6b7280' }
        : null

      const tagData: NameTagData = {
        participantId: 'walkup',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        groupName: groupName.trim() || 'Walk-Up',
        diocese: null,
        participantType,
        isChaperone: participantType === 'chaperone',
        isClergy: participantType === 'priest',
        housing: null,
        mealColor: mealColorObj,
        qrCode: null,
        walkUp: showWalkUpIndicator,
        customNote: customNote.trim() || null,
      }

      openBadgePrintWindow([tagData], effectiveTemplate, eventName, [])
      toast.success('Walk-up badge sent to printer')
    } catch {
      toast.error('Failed to print walk-up badge')
    } finally {
      setWalkUpPrinting(false)
    }
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      onClose()
      setSearchQuery('')
      setSearchResults([])
      setFirstName('')
      setLastName('')
      setGroupName('')
      setParticipantType('youth')
      setCustomNote('')
      setMealColor('')
      setShowWalkUpIndicator(true)
    }
  }

  const registrationTypeLabel = (type: string) => {
    if (type === 'individual') return 'Individual'
    if (type === 'staff') return 'Staff'
    return 'Group'
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5" />
            Reprint / Walk-Up Badge
          </DialogTitle>
        </DialogHeader>

        {/* Size override strip */}
        <div className="flex items-center gap-3 px-6 pb-3 border-b">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Size:</span>
          <div className="flex gap-1.5 flex-wrap">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSizeOverride(opt.value)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  sizeOverride === opt.value
                    ? 'bg-navy text-white border-navy'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {!sizeOverride && (
              <span className="text-xs text-muted-foreground self-center">
                (loading saved size…)
              </span>
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'search' | 'walkup')}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="mx-6 mt-3 grid grid-cols-2">
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Look Up Registered
            </TabsTrigger>
            <TabsTrigger value="walkup">
              <User className="w-4 h-4 mr-2" />
              Walk-Up / Manual
            </TabsTrigger>
          </TabsList>

          {/* ── SEARCH TAB ── */}
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 px-6 pt-3 pb-6 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by first or last name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg" style={{ minHeight: 200, maxHeight: 380 }}>
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">
                    {searchQuery.trim()
                      ? 'No participants found'
                      : 'Type a name and press Search'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {searchResults.map((p) => (
                    <div
                      key={`${p.registrationType}-${p.id}`}
                      className="flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {registrationTypeLabel(p.registrationType)}
                          </Badge>
                          {p.checkedIn ? (
                            <Badge className="bg-green-500 text-xs">
                              <Check className="w-3 h-3 mr-0.5" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-300 text-xs"
                            >
                              Not Checked In
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {p.groupName || p.parishName || '—'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleReprintParticipant(p)}
                        disabled={printing === p.id}
                        className="shrink-0"
                      >
                        {printing === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── WALK-UP TAB ── */}
          <TabsContent value="walkup" className="flex-1 px-6 pb-6 pt-3 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Group / Parish</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group or parish name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Participant Type</Label>
                <Select value={participantType} onValueChange={setParticipantType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youth">Youth</SelectItem>
                    <SelectItem value="chaperone">Chaperone</SelectItem>
                    <SelectItem value="priest">Clergy</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Meal Color</Label>
                <Select
                  value={mealColor || 'none'}
                  onValueChange={(v) => setMealColor(v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {MEAL_COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2 capitalize">
                          <span
                            className="w-3 h-3 rounded-full inline-block border border-gray-200"
                            style={{ backgroundColor: MEAL_COLOR_HEX[c] }}
                          />
                          {c}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Custom Note</Label>
                <Input
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Late arrival"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={showWalkUpIndicator}
                onCheckedChange={(c) => setShowWalkUpIndicator(!!c)}
              />
              <span className="text-sm">Show &ldquo;Walk-Up&rdquo; indicator on badge</span>
            </label>

            <Button
              onClick={handleWalkUpPrint}
              disabled={walkUpPrinting || !firstName.trim() || !lastName.trim()}
              className="w-full"
            >
              {walkUpPrinting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Print Walk-Up Badge
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
