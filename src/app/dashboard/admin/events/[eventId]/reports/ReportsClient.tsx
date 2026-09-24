'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Settings, FileText } from 'lucide-react'
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
import LoadingScreen from '@/components/LoadingScreen'

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
  const [isExportingMaster, setIsExportingMaster] = useState(false)
  const [masterElapsed, setMasterElapsed] = useState(0)
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

  // While the master report builds: tick an elapsed-time counter and ask the
  // browser to confirm before the tab is closed or reloaded, since leaving
  // throws away several minutes of work.
  useEffect(() => {
    if (!isExportingMaster) return
    setMasterElapsed(0)
    const started = Date.now()
    const timer = window.setInterval(() => setMasterElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('beforeunload', warn)
    }
  }, [isExportingMaster])

  // Master PDF: single archival document with every section (registrations,
  // cancellations, participants, housing, meals, payments, refunds, liability
  // forms, incident reports, surveys, check-ins, email history, ...) plus the
  // signed forms and every uploaded certificate / letter / document.
  // Restricted to users who can view financial reports because it exposes
  // Stripe payment IDs, check numbers, and refund amounts.
  const handleExportMasterPDF = async () => {
    setIsExportingMaster(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/reports/master-pdf`, {
        method: 'POST',
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        let message = text
        try {
          message = JSON.parse(text).error || text
        } catch {
          // not JSON
        }
        throw new Error(message || 'Failed to generate master report')
      }

      const a = document.createElement('a')
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        // Large reports are saved to file storage; the link downloads it
        // (the file is served as an attachment).
        const { url, filename } = await response.json()
        a.href = url
        a.download = filename
      } else {
        const blob = await response.blob()
        a.href = window.URL.createObjectURL(blob)
        a.download = `${eventName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_master_report.pdf`
      }
      document.body.appendChild(a)
      a.click()
      if (a.href.startsWith('blob:')) window.URL.revokeObjectURL(a.href)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Error generating master report:', error)
      alert(`Failed to generate master report: ${error?.message || error}`)
    } finally {
      setIsExportingMaster(false)
    }
  }

  return (
    <>
      {isExportingMaster && (
        <div role="alertdialog" aria-modal="true" aria-live="polite">
          <LoadingScreen message="Building your Master Event Report...">
            <div className="mt-6 max-w-md mx-4 rounded-lg bg-white/10 border border-gold/40 px-5 py-4 text-center">
              <p className="text-white font-semibold">This might take a while.</p>
              <p className="text-white/85 text-sm mt-2">
                We&apos;re gathering every registration, form, certificate, and record for this event into one PDF.
                Please don&apos;t close this tab, refresh, or leave this page until the download starts.
              </p>
              <p className="text-gold text-sm mt-3 tabular-nums">
                Elapsed: {Math.floor(masterElapsed / 60)}:{String(masterElapsed % 60).padStart(2, '0')}
              </p>
            </div>
          </LoadingScreen>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 flex-wrap">
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
          variant="outline"
          className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export All (CSV)'}
        </Button>
        {canViewFinancialReports && (
          <Button
            onClick={handleExportMasterPDF}
            disabled={isExportingMaster}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            title="Full archival PDF: every registration (including cancelled), payment, liability form, safe environment certificate, housing and meal assignment, incident report, survey, and email"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isExportingMaster ? 'Building PDF...' : 'Master Event Report (PDF)'}
          </Button>
        )}
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
