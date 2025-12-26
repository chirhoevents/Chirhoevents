'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
  Utensils,
  Loader2,
  Search,
  UserPlus,
  UserMinus,
  Wand2,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosMealGroupsProps {
  eventId: string
}

interface MealGroup {
  id: string
  eventId: string
  name: string
  color: string
  colorHex: string
  breakfastTime: string | null
  lunchTime: string | null
  dinnerTime: string | null
  capacity: number
  currentSize: number
  displayOrder: number
  isActive: boolean
}

interface Registration {
  id: string
  type: 'group' | 'individual'
  name: string
  participantCount?: number
  mealGroupAssignment?: {
    groupId: string
    groupName: string
    colorHex: string
  } | null
}

const MEAL_COLORS = [
  { name: 'Red', hex: '#DC2626' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Yellow', hex: '#CA8A04' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Pink', hex: '#DB2777' },
  { name: 'Teal', hex: '#0D9488' },
]

export function PorosMealGroups({ eventId }: PorosMealGroupsProps) {
  const [mealGroups, setMealGroups] = useState<MealGroup[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'groups' | 'assignments'>('groups')

  // Group dialog
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<MealGroup | null>(null)
  const [groupForm, setGroupForm] = useState({
    name: '',
    color: 'Red',
    colorHex: '#DC2626',
    breakfastTime: '',
    lunchTime: '',
    dinnerTime: '',
    capacity: 100,
    isActive: true,
  })
  const [formLoading, setFormLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Assignment state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  // Import/Export state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [groupsRes, registrationsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/meal-groups`),
        fetch(`/api/admin/events/${eventId}/poros/meal-group-registrations`),
      ])

      if (groupsRes.ok) setMealGroups(await groupsRes.json())
      if (registrationsRes.ok) setRegistrations(await registrationsRes.json())
    } catch (error) {
      console.error('Failed to fetch meal groups data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateGroupDialog() {
    setEditingGroup(null)
    setGroupForm({
      name: '',
      color: 'Red',
      colorHex: '#DC2626',
      breakfastTime: '',
      lunchTime: '',
      dinnerTime: '',
      capacity: 100,
      isActive: true,
    })
    setIsGroupDialogOpen(true)
  }

  function openEditGroupDialog(group: MealGroup) {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      color: group.color,
      colorHex: group.colorHex,
      breakfastTime: group.breakfastTime || '',
      lunchTime: group.lunchTime || '',
      dinnerTime: group.dinnerTime || '',
      capacity: group.capacity,
      isActive: group.isActive,
    })
    setIsGroupDialogOpen(true)
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)

    try {
      const url = editingGroup
        ? `/api/admin/events/${eventId}/poros/meal-groups/${editingGroup.id}`
        : `/api/admin/events/${eventId}/poros/meal-groups`

      const response = await fetch(url, {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save meal group')
      }

      toast.success(editingGroup ? 'Meal group updated' : 'Meal group created')
      setIsGroupDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save meal group')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setFormLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/meal-groups/${groupId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete meal group')
      }

      toast.success('Meal group deleted')
      setDeleteConfirmId(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete meal group')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleAssign(registrationId: string, groupId: string) {
    setAssignLoading(true)
    try {
      const registration = registrations.find(r => r.id === registrationId)
      const response = await fetch(`/api/admin/events/${eventId}/poros/meal-group-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealGroupId: groupId,
          groupRegistrationId: registration?.type === 'group' ? registrationId : null,
          individualRegistrationId: registration?.type === 'individual' ? registrationId : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign meal group')
      }

      toast.success('Meal group assigned')
      setIsAssignDialogOpen(false)
      setSelectedRegistration(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign meal group')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleUnassign(registrationId: string) {
    try {
      const registration = registrations.find(r => r.id === registrationId)
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/meal-group-assignments/${registrationId}`,
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

      toast.success('Meal group assignment removed')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment')
    }
  }

  async function handleAutoAssign() {
    setFormLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/meal-groups/auto-assign`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Auto-assign failed')
      }

      const result = await response.json()
      toast.success(`Assigned ${result.assigned} groups to meal colors`)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Auto-assign failed')
    } finally {
      setFormLoading(false)
    }
  }

  function handleColorSelect(colorName: string) {
    const color = MEAL_COLORS.find(c => c.name === colorName)
    if (color) {
      setGroupForm({
        ...groupForm,
        color: color.name,
        colorHex: color.hex,
        name: groupForm.name || color.name, // Auto-fill name if empty
      })
    }
  }

  // Download CSV template
  function handleDownloadTemplate() {
    const template = `Color Name,Color Hex,Breakfast Time,Lunch Time,Dinner Time,Capacity,Active
Red,#DC2626,7:00 AM,12:00 PM,5:30 PM,100,true
Orange,#EA580C,7:15 AM,12:15 PM,5:45 PM,100,true
Yellow,#CA8A04,7:30 AM,12:30 PM,6:00 PM,100,true
Green,#16A34A,7:45 AM,12:45 PM,6:15 PM,100,true
Blue,#2563EB,8:00 AM,1:00 PM,6:30 PM,100,true`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meal-groups-template-${eventId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Export current data
  async function handleExportData() {
    try {
      // Create CSV from current meal groups
      const headers = ['Color Name', 'Color Hex', 'Breakfast Time', 'Lunch Time', 'Dinner Time', 'Capacity', 'Active']
      const rows = mealGroups.map(g => [
        g.name,
        g.colorHex,
        g.breakfastTime || '',
        g.lunchTime || '',
        g.dinnerTime || '',
        g.capacity.toString(),
        g.isActive.toString()
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meal-groups-export-${eventId}-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Meal groups exported')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  // Handle file selection for import
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setImportFile(selectedFile)

    // Parse CSV for preview
    const text = await selectedFile.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1, 6).map(line =>
      line.split(',').map(cell => cell.trim())
    )

    setImportPreview({ headers, rows })
  }

  // Handle import submission
  async function handleImport() {
    if (!importFile) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch(`/api/admin/events/${eventId}/poros/meal-groups/import`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()
      toast.success(`Imported ${result.created} meal groups`)
      setShowImportModal(false)
      setImportFile(null)
      setImportPreview(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // Filter registrations
  const filteredRegistrations = registrations.filter(r => {
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (statusFilter === 'assigned' && !r.mealGroupAssignment) return false
    if (statusFilter === 'unassigned' && r.mealGroupAssignment) return false
    return true
  })

  const unassignedCount = registrations.filter(r => !r.mealGroupAssignment).length
  const assignedCount = registrations.filter(r => r.mealGroupAssignment).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Import/Export Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download Template
        </Button>
        <Button variant="outline" onClick={() => setShowImportModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import Colors
        </Button>
        {mealGroups.length > 0 && (
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meal Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mealGroups.length}</div>
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
              {mealGroups.reduce((sum, g) => sum + g.capacity, 0)}
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
              Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unassignedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Dashboard */}
      {mealGroups.filter(g => g.isActive).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Meal Group Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeGroups = mealGroups.filter(g => g.isActive)
              const totalAssigned = activeGroups.reduce((sum, g) => sum + g.currentSize, 0)
              const maxSize = Math.max(...activeGroups.map(g => g.currentSize), 1)
              const avgSize = totalAssigned / (activeGroups.length || 1)

              return (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {activeGroups.map(group => {
                      const percentage = totalAssigned > 0
                        ? Math.round((group.currentSize / totalAssigned) * 100)
                        : 0
                      const isUnbalanced = group.currentSize < avgSize * 0.7

                      return (
                        <div key={group.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: group.colorHex }}
                              />
                              <span className="font-medium">{group.name}</span>
                              {isUnbalanced && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                  Low
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {group.currentSize} people ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="h-3 rounded-full transition-all"
                              style={{
                                width: `${(group.currentSize / maxSize) * 100}%`,
                                backgroundColor: group.colorHex,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-4 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Assigned:</span>
                      <span className="font-semibold">{totalAssigned} people</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average per group:</span>
                      <span className="font-semibold">{Math.round(avgSize)} people</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unassigned:</span>
                      <span className={`font-semibold ${unassignedCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {unassignedCount} groups
                      </span>
                    </div>
                  </div>

                  {activeGroups.some(g => g.currentSize < avgSize * 0.7) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                      💡 <strong>Tip:</strong> Some meal groups are significantly smaller than others.
                      Consider redistributing for more balanced dining times.
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'groups' ? 'default' : 'outline'}
          onClick={() => setActiveTab('groups')}
        >
          <Utensils className="w-4 h-4 mr-2" />
          Meal Colors
        </Button>
        <Button
          variant={activeTab === 'assignments' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assignments')}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Assignments
        </Button>
      </div>

      {/* Meal Colors View */}
      {activeTab === 'groups' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Meal Colors</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define meal times by color for staggered dining
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAutoAssign} disabled={formLoading}>
                <Wand2 className="w-4 h-4 mr-2" />
                Auto-Assign
              </Button>
              <Button onClick={openCreateGroupDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Color
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mealGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No meal colors created yet</p>
                <p className="text-sm">Add colors to manage staggered meal times</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mealGroups.map((group) => (
                  <Card
                    key={group.id}
                    className="relative overflow-hidden"
                    style={{ borderTopColor: group.colorHex, borderTopWidth: 4 }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: group.colorHex }}
                          />
                          <CardTitle className="text-lg">{group.name}</CardTitle>
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
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {group.currentSize}/{group.capacity} assigned
                      </div>
                      <div className="space-y-1 text-sm">
                        {group.breakfastTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span className="text-muted-foreground">Breakfast:</span>
                            <span>{group.breakfastTime}</span>
                          </div>
                        )}
                        {group.lunchTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span className="text-muted-foreground">Lunch:</span>
                            <span>{group.lunchTime}</span>
                          </div>
                        )}
                        {group.dinnerTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span className="text-muted-foreground">Dinner:</span>
                            <span>{group.dinnerTime}</span>
                          </div>
                        )}
                      </div>
                      {!group.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="rounded-full h-2"
                          style={{
                            backgroundColor: group.colorHex,
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
                  <Utensils className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No registrations match your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          reg.mealGroupAssignment
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
                          {reg.mealGroupAssignment ? (
                            <>
                              <Badge
                                style={{
                                  backgroundColor: reg.mealGroupAssignment.colorHex,
                                  color: 'white',
                                }}
                              >
                                {reg.mealGroupAssignment.groupName}
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

      {/* Group Create/Edit Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Meal Color' : 'Add Meal Color'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {MEAL_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                      groupForm.colorHex === color.hex
                        ? 'border-navy ring-2 ring-navy ring-offset-2'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => handleColorSelect(color.name)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g., Red, St. Joseph"
                  required
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
                    setGroupForm({ ...groupForm, capacity: parseInt(e.target.value) || 100 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breakfastTime">Breakfast</Label>
                <Input
                  id="breakfastTime"
                  value={groupForm.breakfastTime}
                  onChange={(e) => setGroupForm({ ...groupForm, breakfastTime: e.target.value })}
                  placeholder="7:00 AM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lunchTime">Lunch</Label>
                <Input
                  id="lunchTime"
                  value={groupForm.lunchTime}
                  onChange={(e) => setGroupForm({ ...groupForm, lunchTime: e.target.value })}
                  placeholder="12:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dinnerTime">Dinner</Label>
                <Input
                  id="dinnerTime"
                  value={groupForm.dinnerTime}
                  onChange={(e) => setGroupForm({ ...groupForm, dinnerTime: e.target.value })}
                  placeholder="6:00 PM"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={groupForm.isActive}
                onCheckedChange={(checked) =>
                  setGroupForm({ ...groupForm, isActive: !!checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
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

      {/* Assign Meal Color Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Meal Color - {selectedRegistration?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {mealGroups.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 col-span-2">
                No meal colors available. Create colors first.
              </p>
            ) : (
              mealGroups
                .filter(g => g.isActive)
                .map((group) => (
                  <Button
                    key={group.id}
                    variant="outline"
                    className="h-auto py-4 justify-start"
                    onClick={() =>
                      selectedRegistration && handleAssign(selectedRegistration.id, group.id)
                    }
                    disabled={assignLoading}
                  >
                    <div
                      className="w-8 h-8 rounded-full mr-3"
                      style={{ backgroundColor: group.colorHex }}
                    />
                    <div className="text-left">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.currentSize}/{group.capacity}
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
            <DialogTitle>Delete Meal Color</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this meal color? All assignments will be removed.
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

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Meal Colors</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Download the CSV template using the &quot;Download Template&quot; button</li>
                <li>Open the template in Excel or Google Sheets</li>
                <li>Fill in your meal colors and times (e.g., 7:00 AM, 12:30 PM)</li>
                <li>Save as CSV file</li>
                <li>Upload the filled template below</li>
              </ol>
            </div>

            {/* File upload */}
            <div>
              <Label>Select CSV File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>

            {/* Preview */}
            {importPreview && (
              <div>
                <Label>Preview (first 5 rows):</Label>
                <div className="mt-2 overflow-x-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {importPreview.headers.map((header, i) => (
                          <th key={i} className="border-b px-2 py-1 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="border-b px-2 py-1">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportModal(false)
              setImportFile(null)
              setImportPreview(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import Meal Colors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
