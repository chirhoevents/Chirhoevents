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
  const rows: any[] = []

  // Summary section
  rows.push({
    Section: 'Summary',
    Metric: 'Total Revenue',
    Value: `$${reportData.totalRevenue.toFixed(2)}`,
  })
  rows.push({
    Section: 'Summary',
    Metric: 'Amount Paid',
    Value: `$${reportData.amountPaid.toFixed(2)}`,
  })
  rows.push({
    Section: 'Summary',
    Metric: 'Balance Due',
    Value: `$${reportData.balanceDue.toFixed(2)}`,
  })

  // Payment methods
  rows.push({
    Section: 'Payment Methods',
    Metric: 'Stripe/Card',
    Value: `$${reportData.paymentMethods.stripe.toFixed(2)}`,
  })
  rows.push({
    Section: 'Payment Methods',
    Metric: 'Check',
    Value: `$${reportData.paymentMethods.check.toFixed(2)}`,
  })

  // By participant type
  Object.entries(reportData.byParticipantType).forEach(([type, data]: [string, any]) => {
    rows.push({
      Section: 'By Participant Type',
      Metric: type.replace(/_/g, ' '),
      Value: `$${data.revenue.toFixed(2)}`,
      Count: data.count,
      Average: `$${data.avg.toFixed(2)}`,
    })
  })

  return generateCSV(rows, ['Section', 'Metric', 'Value', 'Count', 'Average'])
}

export function generateRegistrationCSV(reportData: any): string {
  const rows: any[] = []

  rows.push({
    Metric: 'Total Registrations',
    Value: reportData.totalRegistrations,
  })
  rows.push({
    Metric: 'Group Registrations',
    Value: reportData.groupCount,
  })
  rows.push({
    Metric: 'Individual Registrations',
    Value: reportData.individualCount,
  })

  Object.entries(reportData.demographics || {}).forEach(([type, data]: [string, any]) => {
    rows.push({
      Metric: `${type.replace(/_/g, ' ')} - Total`,
      Value: data.total,
    })
    rows.push({
      Metric: `${type.replace(/_/g, ' ')} - Male`,
      Value: data.male,
    })
    rows.push({
      Metric: `${type.replace(/_/g, ' ')} - Female`,
      Value: data.female,
    })
  })

  return generateCSV(rows, ['Metric', 'Value'])
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

export function generateMedicalCSV(reportData: any): string {
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
      student.Allergies = (detail.allergies || []).join(', ')
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
      student['Dietary Restrictions'] = (detail.restrictions || []).join(', ')
      student['Dietary Notes'] = detail.fullText || ''
    }
  }

  // Medical conditions
  if (reportData.medicalConditions?.details) {
    for (const detail of reportData.medicalConditions.details) {
      const student = getOrCreate(detail)
      student['Medical Conditions'] = (detail.conditions || []).join(', ')
      student['Medical Notes'] = detail.fullText || ''
      if (detail.groupLeaderEmail) student['Group Leader Email'] = detail.groupLeaderEmail
      if (detail.groupLeaderPhone) student['Group Leader Phone'] = detail.groupLeaderPhone
    }
  }

  // Medications
  if (reportData.medications?.details) {
    for (const detail of reportData.medications.details) {
      const student = getOrCreate(detail)
      student.Medications = (detail.medications || []).join(', ')
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
  const rows = Array.from(studentMap.values()).sort((a: any, b: any) => {
    if (a['Allergy Severity'] === 'SEVERE' && b['Allergy Severity'] !== 'SEVERE') return -1
    if (a['Allergy Severity'] !== 'SEVERE' && b['Allergy Severity'] === 'SEVERE') return 1
    return a.Name.localeCompare(b.Name)
  })

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
