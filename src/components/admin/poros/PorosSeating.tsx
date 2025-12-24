'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Grid3X3,
  Loader2,
  Users,
  Search,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { toast } from 'sonner'

interface PorosSeatingProps {
  eventId: string
}

interface SeatingSection {
  id: string
  eventId: string
  name: string
  sectionCode: string | null
  color: string
  capacity: number
  currentOccupancy: number
  locationDescription: string | null
  publicVisible: boolean
  displayOrder: number
}

interface Registration {
  id: string
  type: 'group' | 'individual'
  name: string
  participantCount?: number
  seatingAssignment?: {
    sectionId: string
    sectionName: string
  } | null
}

const DEFAULT_COLORS = [
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Yellow', hex: '#CA8A04' },
  { name: 'Teal', hex: '#0D9488' },
]

export function PorosSeating({ eventId }: PorosSeatingProps) {
  const [sections, setSections] = useState<SeatingSection[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sections' | 'assignments'>('assignments')

  // Section dialog
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<SeatingSection | null>(null)
  const [sectionForm, setSectionForm] = useState({
    name: '',
    sectionCode: '',
    color: '#1E3A5F',
    capacity: 100,
    locationDescription: '',
    publicVisible: true,
  })
  const [sectionLoading, setSectionLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Assignment state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [sectionsRes, registrationsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/seating-sections`),
        fetch(`/api/admin/events/${eventId}/poros/seating-registrations`),
      ])

      if (sectionsRes.ok) {
        setSections(await sectionsRes.json())
      }
      if (registrationsRes.ok) {
        setRegistrations(await registrationsRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch seating data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateSectionDialog() {
    setEditingSection(null)
    setSectionForm({
      name: '',
      sectionCode: '',
      color: '#1E3A5F',
      capacity: 100,
      locationDescription: '',
      publicVisible: true,
    })
    setIsSectionDialogOpen(true)
  }

  function openEditSectionDialog(section: SeatingSection) {
    setEditingSection(section)
    setSectionForm({
      name: section.name,
      sectionCode: section.sectionCode || '',
      color: section.color,
      capacity: section.capacity,
      locationDescription: section.locationDescription || '',
      publicVisible: section.publicVisible,
    })
    setIsSectionDialogOpen(true)
  }

  async function handleSectionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSectionLoading(true)

    try {
      const url = editingSection
        ? `/api/admin/events/${eventId}/poros/seating-sections/${editingSection.id}`
        : `/api/admin/events/${eventId}/poros/seating-sections`

      const response = await fetch(url, {
        method: editingSection ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save section')
      }

      toast.success(editingSection ? 'Section updated' : 'Section created')
      setIsSectionDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save section')
    } finally {
      setSectionLoading(false)
    }
  }

  async function handleDeleteSection(sectionId: string) {
    setSectionLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/seating-sections/${sectionId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete section')
      }

      toast.success('Section deleted')
      setDeleteConfirmId(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete section')
    } finally {
      setSectionLoading(false)
    }
  }

  async function handleAssign(registrationId: string, sectionId: string) {
    setAssignLoading(true)
    try {
      const registration = registrations.find(r => r.id === registrationId)
      const response = await fetch(`/api/admin/events/${eventId}/poros/seating-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          groupRegistrationId: registration?.type === 'group' ? registrationId : null,
          individualRegistrationId: registration?.type === 'individual' ? registrationId : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign section')
      }

      toast.success('Seating section assigned')
      setIsAssignDialogOpen(false)
      setSelectedRegistration(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign section')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleUnassign(registrationId: string) {
    try {
      const registration = registrations.find(r => r.id === registrationId)
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/seating-assignments/${registrationId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: registration?.type }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove assignment')
      }

      toast.success('Seating assignment removed')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment')
    }
  }

  // Filter registrations
  const filteredRegistrations = registrations.filter(r => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!r.name.toLowerCase().includes(query)) return false
    }
    if (statusFilter === 'assigned' && !r.seatingAssignment) return false
    if (statusFilter === 'unassigned' && r.seatingAssignment) return false
    return true
  })

  const unassignedCount = registrations.filter(r => !r.seatingAssignment).length
  const assignedCount = registrations.filter(r => r.seatingAssignment).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.reduce((sum, s) => sum + s.capacity, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Groups Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Groups Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unassignedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'assignments' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assignments')}
        >
          <Users className="w-4 h-4 mr-2" />
          Assignments
        </Button>
        <Button
          variant={activeTab === 'sections' ? 'default' : 'outline'}
          onClick={() => setActiveTab('sections')}
        >
          <Grid3X3 className="w-4 h-4 mr-2" />
          Manage Sections
        </Button>
      </div>

      {/* Sections Management */}
      {activeTab === 'sections' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Seating Sections</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define sections for Mass, sessions, or other gatherings
              </p>
            </div>
            <Button onClick={openCreateSectionDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No seating sections created yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: section.color }}
                          />
                          <span className="font-medium">{section.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{section.sectionCode || '-'}</TableCell>
                      <TableCell>{section.capacity}</TableCell>
                      <TableCell>{section.currentOccupancy}</TableCell>
                      <TableCell>
                        {section.publicVisible ? (
                          <Badge className="bg-green-100 text-green-800">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSectionDialog(section)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteConfirmId(section.id)}
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
          </CardContent>
        </Card>
      )}

      {/* Assignments */}
      {activeTab === 'assignments' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v: 'all' | 'assigned' | 'unassigned') => setStatusFilter(v)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Registrations List */}
          <Card>
            <CardHeader>
              <CardTitle>Groups & Registrations ({filteredRegistrations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRegistrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No registrations match your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          reg.seatingAssignment
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{reg.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {reg.type === 'group' ? 'Group Registration' : 'Individual'}
                            {reg.participantCount && ` • ${reg.participantCount} participants`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {reg.seatingAssignment ? (
                            <>
                              <Badge
                                style={{
                                  backgroundColor: sections.find(
                                    (s) => s.id === reg.seatingAssignment?.sectionId
                                  )?.color,
                                }}
                              >
                                {reg.seatingAssignment.sectionName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleUnassign(reg.id)}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRegistration(reg)
                                setIsAssignDialogOpen(true)
                              }}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Section Create/Edit Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit Section' : 'Add Section'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSectionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Section Name</Label>
              <Input
                id="name"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                placeholder="e.g., Section A, Left Side"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sectionCode">Section Code</Label>
                <Input
                  id="sectionCode"
                  value={sectionForm.sectionCode}
                  onChange={(e) =>
                    setSectionForm({ ...sectionForm, sectionCode: e.target.value })
                  }
                  placeholder="e.g., A, B, C"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={sectionForm.capacity}
                  onChange={(e) =>
                    setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value) || 100 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      sectionForm.color === color.hex
                        ? 'border-navy ring-2 ring-navy ring-offset-2'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setSectionForm({ ...sectionForm, color: color.hex })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationDescription">Location Description</Label>
              <Textarea
                id="locationDescription"
                value={sectionForm.locationDescription}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, locationDescription: e.target.value })
                }
                placeholder="e.g., Left side of the church, near the altar"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="publicVisible"
                checked={sectionForm.publicVisible}
                onCheckedChange={(checked) =>
                  setSectionForm({ ...sectionForm, publicVisible: !!checked })
                }
              />
              <Label htmlFor="publicVisible">Visible on public portal</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSectionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sectionLoading}>
                {sectionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingSection ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Section Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Section - {selectedRegistration?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {sections.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No sections available. Create sections first.
              </p>
            ) : (
              sections.map((section) => (
                <Button
                  key={section.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() =>
                    selectedRegistration && handleAssign(selectedRegistration.id, section.id)
                  }
                  disabled={assignLoading}
                >
                  <div
                    className="w-4 h-4 rounded mr-3"
                    style={{ backgroundColor: section.color }}
                  />
                  <div className="text-left">
                    <div className="font-medium">{section.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {section.currentOccupancy}/{section.capacity} assigned
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this section? All assignments to this section will
            be removed. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteSection(deleteConfirmId)}
              disabled={sectionLoading}
            >
              {sectionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
