'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import ReportCard from '@/components/admin/reports/ReportCard'
import FinancialReportModal from '@/components/admin/reports/FinancialReportModal'
import RegistrationReportModal from '@/components/admin/reports/RegistrationReportModal'
import FormsReportModal from '@/components/admin/reports/FormsReportModal'
import HousingReportModal from '@/components/admin/reports/HousingReportModal'
import MedicalReportModal from '@/components/admin/reports/MedicalReportModal'
import CertificatesReportModal from '@/components/admin/reports/CertificatesReportModal'

interface ReportsClientProps {
  eventId: string
  eventName: string
  startDate: string
  endDate: string
}

export default function ReportsClient({
  eventId,
  eventName,
  startDate,
  endDate,
}: ReportsClientProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

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
      {/* Export All Button */}
      <div className="flex justify-end">
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
        <ReportCard
          title="Financial Report"
          reportType="financial"
          eventId={eventId}
          onViewReport={() => setActiveModal('financial')}
        />

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
      </div>

      {/* Report Modals */}
      <FinancialReportModal
        isOpen={activeModal === 'financial'}
        onClose={() => setActiveModal(null)}
        eventId={eventId}
        eventName={eventName}
      />

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
    </>
  )
}
