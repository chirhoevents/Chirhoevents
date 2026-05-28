/**
 * CSV generation utility for reports
 */

export function generateCSV(data: any[], headers: string[]): string {
  const csvRows: string[] = []

  // Add header row
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

export function generateFinancialCSV(reportData: any): string {
  const dollars = (v: any) => `$${Number(v || 0).toFixed(2)}`
  const sections: string[] = []

  // ── Summary ────────────────────────────────────────────────
  const summaryRows: any[] = [
    { Section: 'Summary', Metric: 'Total Revenue', Value: dollars(reportData.totalRevenue) },
    {
      Section: 'Summary',
      Metric: 'Settled Payments',
      Value: dollars(reportData.actualAmountPaid ?? reportData.amountPaid),
    },
    {
      Section: 'Summary',
      Metric: 'PaymentBalance Amount Paid',
      Value: dollars(reportData.amountPaid),
    },
    { Section: 'Summary', Metric: 'Balance Due', Value: dollars(reportData.balanceDue) },
    {
      Section: 'Summary',
      Metric: 'Overdue Balance',
      Value: dollars(reportData.overdueBalance),
    },
    {
      Section: 'Summary',
      Metric: 'Reconciliation Mismatch',
      Value: reportData.paymentMismatch ? 'YES' : 'NO',
    },
  ]

  // Payment methods
  const pm = reportData.paymentMethods || {}
  summaryRows.push(
    { Section: 'Payments Received', Metric: 'Stripe/Card', Value: dollars(pm.stripe) },
    { Section: 'Payments Received', Metric: 'Check', Value: dollars(pm.check) },
    { Section: 'Payments Received', Metric: 'Cash', Value: dollars(pm.cash) },
    { Section: 'Payments Received', Metric: 'Other', Value: dollars(pm.other) }
  )

  // Expected (pending intents — NOT received)
  const ep = reportData.expectedPayments || {}
  if (Number(ep.total || 0) > 0) {
    summaryRows.push(
      {
        Section: 'Expected Payments (NOT received)',
        Metric: 'Check (awaiting receipt)',
        Value: dollars(ep.check),
      },
      {
        Section: 'Expected Payments (NOT received)',
        Metric: 'Credit Card (unfinished)',
        Value: dollars(ep.stripe),
      },
      {
        Section: 'Expected Payments (NOT received)',
        Metric: 'Other',
        Value: dollars(ep.other),
      },
      {
        Section: 'Expected Payments (NOT received)',
        Metric: 'Total Expected',
        Value: dollars(ep.total),
      }
    )
  }

  // By participant type
  Object.entries(reportData.byParticipantType || {}).forEach(([type, data]: [string, any]) => {
    summaryRows.push({
      Section: 'By Participant Type',
      Metric: type.replace(/_/g, ' '),
      Value: dollars(data.revenue),
      Count: data.count,
      Average: dollars(data.avg),
    })
  })

  // By housing type
  const bh = reportData.byHousingType || {}
  summaryRows.push(
    {
      Section: 'By Housing Type',
      Metric: 'On-Campus',
      Value: dollars(bh.onCampus?.revenue),
      Count: bh.onCampus?.count,
    },
    {
      Section: 'By Housing Type',
      Metric: 'Off-Campus',
      Value: dollars(bh.offCampus?.revenue),
      Count: bh.offCampus?.count,
    },
    {
      Section: 'By Housing Type',
      Metric: 'Day Pass',
      Value: dollars(bh.dayPass?.revenue),
      Count: bh.dayPass?.count,
    }
  )

  // By registration type
  const br = reportData.byRegistrationType || {}
  summaryRows.push(
    { Section: 'By Registration Type', Metric: 'Group', Value: dollars(br.group) },
    { Section: 'By Registration Type', Metric: 'Individual', Value: dollars(br.individual) }
  )

  sections.push(generateCSV(summaryRows, ['Section', 'Metric', 'Value', 'Count', 'Average']))

  // ── Expected Payments (intents, not received) ─────────────
  if (
    Array.isArray(reportData.expectedPayments?.details) &&
    reportData.expectedPayments.details.length > 0
  ) {
    const expRows = reportData.expectedPayments.details.map((e: any) => ({
      Created: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
      Payer: e.payer,
      'Registration Type': e.registrationType,
      'Intended Method': e.paymentMethod,
      'Check Number': e.checkNumber || '',
      'Payment Type': e.paymentType,
      Amount: dollars(e.amount),
    }))
    sections.push(
      '\n\nExpected Payments (NOT received)\n' +
        generateCSV(expRows, [
          'Created',
          'Payer',
          'Registration Type',
          'Intended Method',
          'Check Number',
          'Payment Type',
          'Amount',
        ])
    )
  }

  // ── Transactions ────────────────────────────────────────────
  if (Array.isArray(reportData.transactions) && reportData.transactions.length > 0) {
    const txRows = reportData.transactions.map((t: any) => ({
      Date: t.processedAt ? new Date(t.processedAt).toLocaleDateString() : '',
      Payer: t.payer,
      'Registration Type': t.registrationType,
      Method: t.paymentMethod,
      'Card Brand': t.cardBrand || '',
      'Card Last4': t.cardLast4 || '',
      'Check Number': t.checkNumber || '',
      'Payment Type': t.paymentType,
      Status: t.paymentStatus,
      Amount: dollars(t.amount),
      Notes: t.notes || '',
    }))
    sections.push(
      '\n\nTransactions\n' +
        generateCSV(txRows, [
          'Date',
          'Payer',
          'Registration Type',
          'Method',
          'Card Brand',
          'Card Last4',
          'Check Number',
          'Payment Type',
          'Status',
          'Amount',
          'Notes',
        ])
    )
  }

  // ── Balances by Registration ───────────────────────────────
  if (
    Array.isArray(reportData.balancesByRegistration) &&
    reportData.balancesByRegistration.length > 0
  ) {
    const balRows = reportData.balancesByRegistration.map((b: any) => ({
      Payer: b.payer,
      'Registration Type': b.registrationType,
      Status: b.paymentStatus,
      Invoiced: dollars(b.totalAmountDue),
      Paid: dollars(b.amountPaid),
      Balance: dollars(b.amountRemaining),
      'Last Payment Date': b.lastPaymentDate
        ? new Date(b.lastPaymentDate).toLocaleDateString()
        : '',
    }))
    sections.push(
      '\n\nBalance by Registration\n' +
        generateCSV(balRows, [
          'Payer',
          'Registration Type',
          'Status',
          'Invoiced',
          'Paid',
          'Balance',
          'Last Payment Date',
        ])
    )
  }

  // ── Refunds ─────────────────────────────────────────────────
  if (
    Array.isArray(reportData.refunds?.details) &&
    reportData.refunds.details.length > 0
  ) {
    const refundRows = reportData.refunds.details.map((r: any) => ({
      Date: r.processedAt ? new Date(r.processedAt).toLocaleDateString() : '',
      Payer: r.payer,
      'Registration Type': r.registrationType,
      Reason: r.refundReason,
      Method: r.refundMethod || '',
      Status: r.refundStatus || '',
      Amount: `-${dollars(r.refundAmount)}`,
    }))
    sections.push(
      '\n\nRefunds\n' +
        generateCSV(refundRows, [
          'Date',
          'Payer',
          'Registration Type',
          'Reason',
          'Method',
          'Status',
          'Amount',
        ])
    )
  }

  return sections.join('\n')
}

export function generateRegistrationCSV(reportData: any): string {
  const sections: string[] = []
  const summaryRows: any[] = []

  summaryRows.push({ Metric: 'Total Registrations', Value: reportData.totalRegistrations })
  summaryRows.push({ Metric: 'Group Registrations', Value: reportData.groupCount })
  summaryRows.push({
    Metric: 'Group Participants',
    Value: reportData.groupParticipants ?? '',
  })
  summaryRows.push({ Metric: 'Individual Registrations', Value: reportData.individualCount })
  summaryRows.push({
    Metric: 'Average Group Size',
    Value:
      typeof reportData.avgGroupSize === 'number'
        ? reportData.avgGroupSize.toFixed(1)
        : reportData.avgGroupSize,
  })

  Object.entries(reportData.demographics || {}).forEach(([type, data]: [string, any]) => {
    summaryRows.push({ Metric: `${type.replace(/_/g, ' ')} - Total`, Value: data.total })
    summaryRows.push({ Metric: `${type.replace(/_/g, ' ')} - Male`, Value: data.male })
    summaryRows.push({ Metric: `${type.replace(/_/g, ' ')} - Female`, Value: data.female })
  })

  Object.entries(reportData.housingBreakdown || {}).forEach(([type, count]: [string, any]) => {
    summaryRows.push({ Metric: `Housing - ${type.replace(/_/g, ' ')}`, Value: count })
  })

  sections.push(generateCSV(summaryRows, ['Metric', 'Value']))

  // Roster — one row per registered person
  if (Array.isArray(reportData.roster) && reportData.roster.length > 0) {
    const rosterRows = reportData.roster.map((p: any) => ({
      Name: p.name,
      Type: p.participantType || p.displayType || '',
      Age: p.age ?? '',
      Gender: p.gender || '',
      Group: p.group || '',
      'Registration Type': p.registrationType || '',
      Housing: p.housingType || '',
    }))
    sections.push(
      '\n\nRoster\n' +
        generateCSV(rosterRows, [
          'Name',
          'Type',
          'Age',
          'Gender',
          'Group',
          'Registration Type',
          'Housing',
        ])
    )
  }

  return sections.join('\n')
}

export function generateFormsCSV(reportData: any): string {
  const rows: any[] = []

  rows.push({
    Metric: 'Forms Required',
    Value: reportData.formsRequired,
  })
  rows.push({
    Metric: 'Forms Completed',
    Value: reportData.formsCompleted,
  })
  rows.push({
    Metric: 'Forms Pending',
    Value: reportData.formsPending,
  })
  rows.push({
    Metric: 'Completion Rate',
    Value: `${reportData.completionRate}%`,
  })

  return generateCSV(rows, ['Metric', 'Value'])
}

export function generateHousingCSV(reportData: any): string {
  const rows: any[] = []

  rows.push({
    'Housing Type': 'On-Campus',
    Count: reportData.onCampus,
    Percentage: `${Math.round((reportData.onCampus / reportData.total) * 100)}%`,
  })
  rows.push({
    'Housing Type': 'Off-Campus',
    Count: reportData.offCampus,
    Percentage: `${Math.round((reportData.offCampus / reportData.total) * 100)}%`,
  })
  rows.push({
    'Housing Type': 'Day Pass',
    Count: reportData.dayPass,
    Percentage: `${Math.round((reportData.dayPass / reportData.total) * 100)}%`,
  })

  return generateCSV(rows, ['Housing Type', 'Count', 'Percentage'])
}

export function generateMedicalCSV(reportData: any, options?: { allergiesOnly?: boolean }): string {
  const headers = [
    'Name',
    'Age',
    'Group',
    'Allergies',
    'Allergy Severity',
    'Allergy Notes',
    'Dietary Restrictions',
    'Dietary Notes',
    'Medical Conditions',
    'Medical Notes',
    'Medications',
    'Medication Notes',
    'ADA Accommodations',
    'Group Leader Email',
    'Group Leader Phone',
  ]

  // Show detected keywords if available, otherwise fall back to raw text.
  // Never export "See notes" — show the actual data instead.
  const formatItems = (items: string[] | undefined, fullText: string | undefined): string => {
    const filtered = (items || []).filter(i => i && i !== 'See notes')
    if (filtered.length > 0) return filtered.join(', ')
    if (fullText) return fullText
    return ''
  }

  // Consolidate all details by student name so each student appears once
  const studentMap = new Map<string, any>()

  const getOrCreate = (detail: any) => {
    const key = detail.name
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        Name: detail.name,
        Age: detail.age || '',
        Group: detail.group || 'Individual',
        Allergies: '',
        'Allergy Severity': '',
        'Allergy Notes': '',
        'Dietary Restrictions': '',
        'Dietary Notes': '',
        'Medical Conditions': '',
        'Medical Notes': '',
        Medications: '',
        'Medication Notes': '',
        'ADA Accommodations': '',
        'Group Leader Email': detail.groupLeaderEmail || '',
        'Group Leader Phone': detail.groupLeaderPhone || '',
      })
    }
    return studentMap.get(key)!
  }

  // Food allergies
  if (reportData.foodAllergies?.details) {
    for (const detail of reportData.foodAllergies.details) {
      const student = getOrCreate(detail)
      student.Allergies = formatItems(detail.allergies, detail.fullText)
      student['Allergy Severity'] = detail.severity || ''
      student['Allergy Notes'] = detail.fullText || ''
      if (detail.groupLeaderEmail) student['Group Leader Email'] = detail.groupLeaderEmail
      if (detail.groupLeaderPhone) student['Group Leader Phone'] = detail.groupLeaderPhone
    }
  }

  // Dietary restrictions
  if (reportData.dietaryRestrictions?.details) {
    for (const detail of reportData.dietaryRestrictions.details) {
      const student = getOrCreate(detail)
      student['Dietary Restrictions'] = formatItems(detail.restrictions, detail.fullText)
      student['Dietary Notes'] = detail.fullText || ''
    }
  }

  // Medical conditions
  if (reportData.medicalConditions?.details) {
    for (const detail of reportData.medicalConditions.details) {
      const student = getOrCreate(detail)
      student['Medical Conditions'] = formatItems(detail.conditions, detail.fullText)
      student['Medical Notes'] = detail.fullText || ''
      if (detail.groupLeaderEmail) student['Group Leader Email'] = detail.groupLeaderEmail
      if (detail.groupLeaderPhone) student['Group Leader Phone'] = detail.groupLeaderPhone
    }
  }

  // Medications
  if (reportData.medications?.details) {
    for (const detail of reportData.medications.details) {
      const student = getOrCreate(detail)
      student.Medications = formatItems(detail.medications, detail.fullText)
      student['Medication Notes'] = detail.fullText || ''
      if (detail.groupLeaderEmail) student['Group Leader Email'] = detail.groupLeaderEmail
      if (detail.groupLeaderPhone) student['Group Leader Phone'] = detail.groupLeaderPhone
    }
  }

  // ADA accommodations
  if (reportData.ada?.details) {
    for (const detail of reportData.ada.details) {
      const student = getOrCreate(detail)
      student['ADA Accommodations'] = detail.accommodations || ''
      if (detail.groupLeaderEmail) student['Group Leader Email'] = detail.groupLeaderEmail
    }
  }

  // Sort: SEVERE first, then alphabetical by name
  let rows = Array.from(studentMap.values()).sort((a: any, b: any) => {
    if (a['Allergy Severity'] === 'SEVERE' && b['Allergy Severity'] !== 'SEVERE') return -1
    if (a['Allergy Severity'] !== 'SEVERE' && b['Allergy Severity'] === 'SEVERE') return 1
    return a.Name.localeCompare(b.Name)
  })

  // Apply allergiesOnly filter if requested
  if (options?.allergiesOnly) {
    rows = rows.filter((r: any) => r.Allergies !== '')
  }

  return generateCSV(rows, headers)
}

