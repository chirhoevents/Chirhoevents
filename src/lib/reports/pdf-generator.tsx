/**
 * PDF Generation using @react-pdf/renderer
 * Generates professional PDF reports for ChiRho Events
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Helper to safely convert any value to a displayable string
// This prevents React error #31 by ensuring we never pass objects as children
function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }
  // For objects (including React elements), return a placeholder
  if (typeof value === 'object') {
    // React elements have $$typeof property
    if (value.$$typeof) {
      console.error('[PDF Generator] Attempted to render React element as text')
      return '[Invalid Value]'
    }
    try {
      return JSON.stringify(value)
    } catch {
      return '[Object]'
    }
  }
  return String(value)
}

// Helper to safely format numbers
function safeNumber(value: any, decimals?: number): string {
  if (value === null || value === undefined) {
    return '0'
  }
  const num = Number(value)
  if (isNaN(num)) {
    return '0'
  }
  if (decimals !== undefined) {
    return num.toFixed(decimals)
  }
  return String(num)
}

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #1E3A5F',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 8,
    borderBottom: '1 solid #9C8466',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    width: '60%',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #ccc',
    padding: 8,
  },
  tableCell: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#666',
    fontSize: 9,
    borderTop: '1 solid #ccc',
    paddingTop: 10,
  },
  highlight: {
    backgroundColor: '#F5F1E8',
    padding: 10,
    marginVertical: 5,
    borderLeft: '3 solid #9C8466',
  },
})

// Financial Report PDF
export const FinancialReportPDF = ({ reportData, eventName }: { reportData: any; eventName: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Financial Report</Text>
        <Text style={styles.subtitle}>{safeString(eventName, 'Event')}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* Revenue Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Summary</Text>
        <View style={styles.highlight}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Revenue:</Text>
            <Text style={styles.value}>${safeNumber(reportData?.totalRevenue, 2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={styles.value}>${safeNumber(reportData?.amountPaid, 2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Balance Due:</Text>
            <Text style={styles.value}>${safeNumber(reportData?.balanceDue, 2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Overdue Balance:</Text>
            <Text style={styles.value}>${safeNumber(reportData?.overdueBalance, 2)}</Text>
          </View>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Credit Card (Stripe):</Text>
          <Text style={styles.value}>${safeNumber(reportData?.paymentMethods?.stripe, 2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Check:</Text>
          <Text style={styles.value}>${safeNumber(reportData?.paymentMethods?.check, 2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pending:</Text>
          <Text style={styles.value}>${safeNumber(reportData?.paymentMethods?.pending, 2)}</Text>
        </View>
      </View>

      {/* Revenue by Participant Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Participant Type</Text>
        {reportData?.byParticipantType && Object.entries(reportData.byParticipantType).map(([type, data]: [string, any]) => (
          <View key={type} style={styles.row}>
            <Text style={styles.label}>{safeString(type).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</Text>
            <Text style={styles.value}>
              ${safeNumber(data?.revenue, 2)} ({safeNumber(data?.count)} people, avg: ${safeNumber(data?.avg, 2)})
            </Text>
          </View>
        ))}
      </View>

      {/* Revenue by Housing Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Housing Type</Text>
        <View style={styles.row}>
          <Text style={styles.label}>On-Campus:</Text>
          <Text style={styles.value}>
            ${safeNumber(reportData?.byHousingType?.onCampus?.revenue, 2)} ({safeNumber(reportData?.byHousingType?.onCampus?.count)} people)
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Off-Campus:</Text>
          <Text style={styles.value}>
            ${safeNumber(reportData?.byHousingType?.offCampus?.revenue, 2)} ({safeNumber(reportData?.byHousingType?.offCampus?.count)} people)
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Day Pass:</Text>
          <Text style={styles.value}>
            ${safeNumber(reportData?.byHousingType?.dayPass?.revenue, 2)} ({safeNumber(reportData?.byHousingType?.dayPass?.count)} people)
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>ChiRho Events - Financial Report - Confidential</Text>
      </View>
    </Page>
  </Document>
)

// Registration Report PDF
export const RegistrationReportPDF = ({ reportData, eventName }: { reportData: any; eventName: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Registration Report</Text>
        <Text style={styles.subtitle}>{safeString(eventName, 'Event')}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* Registration Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration Summary</Text>
        <View style={styles.highlight}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Registrations:</Text>
            <Text style={styles.value}>{safeNumber(reportData?.totalRegistrations)} people</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Group Registrations:</Text>
            <Text style={styles.value}>{safeNumber(reportData?.groupCount)} ({safeNumber(reportData?.groupParticipants)} people)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Individual Registrations:</Text>
            <Text style={styles.value}>{safeNumber(reportData?.individualCount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Group Size:</Text>
            <Text style={styles.value}>{safeNumber(reportData?.avgGroupSize, 1)} people</Text>
          </View>
        </View>
      </View>

      {/* Demographics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demographics</Text>
        {reportData?.demographics && Object.entries(reportData.demographics).map(([type, data]: [string, any]) => (
          <View key={type} style={styles.row}>
            <Text style={styles.label}>{safeString(type).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</Text>
            <Text style={styles.value}>
              {safeNumber(data?.total)} (Male: {safeNumber(data?.male)}, Female: {safeNumber(data?.female)})
            </Text>
          </View>
        ))}
      </View>

      {/* Housing Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Housing Breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.label}>On-Campus:</Text>
          <Text style={styles.value}>{safeNumber(reportData?.housingBreakdown?.on_campus)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Off-Campus:</Text>
          <Text style={styles.value}>{safeNumber(reportData?.housingBreakdown?.off_campus)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Day Pass:</Text>
          <Text style={styles.value}>{safeNumber(reportData?.housingBreakdown?.day_pass)}</Text>
        </View>
      </View>

      {/* Top Groups */}
      {reportData?.topGroups && Array.isArray(reportData.topGroups) && reportData.topGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Groups (by size)</Text>
          {reportData.topGroups.slice(0, 10).map((group: any, index: number) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{safeString(group?.name, 'Unknown')}:</Text>
              <Text style={styles.value}>{safeNumber(group?.count)} participants</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>ChiRho Events - Registration Report - Confidential</Text>
      </View>
    </Page>
  </Document>
)

// Helper: show detected keywords or fall back to raw text, never "See notes"
function formatMedicalItems(items: string[] | undefined, fullText: string | undefined): string {
  const filtered = (items || []).filter(i => i && i !== 'See notes')
  if (filtered.length > 0) return filtered.join(', ')
  if (fullText) return fullText
  return ''
}

// Pre-process medical report data outside the component (avoids Map/complex logic in JSX)
export function prepareMedicalPDFData(reportData: any) {
  const studentObj: Record<string, any> = {}

  const getOrCreate = (detail: any) => {
    const key = detail.name
    if (!studentObj[key]) {
      studentObj[key] = {
        name: String(detail.name || ''),
        group: String(detail.group || 'Individual'),
        allergies: '',
        dietary: '',
        severity: '',
      }
    }
    return studentObj[key]
  }

  if (reportData.foodAllergies?.details) {
    for (const d of reportData.foodAllergies.details) {
      const s = getOrCreate(d)
      s.allergies = formatMedicalItems(d.allergies, d.fullText)
      s.severity = d.severity || ''
    }
  }
  if (reportData.dietaryRestrictions?.details) {
    for (const d of reportData.dietaryRestrictions.details) {
      const s = getOrCreate(d)
      s.dietary = formatMedicalItems(d.restrictions, d.fullText)
    }
  }

  const students = Object.values(studentObj).sort((a: any, b: any) => {
    if (a.severity === 'SEVERE' && b.severity !== 'SEVERE') return -1
    if (a.severity !== 'SEVERE' && b.severity === 'SEVERE') return 1
    return a.name.localeCompare(b.name)
  })

  // Count allergy types
  const allergyCounts: Record<string, number> = {}
  const dietaryCounts: Record<string, number> = {}
  for (const s of students as any[]) {
    if (s.allergies) {
      const items = s.allergies.split(', ')
      for (const item of items) {
        if (item) allergyCounts[item] = (allergyCounts[item] || 0) + 1
      }
    }
    if (s.dietary) {
      const items = s.dietary.split(', ')
      for (const item of items) {
        if (item) dietaryCounts[item] = (dietaryCounts[item] || 0) + 1
      }
    }
  }

  const allergyBreakdown = Object.entries(allergyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type: String(type), count: Number(count) }))

  const dietaryBreakdown = Object.entries(dietaryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type: String(type), count: Number(count) }))

  return {
    students: students as Array<{ name: string; group: string; allergies: string; dietary: string; severity: string }>,
    allergyBreakdown,
    dietaryBreakdown,
    allergiesCount: String(reportData.summary?.foodAllergiesCount ?? reportData.foodAllergies?.total ?? 0),
    dietaryCount: String(reportData.summary?.dietaryRestrictionsCount ?? reportData.dietaryRestrictions?.total ?? 0),
    medicalCount: String(reportData.summary?.medicalConditionsCount ?? reportData.medicalConditions?.total ?? 0),
    medsCount: String(reportData.summary?.medicationsCount ?? reportData.medications?.total ?? 0),
    studentCount: String(students.length),
  }
}

