'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Wand2, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { toast } from '@/lib/toast'

interface Building {
  id: string
  name: string
  gender: 'male' | 'female' | 'mixed'
  housingType: 'youth_u18' | 'chaperone_18plus' | 'clergy' | 'general'
}

interface Room {
  id: string
  buildingId: string
  capacity: number
  currentOccupancy: number
  gender: string | null
  housingType: string | null
  isAvailable: boolean
}

interface Participant {
  id: string
  type: 'group' | 'individual'
  firstName: string
  lastName: string
  gender: string
  isMinor: boolean
  parishName?: string
  groupRegistrationId?: string
  roomAssignment?: any
  roommatePreference?: string
}

interface AutoAssignModalProps {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  buildings: Building[]
  rooms: Room[]
  participants: Participant[]
}

type AssignmentStrategy = 'fill_rooms' | 'balance_rooms' | 'parish_together'

export function AutoAssignModal({
  eventId,
  open,
  onOpenChange,
  onComplete,
  buildings,
  rooms,
  participants,
}: AutoAssignModalProps) {
  const [step, setStep] = useState<'config' | 'preview' | 'running' | 'complete'>('config')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ assigned: number; skipped: number; errors: string[] } | null>(null)

  // Configuration options
  const [strategy, setStrategy] = useState<AssignmentStrategy>('parish_together')
  const [respectRoommatePrefs, setRespectRoommatePrefs] = useState(true)
  const [onlyUnassigned, setOnlyUnassigned] = useState(true)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'youth' | 'chaperone'>('all')
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(buildings.map(b => b.id))

  // Calculate stats for preview
  const unassignedParticipants = participants.filter(p => !p.roomAssignment)
  const participantsToAssign = unassignedParticipants.filter(p => {
    if (genderFilter !== 'all' && p.gender?.toLowerCase() !== genderFilter) return false
    if (typeFilter === 'youth' && !p.isMinor) return false
    if (typeFilter === 'chaperone' && p.isMinor) return false
    return true
  })

  const availableBeds = rooms
    .filter(r => selectedBuildings.includes(r.buildingId) && r.isAvailable)
    .reduce((sum, r) => sum + (r.capacity - r.currentOccupancy), 0)

  const maleToAssign = participantsToAssign.filter(p => p.gender?.toLowerCase() === 'male').length
  const femaleToAssign = participantsToAssign.filter(p => p.gender?.toLowerCase() === 'female').length

  const maleRooms = rooms.filter(r =>
    selectedBuildings.includes(r.buildingId) &&
    r.isAvailable &&
    (r.gender === 'male' || !r.gender)
  )
  const femaleRooms = rooms.filter(r =>
    selectedBuildings.includes(r.buildingId) &&
    r.isAvailable &&
    (r.gender === 'female' || !r.gender)
  )

  const maleBeds = maleRooms.reduce((sum, r) => sum + (r.capacity - r.currentOccupancy), 0)
  const femaleBeds = femaleRooms.reduce((sum, r) => sum + (r.capacity - r.currentOccupancy), 0)

  function handleBuildingToggle(buildingId: string) {
    setSelectedBuildings(prev =>
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    )
  }

  async function runAutoAssign() {
    setStep('running')
    setLoading(true)
    setProgress(0)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          respectRoommatePrefs,
          onlyUnassigned,
          genderFilter,
          typeFilter,
          buildingIds: selectedBuildings,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Auto-assign failed')
      }

      // Simulate progress for UX (actual assignment happens on server)
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const data = await response.json()
      setResult(data)
      setStep('complete')
      toast.success(`Assigned ${data.assigned} participants`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Auto-assign failed')
      setStep('config')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (step === 'complete') {
      onComplete()
    }
    setStep('config')
    setResult(null)
    setProgress(0)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Auto-Assign Rooms
          </DialogTitle>
          <DialogDescription>
            Automatically assign participants to available rooms based on your criteria.
          </DialogDescription>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-6">
            {/* Strategy Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Assignment Strategy</Label>
              <RadioGroup
                value={strategy}
                onValueChange={(v) => setStrategy(v as AssignmentStrategy)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="parish_together" id="parish_together" />
                  <div>
                    <Label htmlFor="parish_together" className="font-medium cursor-pointer">
                      Keep Parishes Together
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Assign participants from the same parish to adjacent rooms
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="fill_rooms" id="fill_rooms" />
                  <div>
                    <Label htmlFor="fill_rooms" className="font-medium cursor-pointer">
                      Fill Rooms Completely
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Fill each room to capacity before moving to the next
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="balance_rooms" id="balance_rooms" />
                  <div>
                    <Label htmlFor="balance_rooms" className="font-medium cursor-pointer">
                      Balance Across Rooms
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Distribute participants evenly across available rooms
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Filters</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as 'all' | 'male' | 'female')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male Only</SelectItem>
                      <SelectItem value="female">Female Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'youth' | 'chaperone')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="youth">Youth Only</SelectItem>
                      <SelectItem value="chaperone">Chaperones Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Buildings Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Buildings to Use</Label>
              <div className="space-y-2">
                {buildings.map(building => (
                  <div key={building.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`building-${building.id}`}
                      checked={selectedBuildings.includes(building.id)}
                      onCheckedChange={() => handleBuildingToggle(building.id)}
                    />
                    <Label htmlFor={`building-${building.id}`} className="cursor-pointer">
                      {building.name}
                      <Badge
                        className="ml-2"
                        variant="outline"
                      >
                        {building.gender}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="respectRoommatePrefs"
                    checked={respectRoommatePrefs}
                    onCheckedChange={(checked) => setRespectRoommatePrefs(!!checked)}
                  />
                  <Label htmlFor="respectRoommatePrefs" className="cursor-pointer">
                    Try to honor roommate preferences
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onlyUnassigned"
                    checked={onlyUnassigned}
                    onCheckedChange={(checked) => setOnlyUnassigned(!!checked)}
                  />
                  <Label htmlFor="onlyUnassigned" className="cursor-pointer">
                    Only assign unassigned participants
                  </Label>
                </div>
              </div>
            </div>

            {/* Preview Stats */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="w-4 h-4" />
                Preview
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">To assign:</span>
                  <span className="ml-2 font-medium">{participantsToAssign.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Available beds:</span>
                  <span className="ml-2 font-medium">{availableBeds}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-blue-600">Male:</span>
                  <span className="ml-2">{maleToAssign} → {maleBeds} beds</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-pink-600">Female:</span>
                  <span className="ml-2">{femaleToAssign} → {femaleBeds} beds</span>
                </div>
              </div>
              {participantsToAssign.length > availableBeds && (
                <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  Not enough beds for all participants
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'running' && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-navy" />
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-muted-foreground">
              Assigning participants to rooms...
            </p>
          </div>
        )}

        {step === 'complete' && result && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">Auto-Assign Complete</h3>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {result.assigned} assigned
                </span>
                {result.skipped > 0 && (
                  <span className="text-muted-foreground">
                    {result.skipped} skipped
                  </span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg text-left">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  <ul className="text-sm text-red-600 mt-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'config' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={runAutoAssign}
                disabled={participantsToAssign.length === 0 || selectedBuildings.length === 0}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Run Auto-Assign
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
