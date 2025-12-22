'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Users,
  UserPlus,
  Loader2,
  MoreHorizontal,
  Trash2,
  Mail,
  Clock,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import { format } from 'date-fns'

interface TeamMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  lastLogin: string | null
  createdAt: string
  clerkUserId?: string | null
}

const ROLES = [
  { value: 'org_admin', label: 'Organization Admin', description: 'Full admin access' },
]

export default function TeamSettingsTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'org_admin',
  })
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Delete confirmation
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings/team')
      if (!response.ok) throw new Error('Failed to fetch team members')
      const data = await response.json()
      setTeamMembers(data.teamMembers || [])
      setPendingInvites(data.pendingInvites || [])
    } catch (err) {
      console.error('Error fetching team:', err)
      setError('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    setInviteError(null)

    try {
      const response = await fetch('/api/admin/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send invitation')
      }

      // Reset form and close modal
      setInviteData({ email: '', firstName: '', lastName: '', role: 'org_admin' })
      setShowInviteModal(false)
      fetchTeamMembers()
    } catch (err) {
      console.error('Error inviting member:', err)
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!deletingMember) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/settings/team/${deletingMember.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      setDeletingMember(null)
      fetchTeamMembers()
    } catch (err) {
      console.error('Error removing member:', err)
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setIsDeleting(false)
    }
  }

  const getRoleBadge = (role: string, isMasterAdmin: boolean) => {
    if (role === 'master_admin' || isMasterAdmin) {
      return (
        <Badge className="bg-[#1E3A5F] text-white">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Master Admin
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-[#9C8466] text-[#9C8466]">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    )
  }

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never'
    return format(new Date(lastLogin), 'MMM d, yyyy h:mm a')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Team Members</h2>
          <p className="text-sm text-gray-500">
            Manage who has access to your organization&apos;s admin dashboard
          </p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      {/* Active Team Members */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-[#1E3A5F] flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Active Members ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No team members yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Last Login
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#1E3A5F]">
                          {member.firstName} {member.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-600">{member.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(member.role, member.role === 'master_admin')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">
                          {formatLastLogin(member.lastLogin)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {member.role !== 'master_admin' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setDeletingMember(member)}
                                className="text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-[#1E3A5F] flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Pending Invitations ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Invited
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map((invite) => (
                    <tr key={invite.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#1E3A5F]">
                          {invite.firstName} {invite.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-600">{invite.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">
                          {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingMember(invite)}
                              className="text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization as an administrator.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4 py-4">
              {inviteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {inviteError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={inviteData.firstName}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, firstName: e.target.value })
                    }
                    placeholder="John"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={inviteData.lastName}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                  placeholder="john.doe@example.com"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) =>
                    setInviteData({ ...inviteData, role: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-gray-500">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting}
                className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {deletingMember?.firstName} {deletingMember?.lastName}
              </strong>{' '}
              from your team? They will lose access to the admin dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingMember(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
