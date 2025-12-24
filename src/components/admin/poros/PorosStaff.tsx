'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  Loader2,
  Search,
  Upload,
  Download,
  Mail,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'

interface PorosStaffProps {
  eventId: string
}

interface Staff {
  id: string
  eventId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  staffType: string
  gender: string | null
  diocese: string | null
  notes: string | null
  createdAt: string
}

const STAFF_TYPES = [
  { value: 'sgl', label: 'SGL (Small Group Leader)' },
  { value: 'co_sgl', label: 'Co-SGL' },
  { value: 'seminarian', label: 'Seminarian' },
  { value: 'priest', label: 'Priest' },
  { value: 'deacon', label: 'Deacon' },
  { value: 'religious', label: 'Religious' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'other', label: 'Other' },
]

export function PorosStaff({ eventId }: PorosStaffProps) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    staffType: 'sgl',
    gender: '',
    diocese: '',
    notes: '',
  })

  useEffect(() => {
    fetchStaff()
  }, [eventId])

  async function fetchStaff() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/staff`)
      if (response.ok) {
        setStaff(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingStaff(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      staffType: 'sgl',
      gender: '',
      diocese: '',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(staffMember: Staff) {
    setEditingStaff(staffMember)
    setFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      staffType: staffMember.staffType,
      gender: staffMember.gender || '',
      diocese: staffMember.diocese || '',
      notes: staffMember.notes || '',
    })
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)

    try {
      const url = editingStaff
        ? `/api/admin/events/${eventId}/poros/staff/${editingStaff.id}`
        : `/api/admin/events/${eventId}/poros/staff`

      const payload = {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        gender: formData.gender || null,
        diocese: formData.diocese || null,
        notes: formData.notes || null,
      }

      const response = await fetch(url, {
        method: editingStaff ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save staff member')
      }

      toast.success(editingStaff ? 'Staff member updated' : 'Staff member added')
      setIsDialogOpen(false)
      fetchStaff()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save staff member')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(staffId: string) {
    setFormLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/staff/${staffId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete staff member')
      }

      toast.success('Staff member deleted')
      setDeleteConfirmId(null)
      fetchStaff()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete staff member')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleExport() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/staff/export`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `staff-${eventId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Staff exported successfully')
    } catch (error) {
      toast.error('Failed to export staff')
    }
  }

  // Filter staff
  const filteredStaff = staff.filter((s) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase()
      const email = s.email?.toLowerCase() || ''
      if (!fullName.includes(query) && !email.includes(query)) {
        return false
      }
    }
    if (typeFilter !== 'all' && s.staffType !== typeFilter) {
      return false
    }
    return true
  })

  // Count by type
  const countByType = STAFF_TYPES.map((type) => ({
    ...type,
    count: staff.filter((s) => s.staffType === type.value).length,
  }))

  function getStaffTypeBadge(type: string) {
    const colors: Record<string, string> = {
      sgl: 'bg-blue-100 text-blue-800',
      co_sgl: 'bg-cyan-100 text-cyan-800',
      seminarian: 'bg-purple-100 text-purple-800',
      priest: 'bg-indigo-100 text-indigo-800',
      deacon: 'bg-violet-100 text-violet-800',
      religious: 'bg-pink-100 text-pink-800',
      counselor: 'bg-green-100 text-green-800',
      volunteer: 'bg-amber-100 text-amber-800',
      other: 'bg-gray-100 text-gray-800',
    }
    const label = STAFF_TYPES.find((t) => t.value === type)?.label || type
    return <Badge className={colors[type] || colors.other}>{label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats by Type */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {countByType
          .filter((t) => t.count > 0)
          .map((type) => (
            <Card key={type.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {type.label.split(' ')[0]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{type.count}</div>
              </CardContent>
            </Card>
          ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Staff Members
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage SGLs, seminarians, clergy, and other staff
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {STAFF_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff Table */}
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Diocese</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {member.firstName} {member.lastName}
                        </div>
                        {member.gender && (
                          <span className="text-sm text-muted-foreground capitalize">
                            {member.gender}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStaffTypeBadge(member.staffType)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {member.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <a
                              href={`mailto:${member.email}`}
                              className="hover:text-navy"
                            >
                              {member.email}
                            </a>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <a
                              href={`tel:${member.phone}`}
                              className="hover:text-navy"
                            >
                              {member.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{member.diocese || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(member)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteConfirmId(member.id)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffType">Staff Type</Label>
                <Select
                  value={formData.staffType}
                  onValueChange={(v) => setFormData({ ...formData, staffType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => setFormData({ ...formData, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diocese">Diocese</Label>
              <Input
                id="diocese"
                value={formData.diocese}
                onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                placeholder="e.g., Diocese of Austin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingStaff ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this staff member? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
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