// Medical Report PDF styles
const medStyles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eeeeee',
    padding: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #eeeeee',
    padding: 6,
    backgroundColor: '#F9FAFB',
  },
  tableRowSevere: {
    flexDirection: 'row',
    borderBottom: '1 solid #cccccc',
    padding: 6,
    backgroundColor: '#FEF2F2',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    padding: 6,
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F1E8',
    padding: 12,
    marginBottom: 15,
    borderLeft: '3 solid #9C8466',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6B7280',
  },
  summaryValueRed: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  summaryValueOrange: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  summaryValueBlue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  summaryValuePurple: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9333EA',
  },
  warning: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    marginBottom: 12,
    borderLeft: '3 solid #DC2626',
  },
  warningText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  colHeaderName: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    width: '25%',
  },
  colHeaderGroup: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    width: '20%',
  },
  colHeaderAllergy: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    width: '30%',
  },
  colHeaderDietary: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    width: '25%',
  },
  cellName: {
    width: '25%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  cellGroup: {
    width: '20%',
    fontSize: 8,
    color: '#6B7280',
  },
  cellAllergy: {
    width: '30%',
    fontSize: 9,
  },
  cellDietary: {
    width: '25%',
    fontSize: 9,
  },
  breakdownSection: {
    marginTop: 20,
  },
  breakdownSectionAlt: {
    marginTop: 15,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottom: '1 solid #F3F4F6',
  },
  breakdownLabel: {
    fontSize: 9,
    color: '#374151',
  },
  breakdownValueRed: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  breakdownValueOrange: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  breakdownTotalRed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 2,
    borderTop: '2 solid #DC2626',
  },
  breakdownTotalOrange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 2,
    borderTop: '2 solid #EA580C',
  },
  breakdownTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  breakdownTotalValueRed: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  breakdownTotalValueOrange: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  breakdownContainerRed: {
    borderLeft: '3 solid #DC2626',
    paddingLeft: 10,
  },
  breakdownContainerOrange: {
    borderLeft: '3 solid #EA580C',
    paddingLeft: 10,
  },
})

