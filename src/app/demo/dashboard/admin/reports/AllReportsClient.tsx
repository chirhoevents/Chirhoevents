'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Download,
  Settings,
  Calendar,
  BarChart3,
  DollarSign,
  Users,
  FileText,
  Home,
  Stethoscope,
  Shield,
  UserCheck,
} from 'lucide-react'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

const DEMO_EVENTS: Event[] = [
  { id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026', startDate: '2026-07-15', endDate: '2026-07-18', status: 'published' },
  { id: 'evt-diocesan-conference', name: 'Diocesan Youth Conference', startDate: '2026-10-03', endDate: '2026-10-05', status: 'published' },
  { id: 'evt-mens-retreat', name: "Men's Silent Retreat", startDate: '2026-09-11', endDate: '2026-09-13', status: 'published' },
  { id: 'evt-summer-2025', name: 'Summer Youth Retreat 2025', startDate: '2025-07-15', endDate: '2025-07-18', status: 'completed' },
]

const REPORTS = [
  { id: 'financial', title: 'Financial Report', icon: DollarSign, description: 'Revenue, refunds, payment status, and outstanding balances' },
  { id: 'registrations', title: 'Registration Report', icon: Users, description: 'Full registration list with contact info and roster' },
  { id: 'forms', title: 'Forms Status Report', icon: FileText, description: 'Waiver completion progress per participant' },
  { id: 'housing', title: 'Housing Report', icon: Home, description: 'Room assignments and roommate lists' },
  { id: 'medical', title: 'Dietary / Medical Report', icon: Stethoscope, description: 'Allergies, medications, dietary restrictions' },
  { id: 'certificates', title: 'Safe Environment Certificates', icon: Shield, description: 'Chaperone certification status and expirations' },
  { id: 'chaperones', title: 'Chaperone Summary Report', icon: UserCheck, description: 'Chaperone-to-youth ratios and contact info by group' },
]

export default function AllReportsClient() {
  const events = DEMO_EVENTS
  const [selectedEventId, setSelectedEventId] = useState<string>('all')

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Event Filter Card */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#9C8466]" />
            Filter by Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] pr-4">
            <RadioGroup
              value={selectedEventId}
              onValueChange={setSelectedEventId}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#F5F1E8] transition-colors">
                <RadioGroupItem value="all" id="all-events" />
                <Label htmlFor="all-events" className="flex-1 cursor-pointer font-medium text-[#1E3A5F]">
                  All Events
                </Label>
              </div>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#F5F1E8] transition-colors"
                >
                  <RadioGroupItem value={event.id} id={event.id} />
                  <Label htmlFor={event.id} className="flex-1 cursor-pointer">
                    <div className="font-medium text-[#1E3A5F]">{event.name}</div>
                    <div className="text-sm text-[#6B7280]">
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </div>
                  </Label>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      event.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : event.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Event Info */}
      {selectedEventId !== 'all' && selectedEvent && (
        <div className="bg-[#1E3A5F] text-white rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5" />
            <div>
              <div className="font-medium">{selectedEvent.name}</div>
              <div className="text-sm text-white/70">
                {formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {selectedEventId !== 'all' && (
          <>
            <Button
              onClick={() => alert('Demo: Custom Report Builder would open a step-by-step wizard to build a custom CSV export.')}
              variant="outline"
              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Custom Report Builder
            </Button>
            <Button
              onClick={() => alert('Demo: Export All Data would generate a full CSV of every registration, payment, form, and housing assignment for this event.')}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
          </>
        )}
      </div>

      {/* Report Cards Grid */}
      {selectedEventId === 'all' ? (
        <Card className="bg-[#F5F1E8] border-[#D1D5DB]">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-[#9C8466] opacity-50" />
            <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">
              Select an Event to View Reports
            </h3>
            <p className="text-[#6B7280] max-w-md mx-auto">
              Choose a specific event from the filter above to view and generate reports.
              Each report will show data specific to the selected event.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORTS.map((report) => (
            <Card key={report.id} className="bg-white border-[#D1D5DB] hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#9C8466]/10 rounded-lg">
                      <report.icon className="h-5 w-5 text-[#9C8466]" />
                    </div>
                    <CardTitle className="text-base text-[#1E3A5F]">{report.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#6B7280] mb-4">{report.description}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => alert(`Demo: "${report.title}" would open a modal showing full data for ${selectedEvent?.name}, with view, filter, and CSV export.`)}
                    variant="outline"
                    size="sm"
                    className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white flex-1"
                  >
                    View Report
                  </Button>
                  <Button
                    onClick={() => alert(`Demo: "${report.title}" would download as CSV.`)}
                    size="sm"
                    className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
