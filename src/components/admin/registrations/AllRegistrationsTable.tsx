'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  User,
  Eye,
  Pencil,
  Mail,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export interface Registration {
  id: string
  type: 'group' | 'individual'
  eventId: string
  eventName: string
  eventSlug: string
  groupName: string
  parishName: string | null
  leaderName: string
  leaderEmail: string
  leaderPhone: string
  participantCount: number
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: string
  formsCompleted: number
  formsTotal: number
  formsStatus: string
  housingType: string | null
  roomType?: string | null
  confirmationCode?: string | null
  createdAt: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface AllRegistrationsTableProps {
  registrations: Registration[]
  pagination: Pagination
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onPageChange: (page: number) => void
  onEditGroup: (registration: Registration) => void
  onEditIndividual: (registration: Registration) => void
  onEmail: (registration: Registration) => void
  onApplyLateFee: (registration: Registration) => void
  onMarkPayment: (registration: Registration) => void
  onRefund: (registration: Registration) => void
  isLoading: boolean
  canViewPayments?: boolean
  canEdit?: boolean
  canProcessPayments?: boolean
  canProcessRefunds?: boolean
  canApplyLateFees?: boolean
}

export default function AllRegistrationsTable({
  registrations,
  pagination,
  selectedIds,
  onSelectionChange,
  onPageChange,
  onEditGroup,
  onEditIndividual,
  onEmail,
  onApplyLateFee,
  onMarkPayment,
  onRefund,
  isLoading,
  canViewPayments = true,
  canEdit = true,
  canProcessPayments = true,
  canProcessRefunds = true,
  canApplyLateFees = true,
}: AllRegistrationsTableProps) {
  const allSelected =
    registrations.length > 0 &&
    registrations.every((r) => selectedIds.has(r.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(registrations.map((r) => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    onSelectionChange(newSelection)
  }

  const getPaymentStatusBadge = (balance: number) => {
    if (balance === 0) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-orange-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Balance Due
        </Badge>
      )
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`
    }
    return `$${amount.toLocaleString()}`
  }

  const formatHousingType = (type: string | null) => {
    if (!type) return 'N/A'
    switch (type) {
      case 'on_campus':
        return 'On-Campus'
      case 'off_campus':
        return 'Off-Campus'
      case 'day_pass':
        return 'Day Pass'
      default:
        return type
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F] mx-auto mb-4" />
          <p className="text-gray-500">Loading registrations...</p>
        </CardContent>
      </Card>
    )
  }

  if (registrations.length === 0) {
    return (
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No registrations found
          </h3>
          <p className="text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-[#D1D5DB]">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="p-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=indeterminate]:bg-[#1E3A5F]"
                    {...(someSelected && { 'data-state': 'indeterminate' })}
                  />
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-600">
                  Event
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-600">
                  Group/Name
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-600">
                  Leader/Contact
                </th>
                <th className="text-center p-3 text-sm font-semibold text-gray-600">
                  Participants
                </th>
                {canViewPayments && (
                  <>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Total
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Paid
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-600">
                      Balance
                    </th>
                  </>
                )}
                <th className="text-center p-3 text-sm font-semibold text-gray-600">
                  Forms
                </th>
                {canViewPayments && (
                  <th className="text-center p-3 text-sm font-semibold text-gray-600">
                    Status
                  </th>
                )}
                <th className="text-center p-3 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr
                  key={reg.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    selectedIds.has(reg.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.has(reg.id)}
                      onCheckedChange={() => toggleSelect(reg.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {reg.type === 'group' ? (
                        <Users className="h-4 w-4 text-[#9C8466]" />
                      ) : (
                        <User className="h-4 w-4 text-[#1E3A5F]" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#1E3A5F] truncate max-w-[150px]">
                          {reg.eventName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(reg.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-[#1E3A5F]">
                        {reg.groupName}
                      </p>
                      {reg.parishName && (
                        <p className="text-xs text-gray-500">{reg.parishName}</p>
                      )}
                      {reg.confirmationCode && (
                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1 rounded">
                          {reg.confirmationCode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium">{reg.leaderName}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[150px]">
                        {reg.leaderEmail}
                      </p>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className={`font-mono ${
                        reg.type === 'group'
                          ? 'bg-[#9C8466]/10 text-[#9C8466]'
                          : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                      }`}
                    >
                      {reg.participantCount}
                    </Badge>
                  </td>
                  {canViewPayments && (
                    <>
                      <td className="p-3 text-right font-mono text-sm">
                        {formatCurrency(reg.totalAmount)}
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-green-600">
                        {formatCurrency(reg.amountPaid)}
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-orange-600">
                        {formatCurrency(reg.balance)}
                      </td>
                    </>
                  )}
                  <td className="p-3 text-center">
                    <span
                      className={`text-sm ${
                        reg.formsCompleted === reg.formsTotal
                          ? 'text-green-600 font-semibold'
                          : 'text-orange-600'
                      }`}
                    >
                      {reg.formsCompleted}/{reg.formsTotal}
                    </span>
                  </td>
                  {canViewPayments && (
                    <td className="p-3 text-center">
                      {getPaymentStatusBadge(reg.balance)}
                    </td>
                  )}
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            reg.type === 'group'
                              ? onEditGroup(reg)
                              : onEditIndividual(reg)
                          }
                          title="Quick Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Link
                        href={`/dashboard/admin/events/${reg.eventId}/registrations/${reg.id}`}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View Full Registration"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Email"
                        onClick={() => onEmail(reg)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      {(canProcessPayments || canApplyLateFees || canProcessRefunds) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" title="More Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canProcessPayments && (
                              <DropdownMenuItem
                                onClick={() => onMarkPayment(reg)}
                                className="cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            )}
                            {canApplyLateFees && (
                              <DropdownMenuItem
                                onClick={() => onApplyLateFee(reg)}
                                className="cursor-pointer"
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Apply Late Fee
                              </DropdownMenuItem>
                            )}
                            {canProcessRefunds && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onRefund(reg)}
                                  className="cursor-pointer text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Process Refund
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} registrations
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className={
                      pagination.page === pageNum
                        ? 'bg-[#1E3A5F] text-white'
                        : ''
                    }
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
