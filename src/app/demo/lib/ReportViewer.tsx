'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Printer } from 'lucide-react'
import {
  FINANCIAL_REPORT,
  REGISTRATIONS_REPORT,
  FORMS_REPORT,
  HOUSING_REPORT,
  MEDICAL_REPORT,
  CERTIFICATES_REPORT,
  CHAPERONES_REPORT,
} from './report-data'

export type ReportId =
  | 'financial'
  | 'registrations'
  | 'forms'
  | 'housing'
  | 'medical'
  | 'certificates'
  | 'chaperones'

const REPORT_TITLES: Record<ReportId, string> = {
  financial: 'Financial Report',
  registrations: 'Registration Report',
  forms: 'Forms Status Report',
  housing: 'Housing Report',
  medical: 'Dietary / Medical Report',
  certificates: 'Safe Environment Certificates',
  chaperones: 'Chaperone Summary Report',
}

interface Props {
  reportId: ReportId | null
  eventName: string
  onClose: () => void
}

export default function ReportViewer({ reportId, eventName, onClose }: Props) {
  const open = reportId !== null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {reportId ? REPORT_TITLES[reportId] : 'Report'}
          </DialogTitle>
          <DialogDescription>
            {eventName} · Generated {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-2">
          <Button
            onClick={() => alert('Demo: Would download this report as CSV.')}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-1" />
            Print
          </Button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {reportId === 'financial' && <FinancialTable />}
          {reportId === 'registrations' && <RegistrationsTable />}
          {reportId === 'forms' && <FormsTable />}
          {reportId === 'housing' && <HousingTable />}
          {reportId === 'medical' && <MedicalTable />}
          {reportId === 'certificates' && <CertificatesTable />}
          {reportId === 'chaperones' && <ChaperonesTable />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 text-xs font-semibold text-navy uppercase tracking-wide">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm ${className}`}>{children}</td>
}

function FinancialTable() {
  const totalRevenue = FINANCIAL_REPORT.reduce((n, r) => n + r.amountPaid, 0)
  const totalBalance = FINANCIAL_REPORT.reduce((n, r) => n + r.balance, 0)
  return (
    <>
      <div className="grid grid-cols-3 gap-4 p-4 bg-[#F5F1E8]">
        <Stat label="Total revenue" value={`$${totalRevenue.toLocaleString()}`} accent="text-emerald-700" />
        <Stat label="Outstanding balance" value={`$${totalBalance.toLocaleString()}`} accent="text-amber-700" />
        <Stat label="Groups" value={String(FINANCIAL_REPORT.length)} />
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <Th>Group</Th>
            <Th>Participants</Th>
            <Th>Total</Th>
            <Th>Paid</Th>
            <Th>Balance</Th>
            <Th>Status</Th>
            <Th>Last payment</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {FINANCIAL_REPORT.map((r) => (
            <tr key={r.group}>
              <Td>{r.group}</Td>
              <Td>{r.participants}</Td>
              <Td>${r.totalAmount.toLocaleString()}</Td>
              <Td>${r.amountPaid.toLocaleString()}</Td>
              <Td>{r.balance > 0 ? <span className="text-amber-700">${r.balance.toLocaleString()}</span> : <span className="text-emerald-700">—</span>}</Td>
              <Td>
                <Badge className={r.status === 'paid_full' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                  {r.status === 'paid_full' ? 'Paid' : 'Partial'}
                </Badge>
              </Td>
              <Td>{r.lastPayment}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function RegistrationsTable() {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <Th>Name</Th>
          <Th>Age</Th>
          <Th>Role</Th>
          <Th>Group</Th>
          <Th>Email</Th>
          <Th>Phone</Th>
          <Th>Registered</Th>
          <Th>Paid</Th>
          <Th>Waiver</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {REGISTRATIONS_REPORT.map((r) => (
          <tr key={r.name}>
            <Td>{r.name}</Td>
            <Td>{r.age} {r.gender}</Td>
            <Td className="capitalize">{r.role}</Td>
            <Td>{r.group}</Td>
            <Td className="text-xs">{r.email}</Td>
            <Td className="text-xs">{r.phone}</Td>
            <Td className="text-xs">{r.registered}</Td>
            <Td>{r.paid ? '✓' : '—'}</Td>
            <Td>{r.waiver ? '✓' : <span className="text-amber-700">Pending</span>}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FormsTable() {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <Th>Name</Th>
          <Th>Group</Th>
          <Th>Role</Th>
          <Th>Form type</Th>
          <Th>Status</Th>
          <Th>Signed at</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {FORMS_REPORT.map((r) => (
          <tr key={r.name}>
            <Td>{r.name}</Td>
            <Td>{r.group}</Td>
            <Td className="capitalize">{r.role}</Td>
            <Td>{r.formType}</Td>
            <Td>
              <Badge className={r.status === 'Signed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                {r.status}
              </Badge>
            </Td>
            <Td>{r.signedAt || '—'}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function HousingTable() {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <Th>Building</Th>
          <Th>Room</Th>
          <Th>Gender</Th>
          <Th>Occupants</Th>
          <Th>Capacity</Th>
          <Th>Group</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {HOUSING_REPORT.map((r) => (
          <tr key={`${r.building}-${r.room}`}>
            <Td>{r.building}</Td>
            <Td>{r.room}</Td>
            <Td>{r.gender}</Td>
            <Td>{r.occupants.join(', ')}</Td>
            <Td>{r.occupants.length} / {r.capacity}</Td>
            <Td>{r.group}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MedicalTable() {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <Th>Name</Th>
          <Th>Group</Th>
          <Th>Allergies</Th>
          <Th>Medications</Th>
          <Th>Dietary</Th>
          <Th>Notes</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {MEDICAL_REPORT.map((r) => (
          <tr key={r.name}>
            <Td>{r.name}</Td>
            <Td>{r.group}</Td>
            <Td>{r.allergies !== 'None' ? <span className="text-red-700 font-medium">{r.allergies}</span> : 'None'}</Td>
            <Td>{r.medications !== 'None' ? <span className="text-red-700 font-medium">{r.medications}</span> : 'None'}</Td>
            <Td>{r.dietary}</Td>
            <Td className="text-xs">{r.notes}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CertificatesTable() {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <Th>Chaperone</Th>
          <Th>Group</Th>
          <Th>Status</Th>
          <Th>Uploaded</Th>
          <Th>Expires</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {CERTIFICATES_REPORT.map((r) => (
          <tr key={r.chaperone}>
            <Td>{r.chaperone}</Td>
            <Td>{r.group}</Td>
            <Td>
              <Badge className={r.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                {r.status}
              </Badge>
            </Td>
            <Td>{r.uploaded}</Td>
            <Td>{r.expires || '—'}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ChaperonesTable() {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <Th>Group</Th>
          <Th>Youth</Th>
          <Th>Chaperones</Th>
          <Th>Ratio</Th>
          <Th>Target</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {CHAPERONES_REPORT.map((r) => (
          <tr key={r.group}>
            <Td>{r.group}</Td>
            <Td>{r.youthCount}</Td>
            <Td>{r.chaperoneCount}</Td>
            <Td>{r.ratio}</Td>
            <Td>{r.target}</Td>
            <Td>
              <Badge className={r.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                {r.ok ? 'OK' : 'Under-staffed'}
              </Badge>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-navy'}`}>{value}</p>
    </div>
  )
}
