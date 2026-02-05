'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Settings } from 'lucide-react'
import ReportCard from '@/components/admin/reports/ReportCard'
import FinancialReportModal from '@/components/admin/reports/FinancialReportModal'
import RegistrationReportModal from '@/components/admin/reports/RegistrationReportModal'
import FormsReportModal from '@/components/admin/reports/FormsReportModal'
import HousingReportModal from '@/components/admin/reports/HousingReportModal'
import RoomAllocationReportModal from '@/components/admin/reports/RoomAllocationReportModal'
import MedicalReportModal from '@/components/admin/reports/MedicalReportModal'
import CertificatesReportModal from '@/components/admin/reports/CertificatesReportModal'
import ChaperoneReportModal from '@/components/admin/reports/ChaperoneReportModal'
import VendorReportModal from '@/components/admin/reports/VendorReportModal'
import StaffReportModal from '@/components/admin/reports/StaffReportModal'
import { CustomReportBuilder } from '@/components/admin/reports/CustomReportBuilder'
import { usePermissions } from '@/hooks/usePermissions'

interface ReportsClientProps {
  eventId: string
  eventName: string
  organizationId: string
  startDate: string
  endDate: string
  groupRegistrationEnabled?: boolean
  individualRegistrationEnabled?: boolean
}

export default function ReportsClient({
  eventId,
  eventName,
  organizationId,
  startDate,
  endDate,
  groupRegistrationEnabled = true,
  individualRegistrationEnabled = true,
}: ReportsClientProps) {
  const { canViewFinancial } = usePermissions()
  const canViewFinancialReports = canViewFinancial()

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)
  const [showGroupDetailBuilder, setShowGroupDetailBuilder] = useState(false)

  const handleExportAll = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/reports/export-all`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Get the blob and download
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

  return (
    <>
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
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
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Financial Report - only visible for users with financial permissions */}
        {canViewFinancialReports && (
          <ReportCard
            title="Financial Report"
            reportType="financial"
            eventId={eventId}
            onViewReport={() => setActiveModal('financial')}
          />
        )}

        <ReportCard
          title="Registration Report"
          reportType="registrations"
          eventId={eventId}
          onViewReport={() => setActiveModal('registrations')}
        />

        <ReportCard
          title="Forms Status Report"
          reportType="forms"
          eventId={eventId}
          onViewReport={() => setActiveModal('forms')}
        />

        <ReportCard
          title="Housing Report"
          reportType="housing"
          eventId={eventId}
          onViewReport={() => setActiveModal('housing')}
        />

        <ReportCard
          title="Room Allocation Report"
          reportType="room-allocations"
          eventId={eventId}
          onViewReport={() => setActiveModal('room-allocations')}
        />

        <ReportCard
          title="Dietary/Medical Report"
          reportType="medical"
          eventId={eventId}
          onViewReport={() => setActiveModal('medical')}
        />

        <ReportCard
          title="Safe Environment Certificates"
          reportType="certificates"
          eventId={eventId}
          onViewReport={() => setActiveModal('certificates')}
        />

        <ReportCard
          title="Chaperone Summary Report"
          reportType="chaperones"
          eventId={eventId}
          onViewReport={() => setActiveModal('chaperones')}
        />

        <ReportCard
          title="Vendor Report"
          reportType="vendors"
          eventId={eventId}
          onViewReport={() => setActiveModal('vendors')}
        />

        <ReportCard
          title="Staff Report"
          reportType="staff"
          eventId={eventId}
          onViewReport={() => setActiveModal('staff')}
        />

        {groupRegistrationEnabled && (
          <ReportCard
            title="Group Detail / Runner Report"
            reportType="group-detail"
            eventId={eventId}
            onViewReport={() => setShowGroupDetailBuilder(true)}
          />
        )}
      </div>

      {/* Report Modals */}
      {canViewFinancialReports && (
        <FinancialReportModal
          isOpen={activeModal === 'financial'}
          onClose={() => setActiveModal(null)}
          eventId={eventId}
          eventName={eventName}
        />
      )}

      <RegistrationReportModal
        isOpen={activeModal === 'registrations'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <FormsReportModal
        isOpen={activeModal === 'forms'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <HousingReportModal
        isOpen={activeModal === 'housing'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <RoomAllocationReportModal
        isOpen={activeModal === 'room-allocations'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <MedicalReportModal
        isOpen={activeModal === 'medical'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <CertificatesReportModal
        isOpen={activeModal === 'certificates'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <ChaperoneReportModal
        isOpen={activeModal === 'chaperones'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <VendorReportModal
        isOpen={activeModal === 'vendors'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      <StaffReportModal
        isOpen={activeModal === 'staff'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

      {/* Custom Report Builder */}
      <CustomReportBuilder
        open={showCustomBuilder}
        onClose={() => setShowCustomBuilder(false)}
        eventId={eventId}
        eventName={eventName}
        organizationId={organizationId}
        groupRegistrationEnabled={groupRegistrationEnabled}
        individualRegistrationEnabled={individualRegistrationEnabled}
      />

      {/* Group Detail / Runner Report Builder */}
      <CustomReportBuilder
        open={showGroupDetailBuilder}
        onClose={() => setShowGroupDetailBuilder(false)}
        eventId={eventId}
        eventName={eventName}
        organizationId={organizationId}
        groupRegistrationEnabled={groupRegistrationEnabled}
        individualRegistrationEnabled={individualRegistrationEnabled}
        initialDataSource="group-detail"
      />
    </>
  )
}
