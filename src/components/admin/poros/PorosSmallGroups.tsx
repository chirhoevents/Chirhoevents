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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Search,
  UserPlus,
  UserMinus,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'

interface PorosSmallGroupsProps {
  eventId: string
}

interface SmallGroup {
  id: string
  eventId: string
  name: string
  groupNumber: number | null
  sglId: string | null
  coSglId: string | null
  meetingTime: string | null
  meetingPlace: string | null
  capacity: number
  currentSize: number
  notes: string | null
  sgl?: { firstName: string; lastName: string } | null
  coSgl?: { firstName: string; lastName: string } | null
  assignments?: SmallGroupAssignment[]
}

interface SmallGroupAssignment {
  id: string
  participantId: string | null
  individualRegistrationId: string | null
  participant?: {
    firstName: string
    lastName: string
    gender: string
  }
  individualRegistration?: {
    firstName: string
    lastName: string
    gender: string
  }
}

interface Staff {
  id: string
  firstName: string
  lastName: string
  staffType: string
}

interface Participant {
  id: string
  type: 'group' | 'individual'
  firstName: string
  lastName: string
  gender: string
  parishName?: string
  smallGroupAssignment?: {
    groupId: string
    groupName: string
  } | null
}

export function PorosSmallGroups({ eventId }: PorosSmallGroupsProps) {
  const [groups, setGroups] = useState<SmallGroup[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'groups' | 'assignments'>('groups')

  // Group dialog
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<SmallGroup | null>(null)
  const [groupForm, setGroupForm] = useState({
    name: '',
    groupNumber: '',
    sglId: '',
    coSglId: '',
    meetingTime: '',
    meetingPlace: '',
    capacity: 12,
    notes: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Assignment state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  // Expanded group view
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [groupsRes, staffRes, participantsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/small-groups`),
        fetch(`/api/admin/events/${eventId}/poros/staff?type=sgl,co_sgl`),
        fetch(`/api/admin/events/${eventId}/poros/small-group-participants`),
      ])

      if (groupsRes.ok) setGroups(await groupsRes.json())
      if (staffRes.ok) setStaff(await staffRes.json())
      if (participantsRes.ok) setParticipants(await participantsRes.json())
    } catch (error) {
      console.error('Failed to fetch small groups data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateGroupDialog() {
    setEditingGroup(null)
    setGroupForm({
      name: '',
      groupNumber: '',
      sglId: '',
      coSglId: '',
      meetingTime: '',
      meetingPlace: '',
      capacity: 12,
      notes: '',
    })
    setIsGroupDialogOpen(true)
  }

  function openEditGroupDialog(group: SmallGroup) {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      groupNumber: group.groupNumber?.toString() || '',
      sglId: group.sglId || '',
      coSglId: group.coSglId || '',
      meetingTime: group.meetingTime || '',
      meetingPlace: group.meetingPlace || '',
      capacity: group.capacity,
      notes: group.notes || '',
    })
    setIsGroupDialogOpen(true)
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)

    try {
      const url = editingGroup
        ? `/api/admin/events/${eventId}/poros/small-groups/${editingGroup.id}`
        : `/api/admin/events/${eventId}/poros/small-groups`

      const payload = {
        ...groupForm,
        groupNumber: groupForm.groupNumber ? parseInt(groupForm.groupNumber) : null,
        sglId: groupForm.sglId || null,
        coSglId: groupForm.coSglId || null,
      }

      const response = await fetch(url, {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save group')
      }

      toast.success(editingGroup ? 'Group updated' : 'Group created')
      setIsGroupDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save group')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setFormLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/small-groups/${groupId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete group')
      }

      toast.success('Group deleted')
      setDeleteConfirmId(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete group')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleAssign(participantId: string, groupId: string) {
    setAssignLoading(true)
    try {
      const participant = participants.find(p => p.id === participantId)
      const response = await fetch(`/api/admin/events/${eventId}/poros/small-group-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smallGroupId: groupId,
          participantId: participant?.type === 'group' ? participantId : null,
          individualRegistrationId: participant?.type === 'individual' ? participantId : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign group')
      }

      toast.success('Participant assigned to small group')
      setIsAssignDialogOpen(false)
      setSelectedParticipant(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign group')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleUnassign(participantId: string) {
    try {
      const participant = participants.find(p => p.id === participantId)
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/small-group-assignments/${participantId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: participant?.type }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove assignment')
      }

      toast.success('Small group assignment removed')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment')
    }
  }

  async function handleAutoAssign() {
    setFormLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/small-groups/auto-assign`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Auto-assign failed')
      }

      const result = await response.json()
      toast.success(`Assigned ${result.assigned} participants to small groups`)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Auto-assign failed')
    } finally {
      setFormLoading(false)
    }
  }

  // Filter participants
  const filteredParticipants = participants.filter(p => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
      if (!fullName.includes(query) && !p.parishName?.toLowerCase().includes(query)) {
        return false
      }
    }
    if (statusFilter === 'assigned' && !p.smallGroupAssignment) return false
    if (statusFilter === 'unassigned' && p.smallGroupAssignment) return false
    return true
  })

  const unassignedCount = participants.filter(p => !p.smallGroupAssignment).length
  const assignedCount = participants.filter(p => p.smallGroupAssignment).length
  const sglStaff = staff.filter(s => s.staffType === 'sgl' || s.staffType === 'co_sgl')

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
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
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
              {groups.reduce((sum, g) => sum + g.capacity, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Participants Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unassigned
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
          variant={activeTab === 'groups' ? 'default' : 'outline'}
          onClick={() => setActiveTab('groups')}
        >
          <Users className="w-4 h-4 mr-2" />
          Groups
        </Button>
        <Button
          variant={activeTab === 'assignments' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assignments')}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Assignments
        </Button>
      </div>

      {/* Groups View */}
      {activeTab === 'groups' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Small Groups</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage small groups and their SGLs
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAutoAssign} disabled={formLoading}>
                <Wand2 className="w-4 h-4 mr-2" />
                Auto-Assign
              </Button>
              <Button onClick={openCreateGroupDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Group
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No small groups created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <Card key={group.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {group.name}
                            {group.groupNumber && (
                              <Badge className="ml-2" variant="outline">
                                #{group.groupNumber}
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground mt-1">
                            {group.currentSize}/{group.capacity} members
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditGroupDialog(group)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteConfirmId(group.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {group.sgl && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">SGL:</span>{' '}
                          <span className="font-medium">
                            {group.sgl.firstName} {group.sgl.lastName}
                          </span>
                        </div>
                      )}
                      {group.coSgl && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Co-SGL:</span>{' '}
                          <span className="font-medium">
                            {group.coSgl.firstName} {group.coSgl.lastName}
                          </span>
                        </div>
                      )}
                      {group.meetingTime && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Time:</span>{' '}
                          {group.meetingTime}
                        </div>
                      )}
                      {group.meetingPlace && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Place:</span>{' '}
                          {group.meetingPlace}
                        </div>
                      )}
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-navy rounded-full h-2"
                          style={{
                            width: `${(group.currentSize / group.capacity) * 100}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignments View */}
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
                      placeholder="Search by name or parish..."
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

          {/* Participants List */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({filteredParticipants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredParticipants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No participants match your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredParticipants.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          p.smallGroupAssignment
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              p.gender?.toLowerCase() === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                            }`}
                          />
                          <div>
                            <div className="font-medium">
                              {p.firstName} {p.lastName}
                            </div>
                            {p.parishName && (
                              <div className="text-sm text-muted-foreground">{p.parishName}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.smallGroupAssignment ? (
                            <>
                              <Badge variant="outline">
                                {p.smallGroupAssignment.groupName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleUnassign(p.id)}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedParticipant(p)
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

      {/* Group Create/Edit Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Add Group'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g., St. Peter, Group A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupNumber">Group Number</Label>
                <Input
                  id="groupNumber"
                  type="number"
                  value={groupForm.groupNumber}
                  onChange={(e) => setGroupForm({ ...groupForm, groupNumber: e.target.value })}
                  placeholder="e.g., 1, 2, 3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sglId">SGL</Label>
                <Select
                  value={groupForm.sglId}
                  onValueChange={(v) => setGroupForm({ ...groupForm, sglId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SGL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sglStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coSglId">Co-SGL</Label>
                <Select
                  value={groupForm.coSglId}
                  onValueChange={(v) => setGroupForm({ ...groupForm, coSglId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Co-SGL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sglStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetingTime">Meeting Time</Label>
                <Input
                  id="meetingTime"
                  value={groupForm.meetingTime}
                  onChange={(e) => setGroupForm({ ...groupForm, meetingTime: e.target.value })}
                  placeholder="e.g., 7:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={groupForm.capacity}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, capacity: parseInt(e.target.value) || 12 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingPlace">Meeting Place</Label>
              <Input
                id="meetingPlace"
                value={groupForm.meetingPlace}
                onChange={(e) => setGroupForm({ ...groupForm, meetingPlace: e.target.value })}
                placeholder="e.g., Room 101, Outside Chapel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={groupForm.notes}
                onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Group Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign to Small Group - {selectedParticipant?.firstName} {selectedParticipant?.lastName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No groups available. Create groups first.
                </p>
              ) : (
                groups.map((group) => (
                  <Button
                    key={group.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() =>
                      selectedParticipant && handleAssign(selectedParticipant.id, group.id)
                    }
                    disabled={assignLoading || group.currentSize >= group.capacity}
                  >
                    <div className="text-left flex-1">
                      <div className="font-medium">
                        {group.name}
                        {group.groupNumber && (
                          <Badge className="ml-2" variant="outline">
                            #{group.groupNumber}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {group.currentSize}/{group.capacity} members
                        {group.sgl && ` • SGL: ${group.sgl.firstName} ${group.sgl.lastName}`}
                      </div>
                    </div>
                    {group.currentSize >= group.capacity && (
                      <Badge variant="secondary">Full</Badge>
                    )}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
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
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this small group? All assignments will be removed.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteGroup(deleteConfirmId)}
              disabled={formLoading}
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
