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
  Building2,
  User,
} from 'lucide-react'
import { toast } from '@/lib/toast'

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
  youthGroupCount?: number
  individualCount?: number
}

interface Staff {
  id: string
  firstName: string
  lastName: string
  staffType: string
}

interface YouthGroup {
  id: string
  groupName: string
  participantCount: number
  smallGroupAssignment?: {
    groupId: string
    groupName: string
  } | null
}

interface Individual {
  id: string
  firstName: string
  lastName: string
  gender: string
  smallGroupAssignment?: {
    groupId: string
    groupName: string
  } | null
}

export function PorosSmallGroups({ eventId }: PorosSmallGroupsProps) {
  const [groups, setGroups] = useState<SmallGroup[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [youthGroups, setYouthGroups] = useState<YouthGroup[]>([])
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'groups' | 'youth-groups' | 'individuals'>('groups')

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
  const [selectedItem, setSelectedItem] = useState<YouthGroup | Individual | null>(null)
  const [selectedType, setSelectedType] = useState<'youth-group' | 'individual'>('youth-group')
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [groupsRes, staffRes, youthGroupsRes, individualsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/small-groups`),
        fetch(`/api/admin/events/${eventId}/poros/staff?type=sgl,co_sgl`),
        fetch(`/api/admin/events/${eventId}/poros/small-group-youth-groups`),
        fetch(`/api/admin/events/${eventId}/poros/small-group-individuals`),
      ])

      if (groupsRes.ok) setGroups(await groupsRes.json())
      if (staffRes.ok) setStaff(await staffRes.json())
      if (youthGroupsRes.ok) setYouthGroups(await youthGroupsRes.json())
      if (individualsRes.ok) setIndividuals(await individualsRes.json())
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

  async function handleAssign(itemId: string, groupId: string, type: 'youth-group' | 'individual') {
    setAssignLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/small-group-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smallGroupId: groupId,
          groupRegistrationId: type === 'youth-group' ? itemId : null,
          individualRegistrationId: type === 'individual' ? itemId : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign')
      }

      toast.success(type === 'youth-group' ? 'Youth group assigned' : 'Individual assigned')
      setIsAssignDialogOpen(false)
      setSelectedItem(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleUnassign(itemId: string, type: 'youth-group' | 'individual') {
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/small-group-assignments/${itemId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: type === 'youth-group' ? 'group_registration' : 'individual'
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove assignment')
      }

      toast.success('Assignment removed')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment')
    }
  }

  // Filter youth groups
  const filteredYouthGroups = youthGroups.filter(g => {
    if (searchQuery && !g.groupName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (statusFilter === 'assigned' && !g.smallGroupAssignment) return false
    if (statusFilter === 'unassigned' && g.smallGroupAssignment) return false
    return true
  })

  // Filter individuals
  const filteredIndividuals = individuals.filter(i => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${i.firstName} ${i.lastName}`.toLowerCase()
      if (!fullName.includes(query)) return false
    }
    if (statusFilter === 'assigned' && !i.smallGroupAssignment) return false
    if (statusFilter === 'unassigned' && i.smallGroupAssignment) return false
    return true
  })

  const unassignedYouthGroups = youthGroups.filter(g => !g.smallGroupAssignment).length
  const assignedYouthGroups = youthGroups.filter(g => g.smallGroupAssignment).length
  const unassignedIndividuals = individuals.filter(i => !i.smallGroupAssignment).length
  const assignedIndividuals = individuals.filter(i => i.smallGroupAssignment).length
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Small Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Youth Groups Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{assignedYouthGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Youth Groups Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unassignedYouthGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Individuals Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{assignedIndividuals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Individuals Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unassignedIndividuals}</div>
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
          Manage Groups
        </Button>
        <Button
          variant={activeTab === 'youth-groups' ? 'default' : 'outline'}
          onClick={() => setActiveTab('youth-groups')}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Youth Groups ({youthGroups.length})
        </Button>
        <Button
          variant={activeTab === 'individuals' ? 'default' : 'outline'}
          onClick={() => setActiveTab('individuals')}
        >
          <User className="w-4 h-4 mr-2" />
          Individuals ({individuals.length})
        </Button>
      </div>

      {/* Groups Management View */}
      {activeTab === 'groups' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Small Groups</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create small groups and assign staff leaders
              </p>
            </div>
            <Button onClick={openCreateGroupDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
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
                      {group.sgl ? (
                        <div className="text-sm">
                          <span className="text-muted-foreground">SGL:</span>{' '}
                          <span className="font-medium">
                            {group.sgl.firstName} {group.sgl.lastName}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-amber-600">
                          No SGL assigned
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
                      <div className="pt-2 border-t mt-2 space-y-1">
                        <div className="text-sm flex justify-between">
                          <span className="text-muted-foreground">Youth Groups:</span>
                          <span className="font-medium">{group.youthGroupCount || 0}</span>
                        </div>
                        <div className="text-sm flex justify-between">
                          <span className="text-muted-foreground">Individuals:</span>
                          <span className="font-medium">{group.individualCount || 0}</span>
                        </div>
                      </div>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Youth Groups Assignments View */}
      {activeTab === 'youth-groups' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by parish name..."
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

          {/* Youth Groups List */}
          <Card>
            <CardHeader>
              <CardTitle>Youth Groups / Parishes ({filteredYouthGroups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredYouthGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No youth groups match your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredYouthGroups.map((yg) => (
                      <div
                        key={yg.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          yg.smallGroupAssignment
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{yg.groupName}</div>
                          <div className="text-sm text-muted-foreground">
                            {yg.participantCount} participants
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {yg.smallGroupAssignment ? (
                            <>
                              <Badge variant="outline">
                                {yg.smallGroupAssignment.groupName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleUnassign(yg.id, 'youth-group')}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(yg)
                                setSelectedType('youth-group')
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

      {/* Individuals Assignments View */}
      {activeTab === 'individuals' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
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

          {/* Individuals List */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Registrations ({filteredIndividuals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredIndividuals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No individuals match your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredIndividuals.map((ind) => (
                      <div
                        key={ind.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          ind.smallGroupAssignment
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              ind.gender?.toLowerCase() === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                            }`}
                          />
                          <div className="font-medium">
                            {ind.firstName} {ind.lastName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ind.smallGroupAssignment ? (
                            <>
                              <Badge variant="outline">
                                {ind.smallGroupAssignment.groupName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleUnassign(ind.id, 'individual')}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(ind)
                                setSelectedType('individual')
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
                <Label htmlFor="sglId">SGL (Staff Leader)</Label>
                <Select
                  value={groupForm.sglId || 'none'}
                  onValueChange={(v) => setGroupForm({ ...groupForm, sglId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SGL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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
                  value={groupForm.coSglId || 'none'}
                  onValueChange={(v) => setGroupForm({ ...groupForm, coSglId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Co-SGL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign to Small Group - {
                selectedType === 'youth-group'
                  ? (selectedItem as YouthGroup)?.groupName
                  : `${(selectedItem as Individual)?.firstName} ${(selectedItem as Individual)?.lastName}`
              }
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
                      selectedItem && handleAssign(selectedItem.id, group.id, selectedType)
                    }
                    disabled={assignLoading}
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
                        {group.youthGroupCount || 0} youth groups, {group.individualCount || 0} individuals
                        {group.sgl && ` • SGL: ${group.sgl.firstName} ${group.sgl.lastName}`}
                      </div>
                    </div>
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
