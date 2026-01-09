'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, Settings, Loader2, Calendar, BarChart3 } from 'lucide-react'
import ReportCard from '@/components/admin/reports/ReportCard'
import FinancialReportModal from '@/components/admin/reports/FinancialReportModal'
import RegistrationReportModal from '@/components/admin/reports/RegistrationReportModal'
import FormsReportModal from '@/components/admin/reports/FormsReportModal'
import HousingReportModal from '@/components/admin/reports/HousingReportModal'
import MedicalReportModal from '@/components/admin/reports/MedicalReportModal'
import CertificatesReportModal from '@/components/admin/reports/CertificatesReportModal'
import ChaperoneReportModal from '@/components/admin/reports/ChaperoneReportModal'
import { CustomReportBuilder } from '@/components/admin/reports/CustomReportBuilder'
import { usePermissions } from '@/hooks/usePermissions'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

interface AllReportsClientProps {
  organizationId?: string  // Optional - API gets from auth context
}

export default function AllReportsClient({ organizationId: _organizationId }: AllReportsClientProps = {}) {
  const { getToken } = useAuth()
  const { canViewFinancial } = usePermissions()
  const canViewFinancialReports = canViewFinancial()

  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/admin/events?status=all', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object response formats
        const eventsArray = Array.isArray(data) ? data : (data.events || [])
        setEvents(eventsArray)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)
  const eventName = selectedEventId === 'all' ? 'All Events' : (selectedEvent?.name || 'Selected Event')

  const handleExportAll = async () => {
    if (selectedEventId === 'all') {
      alert('Please select a specific event to export all data')
      return
    }

    setIsExporting(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${selectedEventId}/reports/export-all`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${eventName.replace(/\s+/g, '_')}_complete_report.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
      </div>
    )
  }

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
                <Label
                  htmlFor="all-events"
                  className="flex-1 cursor-pointer font-medium text-[#1E3A5F]"
                >
                  All Events
                </Label>
              </div>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#F5F1E8] transition-colors"
                >
                  <RadioGroupItem value={event.id} id={event.id} />
                  <Label
                    htmlFor={event.id}
                    className="flex-1 cursor-pointer"
                  >
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`/dashboard/admin/events/${selectedEventId}/reports`, '_blank')}
          >
            Open in Event
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {selectedEventId !== 'all' && (
          <>
            <Button
              onClick={() => setShowCustomBuilder(true)}
              variant="outline"
              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Custom Report Builder
            </Button>
            <Button
              onClick={handleExportAll}
              disabled={isExporting}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export All Data'}
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Financial Report */}
            {canViewFinancialReports && (
              <ReportCard
                title="Financial Report"
                reportType="financial"
                eventId={selectedEventId}
                onViewReport={() => setActiveModal('financial')}
              />
            )}

            <ReportCard
              title="Registration Report"
              reportType="registrations"
              eventId={selectedEventId}
              onViewReport={() => setActiveModal('registrations')}
            />

            <ReportCard
              title="Forms Status Report"
              reportType="forms"
              eventId={selectedEventId}
              onViewReport={() => setActiveModal('forms')}
            />

            <ReportCard
              title="Housing Report"
              reportType="housing"
              eventId={selectedEventId}
              onViewReport={() => setActiveModal('housing')}
            />

            <ReportCard
              title="Dietary/Medical Report"
              reportType="medical"
              eventId={selectedEventId}
              onViewReport={() => setActiveModal('medical')}
            />

            <ReportCard
              title="Safe Environment Certificates"
              reportType="certificates"
              eventId={selectedEventId}
              onViewReport={() => setActiveModal('certificates')}
            />

            <ReportCard
              title="Chaperone Summary Report"
              reportType="chaperones"
              eventId={selectedEventId}
              onViewReport={() => setActiveModal('chaperones')}
            />
          </div>

          {/* Report Modals */}
          {canViewFinancialReports && (
            <FinancialReportModal
              isOpen={activeModal === 'financial'}
              onClose={() => setActiveModal(null)}
              eventId={selectedEventId}
              eventName={eventName}
            />
          )}

          <RegistrationReportModal
            isOpen={activeModal === 'registrations'}
            onClose={() => setActiveModal(null)}
            eventId={selectedEventId}
            eventName={eventName}
          />

          <FormsReportModal
            isOpen={activeModal === 'forms'}
            onClose={() => setActiveModal(null)}
            eventId={selectedEventId}
            eventName={eventName}
          />

          <HousingReportModal
            isOpen={activeModal === 'housing'}
            onClose={() => setActiveModal(null)}
            eventId={selectedEventId}
            eventName={eventName}
          />

          <MedicalReportModal
            isOpen={activeModal === 'medical'}
            onClose={() => setActiveModal(null)}
            eventId={selectedEventId}
            eventName={eventName}
          />

          <CertificatesReportModal
            isOpen={activeModal === 'certificates'}
            onClose={() => setActiveModal(null)}
            eventId={selectedEventId}
            eventName={eventName}
          />

          <ChaperoneReportModal
            isOpen={activeModal === 'chaperones'}
            onClose={() => setActiveModal(null)}
            eventId={selectedEventId}
            eventName={eventName}
          />

          {/* Custom Report Builder */}
          <CustomReportBuilder
            open={showCustomBuilder}
            onClose={() => setShowCustomBuilder(false)}
            eventId={selectedEventId}
            eventName={eventName}
          />
        </>
      )}
    </div>
  )
}
