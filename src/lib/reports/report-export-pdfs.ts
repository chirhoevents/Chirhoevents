/**
 * Real PDF exports for the reports whose "PDF" button used to download
 * plain text (forms, certificates, housing, staff, vendors, rooms).
 * Each takes the same JSON its report endpoint returns.
 */

import { generateTableReportPDF, type TableReportSection } from './generate-table-report-pdf'

function num(v: any): number {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

function txt(v: any, fallback = ''): string {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function money(v: any): string {
  return `$${num(v).toFixed(2)}`
}

function pct(n: any, total: any): string {
  const t = num(total)
  return t > 0 ? `${Math.round((num(n) / t) * 100)}%` : '0%'
}

function humanize(v: any): string {
  return txt(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function countTable(title: string, label: string, counts: Record<string, any> | undefined): TableReportSection | null {
  const entries = Object.entries(counts || {})
  if (entries.length === 0) return null
  const total = entries.reduce((s, [, c]) => s + num(c), 0)
  return {
    title,
    columns: [
      { label, weight: 3 },
      { label: 'Count', weight: 1, align: 'right' },
      { label: '%', weight: 1, align: 'right' },
    ],
    rows: entries
      .sort((a, b) => num(b[1]) - num(a[1]))
      .map(([k, c]) => [humanize(k), String(num(c)), pct(c, total)]),
  }
}

function compact(sections: Array<TableReportSection | null>): TableReportSection[] {
  return sections.filter((s): s is TableReportSection => s !== null)
}

// ============================================================
// Forms Status
// ============================================================
export function generateFormsReportPDF(data: any, eventName: string): Promise<Buffer> {
  const byType = Object.entries(data?.byParticipantType || {}) as Array<[string, any]>
  const pendingByGroup = (data?.pendingByGroup || []) as any[]
  const certs = data?.certificates

  return generateTableReportPDF({
    title: 'Forms Status Report',
    eventName,
    sections: compact([
      {
        title: 'Summary',
        summary: [
          ['Forms Required', String(num(data?.formsRequired))],
          ['Forms Completed', String(num(data?.formsCompleted))],
          ['Forms Pending', String(num(data?.formsPending))],
          ['Completion Rate', `${num(data?.completionRate)}%`],
        ],
      },
      byType.length > 0
        ? {
            title: 'By Participant Type',
            columns: [
              { label: 'Participant Type', weight: 3 },
              { label: 'Total', weight: 1, align: 'right' },
              { label: 'Completed', weight: 1, align: 'right' },
              { label: 'Pending', weight: 1, align: 'right' },
              { label: 'Rate', weight: 1, align: 'right' },
            ],
            rows: byType.map(([type, s]) => [
              humanize(type),
              String(num(s?.total)),
              String(num(s?.completed)),
              String(num(s?.total) - num(s?.completed)),
              pct(s?.completed, s?.total),
            ]),
          }
        : null,
      {
        title: 'Groups With Pending Forms',
        columns: [
          { label: 'Group', weight: 4 },
          { label: 'Total', weight: 1, align: 'right' },
          { label: 'Completed', weight: 1, align: 'right' },
          { label: 'Pending', weight: 1, align: 'right' },
        ],
        rows: pendingByGroup.map(g => [
          txt(g.name, 'Unknown'),
          String(num(g.total)),
          String(num(g.completed)),
          String(num(g.pending)),
        ]),
        emptyText: 'No groups have pending forms.',
      },
      certs
        ? {
            title: 'Safe Environment Certificates',
            summary: [
              ['Required', String(num(certs.required))],
              ['Uploaded', `${num(certs.uploaded)} (${num(certs.uploadRate)}%)`],
              ['Verified', `${num(certs.verified)} (${num(certs.verifyRate)}%)`],
              ['Missing', String(num(certs.missing))],
            ],
          }
        : null,
    ]),
  })
}

// ============================================================
// Safe Environment Certificates
// ============================================================
export function generateCertificatesReportPDF(data: any, eventName: string): Promise<Buffer> {
  return generateTableReportPDF({
    title: 'Safe Environment Certificates',
    eventName,
    sections: compact([
      {
        title: 'Summary',
        summary: [
          ['Total Required', String(num(data?.required))],
          ['Uploaded', `${num(data?.uploaded)} (${num(data?.uploadRate)}%)`],
          ['Verified', `${num(data?.verified)} (${num(data?.verifyRate)}%)`],
          ['Missing', String(num(data?.missing))],
        ],
      },
      countTable('By Program', 'Program', data?.programs),
      {
        title: 'Pending Verification',
        columns: [
          { label: 'Name', weight: 3 },
          { label: 'Uploaded', weight: 1 },
        ],
        rows: (data?.pending || []).map((p: any) => [txt(p.name), txt(p.uploadedDate)]),
        emptyText: 'No certificates are waiting for verification.',
      },
      {
        title: 'Missing Certificates',
        columns: [
          { label: 'Name', weight: 2 },
          { label: 'Group', weight: 3 },
        ],
        rows: (data?.missingList || []).map((p: any) => [txt(p.name), txt(p.group)]),
        emptyText: 'No certificates are missing.',
      },
    ]),
  })
}

// ============================================================
// Housing
// ============================================================
export function generateHousingReportPDF(data: any, eventName: string): Promise<Buffer> {
  const total = num(data?.total)
  const details = Object.entries(data?.onCampusDetails || {}) as Array<[string, any]>

  return generateTableReportPDF({
    title: 'Housing Report',
    eventName,
    sections: compact([
      {
        title: 'Housing Types',
        columns: [
          { label: 'Housing Type', weight: 3 },
          { label: 'Count', weight: 1, align: 'right' },
          { label: '%', weight: 1, align: 'right' },
        ],
        rows: [
          ['On-Campus', String(num(data?.onCampus)), pct(data?.onCampus, total)],
          ['Off-Campus', String(num(data?.offCampus)), pct(data?.offCampus, total)],
          ['Day Pass', String(num(data?.dayPass)), pct(data?.dayPass, total)],
          ['Total', String(total), total > 0 ? '100%' : '0%'],
        ],
      },
      details.length > 0
        ? {
            title: 'On-Campus by Participant Type',
            columns: [
              { label: 'Participant Type', weight: 3 },
              { label: 'Total', weight: 1, align: 'right' },
              { label: 'Male', weight: 1, align: 'right' },
              { label: 'Female', weight: 1, align: 'right' },
            ],
            rows: details.map(([type, s]) => [
              humanize(type),
              String(num(s?.total)),
              String(num(s?.male)),
              String(num(s?.female)),
            ]),
          }
        : null,
      countTable('Individual Room Types', 'Room Type', data?.roomTypes),
      data?.specialAccommodations
        ? {
            title: 'Special Accommodations',
            summary: [['ADA Accommodations', String(num(data.specialAccommodations.ada))]],
          }
        : null,
    ]),
  })
}

// ============================================================
// Staff & Volunteers
// ============================================================
export function generateStaffReportPDF(data: any, eventName: string): Promise<Buffer> {
  const staff = (data?.staffList || []) as any[]

  return generateTableReportPDF({
    title: 'Staff & Volunteers Report',
    eventName,
    landscape: true,
    sections: compact([
      {
        title: 'Summary',
        summary: [
          ['Total Staff', String(num(data?.totalStaff))],
          ['Volunteers', String(num(data?.volunteerStaff))],
          ['Vendor Staff', String(num(data?.vendorStaff))],
          ['Checked In', String(num(data?.checkedInStaff))],
          ['Forms Completed', String(num(data?.formsCompleted))],
          ['Total Revenue', money(data?.totalRevenue)],
        ],
      },
      countTable('By Role', 'Role', data?.roleBreakdown),
      countTable('T-Shirt Sizes', 'Size', data?.tshirtBreakdown),
      {
        title: 'Staff List',
        columns: [
          { label: 'Name', weight: 3 },
          { label: 'Email', weight: 4 },
          { label: 'Phone', weight: 2.2 },
          { label: 'Role', weight: 3 },
          { label: 'Type', weight: 2.5 },
          { label: 'Shirt', weight: 1.2 },
          { label: 'Paid', weight: 1.5, align: 'right' },
          { label: 'Payment', weight: 1.8 },
          { label: 'Checked In', weight: 2 },
          { label: 'Form', weight: 2 },
        ],
        rows: staff.map(s => [
          `${txt(s.firstName)} ${txt(s.lastName)}`.trim(),
          txt(s.email),
          txt(s.phone),
          humanize(s.role),
          s.isVendorStaff ? `Vendor${s.vendorBusinessName ? ` (${s.vendorBusinessName})` : ''}` : 'Volunteer',
          txt(s.tshirtSize),
          money(s.pricePaid),
          humanize(s.paymentStatus),
          s.checkedIn ? 'Yes' : 'No',
          s.liabilityFormCompleted ? 'Completed' : (s.porosAccessCode ? 'Pending' : 'N/A'),
        ]),
        emptyText: 'No staff registered.',
      },
      (() => {
        const medical = staff.filter(s =>
          s.dietaryRestrictions || s.allergies || s.medicalConditions || s.medications || s.adaAccommodations
        )
        if (medical.length === 0) return null
        return {
          title: 'Dietary, Medical & ADA Notes',
          subtitle: 'Confidential — only staff with something on file are listed.',
          columns: [
            { label: 'Name', weight: 2 },
            { label: 'Dietary', weight: 2 },
            { label: 'Allergies', weight: 2 },
            { label: 'Medical Conditions', weight: 2 },
            { label: 'Medications', weight: 2 },
            { label: 'ADA', weight: 2 },
          ],
          rows: medical.map(s => [
            `${txt(s.firstName)} ${txt(s.lastName)}`.trim(),
            txt(s.dietaryRestrictions),
            txt(s.allergies),
            txt(s.medicalConditions),
            txt(s.medications),
            txt(s.adaAccommodations),
          ]),
        }
      })(),
    ]),
  })
}

// ============================================================
// Vendors
// ============================================================
export function generateVendorReportPDF(data: any, eventName: string): Promise<Buffer> {
  const vendors = (data?.vendorList || []) as any[]

  return generateTableReportPDF({
    title: 'Vendor Report',
    eventName,
    landscape: true,
    sections: compact([
      {
        title: 'Summary',
        summary: [
          ['Total Vendors', String(num(data?.totalVendors))],
          ['Approved', String(num(data?.approvedVendors))],
          ['Pending', String(num(data?.pendingVendors))],
          ['Rejected', String(num(data?.rejectedVendors))],
          ['Total Invoiced', money(data?.totalInvoiced)],
          ['Total Paid', money(data?.totalPaid)],
          ['Total Balance', money(data?.totalBalance)],
          ['Total Booth Staff', String(num(data?.totalBoothStaff))],
        ],
      },
      countTable('By Booth Tier', 'Tier', data?.tierBreakdown),
      {
        title: 'Vendor List',
        columns: [
          { label: 'Business', weight: 3.5 },
          { label: 'Contact', weight: 2.5 },
          { label: 'Email', weight: 4 },
          { label: 'Phone', weight: 2.5 },
          { label: 'Tier', weight: 2 },
          { label: 'Status', weight: 1.8 },
          { label: 'Payment', weight: 1.8 },
          { label: 'Invoiced', weight: 1.8, align: 'right' },
          { label: 'Paid', weight: 1.8, align: 'right' },
          { label: 'Balance', weight: 1.8, align: 'right' },
          { label: 'Staff', weight: 1, align: 'right' },
        ],
        rows: vendors.map(v => [
          txt(v.businessName),
          txt(v.contactName),
          txt(v.email),
          txt(v.phone),
          humanize(v.selectedTier),
          humanize(v.status),
          humanize(v.paymentStatus),
          money(v.invoiceTotal),
          money(v.amountPaid),
          money(v.balance),
          String(num(v.boothStaffCount)),
        ]),
        emptyText: 'No vendors registered.',
      },
    ]),
  })
}

// ============================================================
// Room Allocations
// ============================================================
export function generateRoomAllocationsReportPDF(data: any, eventName: string): Promise<Buffer> {
  const summary = data?.summary || {}
  const rooms = (data?.rooms || []) as any[]
  const buildings = (summary.byBuilding || []) as any[]

  return generateTableReportPDF({
    title: 'Room Allocations Report',
    eventName,
    landscape: true,
    sections: compact([
      {
        title: 'Summary',
        summary: [
          ['Total Rooms', String(num(summary.totalRooms))],
          ['Total Capacity', String(num(summary.totalCapacity))],
          ['Total Occupied', String(num(summary.totalOccupied))],
          ['Available', String(num(summary.totalCapacity) - num(summary.totalOccupied))],
          ['Rooms with Groups', String(num(summary.roomsWithGroups))],
          ['Housing Rooms', String(num(summary.housingRooms))],
          ['Small Group Rooms', String(num(summary.smallGroupRooms))],
        ],
      },
      buildings.length > 0
        ? {
            title: 'By Building',
            columns: [
              { label: 'Building', weight: 3 },
              { label: 'Gender', weight: 1.5 },
              { label: 'Housing Type', weight: 2 },
              { label: 'Rooms', weight: 1, align: 'right' },
              { label: 'Capacity', weight: 1, align: 'right' },
              { label: 'Occupied', weight: 1, align: 'right' },
            ],
            rows: buildings.map(b => [
              txt(b.buildingName),
              humanize(b.gender),
              humanize(b.housingType),
              String(num(b.totalRooms)),
              String(num(b.totalCapacity)),
              String(num(b.totalOccupied)),
            ]),
          }
        : null,
      {
        title: 'Rooms',
        columns: [
          { label: 'Building', weight: 2.2 },
          { label: 'Room', weight: 1.2 },
          { label: 'Floor', weight: 1.1 },
          { label: 'Purpose', weight: 1.6 },
          { label: 'Gender', weight: 1.3 },
          { label: 'Cap.', weight: 0.9, align: 'right' },
          { label: 'Occ.', weight: 0.9, align: 'right' },
          { label: 'ADA', weight: 1 },
          { label: 'Group(s)', weight: 3.5 },
          { label: 'Assigned People', weight: 5.5 },
        ],
        rows: rooms.map(r => {
          const groups: string[] = []
          if (r.allocatedGroup?.groupName) {
            groups.push(
              `${r.allocatedGroup.groupName}${r.allocatedGroup.parishName ? ` - ${r.allocatedGroup.parishName}` : ''}`
            )
          }
          for (const g of r.assignedGroups || []) {
            groups.push(`${txt(g.groupName)}${g.parishName ? ` - ${g.parishName}` : ''}`)
          }
          for (const sg of r.smallGroups || []) {
            groups.push(`Small group: ${txt(sg.name)}${sg.sglName ? ` (SGL: ${sg.sglName})` : ''}`)
          }
          const people = (r.assignedPeople || [])
            .map((p: any) => `${txt(p.name)}${p.bedNumber ? ` [Bed ${p.bedNumber}]` : ''}`)
            .join(', ')
          return [
            txt(r.buildingName),
            txt(r.roomNumber),
            txt(r.floor),
            humanize(r.roomPurpose),
            humanize(r.gender || r.buildingGender),
            String(num(r.capacity)),
            String(num(r.currentOccupancy)),
            r.isAdaAccessible ? 'Yes' : '',
            groups.join('; '),
            people + (r.notes ? `${people ? '\n' : ''}Notes: ${r.notes}` : ''),
          ]
        }),
        emptyText: 'No rooms found.',
      },
    ]),
  })
}