// Medical Report PDF - receives pre-processed data only (no complex logic)
export const MedicalReportPDF = ({ data, eventName }: { data: ReturnType<typeof prepareMedicalPDFData>; eventName: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Dietary & Medical Report</Text>
        <Text style={styles.subtitle}>{safeString(eventName, 'Event')}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString()}</Text>
      </View>

      <View style={medStyles.warning}>
        <Text style={medStyles.warningText}>CRITICAL INFORMATION FOR EVENT SAFETY</Text>
      </View>

      <View style={medStyles.summaryBox}>
        <View style={medStyles.summaryItem}>
          <Text style={medStyles.summaryLabel}>Allergies</Text>
          <Text style={medStyles.summaryValueRed}>{data.allergiesCount}</Text>
        </View>
        <View style={medStyles.summaryItem}>
          <Text style={medStyles.summaryLabel}>Dietary</Text>
          <Text style={medStyles.summaryValueOrange}>{data.dietaryCount}</Text>
        </View>
        <View style={medStyles.summaryItem}>
          <Text style={medStyles.summaryLabel}>Medical</Text>
          <Text style={medStyles.summaryValueBlue}>{data.medicalCount}</Text>
        </View>
        <View style={medStyles.summaryItem}>
          <Text style={medStyles.summaryLabel}>Medications</Text>
          <Text style={medStyles.summaryValuePurple}>{data.medsCount}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Student Details ({data.studentCount} students)</Text>
        <View style={medStyles.headerRow}>
          <Text style={medStyles.colHeaderName}>Name</Text>
          <Text style={medStyles.colHeaderGroup}>Group</Text>
          <Text style={medStyles.colHeaderAllergy}>Allergies</Text>
          <Text style={medStyles.colHeaderDietary}>Dietary</Text>
        </View>
        {data.students.map((student, idx) => (
          <View key={idx} style={student.severity === 'SEVERE' ? medStyles.tableRowSevere : idx % 2 === 0 ? medStyles.tableRow : medStyles.tableRowAlt} wrap={false}>
            <Text style={medStyles.cellName}>
              {student.name}{student.severity === 'SEVERE' ? ' [SEVERE]' : ''}
            </Text>
            <Text style={medStyles.cellGroup}>{student.group}</Text>
            <Text style={medStyles.cellAllergy}>{student.allergies || '--'}</Text>
            <Text style={medStyles.cellDietary}>{student.dietary || '--'}</Text>
          </View>
        ))}
      </View>

      {data.allergyBreakdown.length > 0 ? (
        <View style={medStyles.breakdownSection} wrap={false}>
          <Text style={medStyles.breakdownTitle}>Allergy Totals by Type</Text>
          <View style={medStyles.breakdownContainerRed}>
            {data.allergyBreakdown.map((item, idx) => (
              <View key={idx} style={medStyles.breakdownRow}>
                <Text style={medStyles.breakdownLabel}>{item.type}</Text>
                <Text style={medStyles.breakdownValueRed}>{String(item.count)} {item.count === 1 ? 'student' : 'students'}</Text>
              </View>
            ))}
            <View style={medStyles.breakdownTotalRed}>
              <Text style={medStyles.breakdownTotalLabel}>Total with Allergies</Text>
              <Text style={medStyles.breakdownTotalValueRed}>{data.allergiesCount}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {data.dietaryBreakdown.length > 0 ? (
        <View style={medStyles.breakdownSectionAlt} wrap={false}>
          <Text style={medStyles.breakdownTitle}>Dietary Restriction Totals by Type</Text>
          <View style={medStyles.breakdownContainerOrange}>
            {data.dietaryBreakdown.map((item, idx) => (
              <View key={idx} style={medStyles.breakdownRow}>
                <Text style={medStyles.breakdownLabel}>{item.type}</Text>
                <Text style={medStyles.breakdownValueOrange}>{String(item.count)} {item.count === 1 ? 'student' : 'students'}</Text>
              </View>
            ))}
            <View style={medStyles.breakdownTotalOrange}>
              <Text style={medStyles.breakdownTotalLabel}>Total with Dietary Restrictions</Text>
              <Text style={medStyles.breakdownTotalValueOrange}>{data.dietaryCount}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text>ChiRho Events - Dietary & Medical Report - CONFIDENTIAL</Text>
      </View>
    </Page>
  </Document>
)
