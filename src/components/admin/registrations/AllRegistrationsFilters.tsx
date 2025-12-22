'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, X, Download } from 'lucide-react'

export type RegistrationType = 'all' | 'group' | 'individual'
export type PaymentFilter = 'all' | 'paid' | 'balance'
export type FormsFilter = 'all' | 'complete' | 'pending'
export type HousingFilter = 'all' | 'on_campus' | 'off_campus' | 'day_pass'

interface Event {
  id: string
  name: string
  slug: string
}

interface AllRegistrationsFiltersProps {
  events: Event[]
  selectedEventId: string
  onEventChange: (eventId: string) => void
  registrationType: RegistrationType
  onRegistrationTypeChange: (type: RegistrationType) => void
  paymentFilter: PaymentFilter
  onPaymentFilterChange: (filter: PaymentFilter) => void
  formsFilter: FormsFilter
  onFormsFilterChange: (filter: FormsFilter) => void
  housingFilter: HousingFilter
  onHousingFilterChange: (filter: HousingFilter) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onClearFilters: () => void
  onExport: () => void
  isExporting: boolean
}

export default function AllRegistrationsFilters({
  events,
  selectedEventId,
  onEventChange,
  registrationType,
  onRegistrationTypeChange,
  paymentFilter,
  onPaymentFilterChange,
  formsFilter,
  onFormsFilterChange,
  housingFilter,
  onHousingFilterChange,
  searchQuery,
  onSearchChange,
  onClearFilters,
  onExport,
  isExporting,
}: AllRegistrationsFiltersProps) {
  const hasActiveFilters =
    selectedEventId !== 'all' ||
    registrationType !== 'all' ||
    paymentFilter !== 'all' ||
    formsFilter !== 'all' ||
    housingFilter !== 'all' ||
    searchQuery !== ''

  return (
    <Card className="bg-white border-[#D1D5DB]">
      <CardContent className="p-4 space-y-4">
        {/* First Row - Search and Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by group name, leader, email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-[#1E3A5F] text-[#1E3A5F]"
              onClick={onExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export to CSV'}
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Filters:</span>
          </div>

          {/* Event Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Event</label>
            <Select value={selectedEventId} onValueChange={onEventChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Type</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={registrationType === 'all' ? 'default' : 'outline'}
                onClick={() => onRegistrationTypeChange('all')}
                className={
                  registrationType === 'all' ? 'bg-[#1E3A5F] text-white' : ''
                }
              >
                All
              </Button>
              <Button
                size="sm"
                variant={registrationType === 'group' ? 'default' : 'outline'}
                onClick={() => onRegistrationTypeChange('group')}
                className={
                  registrationType === 'group' ? 'bg-[#1E3A5F] text-white' : ''
                }
              >
                Groups
              </Button>
              <Button
                size="sm"
                variant={
                  registrationType === 'individual' ? 'default' : 'outline'
                }
                onClick={() => onRegistrationTypeChange('individual')}
                className={
                  registrationType === 'individual'
                    ? 'bg-[#1E3A5F] text-white'
                    : ''
                }
              >
                Individuals
              </Button>
            </div>
          </div>

          {/* Payment Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Payment Status</label>
            <Select
              value={paymentFilter}
              onValueChange={(v) => onPaymentFilterChange(v as PaymentFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid in Full</SelectItem>
                <SelectItem value="balance">Balance Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Forms Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Forms Status</label>
            <Select
              value={formsFilter}
              onValueChange={(v) => onFormsFilterChange(v as FormsFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="complete">All Complete</SelectItem>
                <SelectItem value="pending">Pending Forms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Housing Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Housing</label>
            <Select
              value={housingFilter}
              onValueChange={(v) => onHousingFilterChange(v as HousingFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="on_campus">On-Campus</SelectItem>
                <SelectItem value="off_campus">Off-Campus</SelectItem>
                <SelectItem value="day_pass">Day Pass</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