export function generateCertificatesCSV(reportData: any): string {
  const rows: any[] = []

  rows.push({
    Metric: 'Total Required',
    Value: reportData.required,
  })
  rows.push({
    Metric: 'Uploaded',
    Value: reportData.uploaded,
  })
  rows.push({
    Metric: 'Verified',
    Value: reportData.verified,
  })
  rows.push({
    Metric: 'Missing',
    Value: reportData.missing,
  })

  // Missing list
  if (reportData.missingList) {
    reportData.missingList.forEach((person: any) => {
      rows.push({
        Metric: 'Missing Certificate',
        Value: `${person.name} (${person.group})`,
      })
    })
  }

  return generateCSV(rows, ['Metric', 'Value'])
}

export function generateVendorCSV(reportData: any): string {
  // Generate detailed vendor list CSV
  if (reportData.vendorList && reportData.vendorList.length > 0) {
    const headers = [
      'Business Name',
      'Contact Name',
      'Email',
      'Phone',
      'Booth Tier',
      'Status',
      'Payment Status',
      'Invoice Total',
      'Amount Paid',
      'Balance Due',
      'Vendor Code',
      'Booth Staff Count',
      'Created Date',
    ]

    const rows = reportData.vendorList.map((vendor: any) => ({
      'Business Name': vendor.businessName,
      'Contact Name': vendor.contactName,
      'Email': vendor.email,
      'Phone': vendor.phone,
      'Booth Tier': vendor.selectedTier,
      'Status': vendor.status,
      'Payment Status': vendor.paymentStatus,
      'Invoice Total': `$${vendor.invoiceTotal.toFixed(2)}`,
      'Amount Paid': `$${vendor.amountPaid.toFixed(2)}`,
      'Balance Due': `$${vendor.balance.toFixed(2)}`,
      'Vendor Code': vendor.vendorCode,
      'Booth Staff Count': vendor.boothStaffCount,
      'Created Date': new Date(vendor.createdAt).toLocaleDateString(),
    }))

    return generateCSV(rows, headers)
  }

  // Fallback to summary CSV
  const summaryRows: any[] = [
    { Metric: 'Total Vendors', Value: reportData.totalVendors },
    { Metric: 'Approved', Value: reportData.approvedVendors },
    { Metric: 'Pending', Value: reportData.pendingVendors },
    { Metric: 'Rejected', Value: reportData.rejectedVendors },
    { Metric: 'Total Invoiced', Value: `$${reportData.totalInvoiced.toFixed(2)}` },
    { Metric: 'Total Paid', Value: `$${reportData.totalPaid.toFixed(2)}` },
    { Metric: 'Total Balance', Value: `$${reportData.totalBalance.toFixed(2)}` },
    { Metric: 'Total Booth Staff', Value: reportData.totalBoothStaff },
  ]

  return generateCSV(summaryRows, ['Metric', 'Value'])
}

