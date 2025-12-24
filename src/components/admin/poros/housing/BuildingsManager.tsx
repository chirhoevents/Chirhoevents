'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Building } from '../PorosHousing'
import { Plus, MoreHorizontal, Pencil, Trash2, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BuildingsManagerProps {
  eventId: string
  buildings: Building[]
  onRefresh: () => void
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', color: 'bg-blue-100 text-blue-800' },
  { value: 'female', label: 'Female', color: 'bg-pink-100 text-pink-800' },
  { value: 'mixed', label: 'Mixed', color: 'bg-purple-100 text-purple-800' },
]

const HOUSING_TYPE_OPTIONS = [
  { value: 'youth_u18', label: 'Youth (Under 18)' },
  { value: 'chaperone_18plus', label: 'Chaperone (18+)' },
  { value: 'clergy', label: 'Clergy' },
  { value: 'general', label: 'General' },
]

export function BuildingsManager({ eventId, buildings, onRefresh }: BuildingsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    gender: 'male' as 'male' | 'female' | 'mixed',
    housingType: 'youth_u18' as 'youth_u18' | 'chaperone_18plus' | 'clergy' | 'general',
    totalFloors: 1,
    notes: '',
  })

  function openCreateDialog() {
    setEditingBuilding(null)
    setFormData({
      name: '',
      gender: 'male',
      housingType: 'youth_u18',
      totalFloors: 1,
      notes: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(building: Building) {
    setEditingBuilding(building)
    setFormData({
      name: building.name,
      gender: building.gender,
      housingType: building.housingType,
      totalFloors: building.totalFloors,
      notes: building.notes || '',
    })
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingBuilding
        ? `/api/admin/events/${eventId}/poros/buildings/${editingBuilding.id}`
        : `/api/admin/events/${eventId}/poros/buildings`

      const response = await fetch(url, {
        method: editingBuilding ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save building')
      }

      toast.success(editingBuilding ? 'Building updated' : 'Building created')
      setIsDialogOpen(false)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save building')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(buildingId: string) {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/buildings/${buildingId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete building')
      }

      toast.success('Building deleted')
      setDeleteConfirmId(null)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete building')
    } finally {
      setLoading(false)
    }
  }

  function getGenderBadge(gender: string) {
    const option = GENDER_OPTIONS.find(g => g.value === gender)
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : null
  }

  function getHousingTypeLabel(type: string) {
    const option = HOUSING_TYPE_OPTIONS.find(h => h.value === type)
    return option?.label || type
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Buildings
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage housing buildings for this event
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Building
        </Button>
      </CardHeader>
      <CardContent>
        {buildings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No buildings created yet</p>
            <p className="text-sm">Add buildings to start managing housing</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Housing Type</TableHead>
                <TableHead className="text-center">Floors</TableHead>
                <TableHead className="text-center">Rooms</TableHead>
                <TableHead className="text-center">Beds</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">{building.name}</TableCell>
                  <TableCell>{getGenderBadge(building.gender)}</TableCell>
                  <TableCell>{getHousingTypeLabel(building.housingType)}</TableCell>
                  <TableCell className="text-center">{building.totalFloors}</TableCell>
                  <TableCell className="text-center">{building.totalRooms}</TableCell>
                  <TableCell className="text-center">{building.totalBeds}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(building)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteConfirmId(building.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBuilding ? 'Edit Building' : 'Add Building'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Building Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Dorm A, Main Hall"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: 'male' | 'female' | 'mixed') =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="housingType">Housing Type</Label>
                  <Select
                    value={formData.housingType}
                    onValueChange={(value: 'youth_u18' | 'chaperone_18plus' | 'clergy' | 'general') =>
                      setFormData({ ...formData, housingType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUSING_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalFloors">Number of Floors</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  min="1"
                  value={formData.totalFloors}
                  onChange={(e) =>
                    setFormData({ ...formData, totalFloors: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this building"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBuilding ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Building</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete this building? This will also delete all rooms
              and assignments within this building. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
