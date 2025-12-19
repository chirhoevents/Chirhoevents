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
  const rows: any[] = []

  rows.push({
    Category: 'Summary',
    Type: 'Total with Allergies',
    Count: reportData.allergiesCount,
  })
  rows.push({
    Category: 'Summary',
    Type: 'Total with Dietary Restrictions',
    Count: reportData.dietaryCount,
  })
  rows.push({
    Category: 'Summary',
    Type: 'Total with Medical Conditions',
    Count: reportData.medicalCount,
  })

  // Severe allergies
  if (reportData.allergies?.severe) {
    reportData.allergies.severe.forEach((allergy: any) => {
      rows.push({
        Category: 'Severe Allergies',
        Type: allergy.type,
        Count: allergy.count,
      })
    })
  }

  return generateCSV(rows, ['Category', 'Type', 'Count'])
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