export function generateStaffCSV(reportData: any): string {
  // Generate detailed staff list CSV
  if (reportData.staffList && reportData.staffList.length > 0) {
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Role',
      'Type',
      'Vendor Business',
      'T-Shirt Size',
      'Dietary Restrictions',
      'Allergies',
      'Medical Conditions',
      'Medications',
      'ADA Accommodations',
      'Price Paid',
      'Payment Status',
      'Checked In',
      'Liability Form',
      'Created Date',
    ]

    const rows = reportData.staffList.map((staff: any) => ({
      'First Name': staff.firstName,
      'Last Name': staff.lastName,
      'Email': staff.email,
      'Phone': staff.phone,
      'Role': staff.role,
      'Type': staff.isVendorStaff ? 'Vendor Staff' : 'Volunteer',
      'Vendor Business': staff.vendorBusinessName || '',
      'T-Shirt Size': staff.tshirtSize,
      'Dietary Restrictions': staff.dietaryRestrictions || '',
      'Allergies': staff.allergies || '',
      'Medical Conditions': staff.medicalConditions || '',
      'Medications': staff.medications || '',
      'ADA Accommodations': staff.adaAccommodations || '',
      'Price Paid': `$${staff.pricePaid.toFixed(2)}`,
      'Payment Status': staff.paymentStatus,
      'Checked In': staff.checkedIn ? 'Yes' : 'No',
      'Liability Form': staff.liabilityFormCompleted ? 'Completed' : (staff.porosAccessCode ? 'Pending' : 'N/A'),
      'Created Date': new Date(staff.createdAt).toLocaleDateString(),
    }))

    return generateCSV(rows, headers)
  }

  // Fallback to summary CSV
  const summaryRows: any[] = [
    { Metric: 'Total Staff', Value: reportData.totalStaff },
    { Metric: 'Volunteers', Value: reportData.volunteerStaff },
    { Metric: 'Vendor Staff', Value: reportData.vendorStaff },
    { Metric: 'Checked In', Value: reportData.checkedInStaff },
    { Metric: 'Forms Completed', Value: reportData.formsCompleted },
    { Metric: 'Total Revenue', Value: `$${reportData.totalRevenue.toFixed(2)}` },
  ]

  return generateCSV(summaryRows, ['Metric', 'Value'])
}

export function generateRoomAllocationsCSV(reportData: any): string {
  const headers = [
    'Building',
    'Room Number',
    'Floor',
    'Room Purpose',
    'Room Type',
    'Gender',
    'Housing Type',
    'Capacity',
    'Beds',
    'Current Occupancy',
    'Available',
    'ADA Accessible',
    'Allocated Group',
    'Group Parish',
    'Group Participant Count',
    'Assigned Groups (Small Group Rooms)',
    'Assigned Groups Count',
    'Small Groups',
    'Assigned People',
    'Notes',
  ]

  const rows = reportData.rooms.map((room: any) => {
    // Format assigned people as a list
    const assignedPeopleStr = room.assignedPeople && room.assignedPeople.length > 0
      ? room.assignedPeople
          .map((p: any) => {
            const bedInfo = p.bedNumber ? ` [Bed ${p.bedNumber}]` : ''
            const groupInfo = p.groupName ? ` (${p.groupName})` : ''
            return `${p.name}${bedInfo}${groupInfo}`
          })
          .join('; ')
      : ''

    // Format small groups
    const smallGroupsStr = room.smallGroups && room.smallGroups.length > 0
      ? room.smallGroups
          .map((sg: any) => {
            const sglInfo = sg.sglName ? ` - SGL: ${sg.sglName}` : ''
            return `${sg.name} (${sg.currentSize}/${sg.capacity})${sglInfo}`
          })
          .join('; ')
      : ''

    // Format assigned groups (groups assigned to small group rooms)
    const assignedGroupsStr = room.assignedGroups && room.assignedGroups.length > 0
      ? room.assignedGroups
          .map((g: any) => {
            const parishInfo = g.parishName ? ` - ${g.parishName}` : ''
            const dioceseInfo = g.dioceseName ? ` (${g.dioceseName})` : ''
            return `${g.groupName}${parishInfo}${dioceseInfo} [${g.actualParticipantCount} participants]`
          })
          .join('; ')
      : ''

    return {
      'Building': room.buildingName,
      'Room Number': room.roomNumber,
      'Floor': room.floor,
      'Room Purpose': room.roomPurpose?.replace(/_/g, ' ') || '',
      'Room Type': room.roomType?.replace(/_/g, ' ') || '',
      'Gender': room.gender || room.buildingGender || '',
      'Housing Type': room.housingType?.replace(/_/g, ' ') || room.buildingHousingType?.replace(/_/g, ' ') || '',
      'Capacity': room.capacity,
      'Beds': room.bedCount,
      'Current Occupancy': room.currentOccupancy,
      'Available': room.availableBeds,
      'ADA Accessible': room.isAdaAccessible ? 'Yes' : 'No',
      'Allocated Group': room.allocatedGroup?.groupName || '',
      'Group Parish': room.allocatedGroup?.parishName || '',
      'Group Participant Count': room.allocatedGroup?.participantCount || '',
      'Assigned Groups (Small Group Rooms)': assignedGroupsStr,
      'Assigned Groups Count': room.assignedGroups?.length || 0,
      'Small Groups': smallGroupsStr,
      'Assigned People': assignedPeopleStr,
      'Notes': room.notes || '',
    }
  })

  return generateCSV(rows, headers)
}
