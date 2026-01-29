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

// Medical Report PDF styles
const medStyles = StyleSheet.create({
  severeRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #ccc',
    padding: 6,
    backgroundColor: '#FEF2F2',
  },
  normalRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eee',
    padding: 6,
  },
  altRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eee',
    padding: 6,
    backgroundColor: '#F9FAFB',
  },
  nameCell: {
    width: '25%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  groupCell: {
    width: '20%',
    fontSize: 8,
    color: '#6B7280',
  },
  allergyCell: {
    width: '30%',
    fontSize: 9,
  },
  dietaryCell: {
    width: '25%',
    fontSize: 9,
  },
  severeBadge: {
    fontSize: 7,
    color: '#DC2626',
    fontWeight: 'bold',
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
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
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
  categoryHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    padding: 6,
  },
  categoryHeaderText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
})

// Medical Report PDF
export const MedicalReportPDF = ({ reportData, eventName }: { reportData: any; eventName: string }) => {
  // Consolidate students (same logic as the UI)
  const studentMap = new Map<string, any>()

  const getOrCreate = (detail: any) => {
    const key = detail.name
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        name: detail.name,
        age: detail.age,
        group: detail.group || 'Individual',
        allergies: [],
        allergyFullText: undefined,
        allergySeverity: undefined,
        dietaryRestrictions: [],
        dietaryFullText: undefined,
        medications: [],
        medicationsFullText: undefined,
      })
    }
    return studentMap.get(key)!
  }

  if (reportData.foodAllergies?.details) {
    for (const d of reportData.foodAllergies.details) {
      const s = getOrCreate(d)
      s.allergies = d.allergies || []
      s.allergyFullText = d.fullText
      s.allergySeverity = d.severity
    }
  }
  if (reportData.dietaryRestrictions?.details) {
    for (const d of reportData.dietaryRestrictions.details) {
      const s = getOrCreate(d)
      s.dietaryRestrictions = d.restrictions || []
      s.dietaryFullText = d.fullText
    }
  }
  if (reportData.medications?.details) {
    for (const d of reportData.medications.details) {
      const s = getOrCreate(d)
      s.medications = d.medications || []
      s.medicationsFullText = d.fullText
    }
  }

  const students = Array.from(studentMap.values()).sort((a: any, b: any) => {
    if (a.allergySeverity === 'SEVERE' && b.allergySeverity !== 'SEVERE') return -1
    if (a.allergySeverity !== 'SEVERE' && b.allergySeverity === 'SEVERE') return 1
    return a.name.localeCompare(b.name)
  })

  const allergiesCount = reportData.summary?.foodAllergiesCount ?? reportData.foodAllergies?.total ?? 0
  const dietaryCount = reportData.summary?.dietaryRestrictionsCount ?? reportData.dietaryRestrictions?.total ?? 0
  const medicalCount = reportData.summary?.medicalConditionsCount ?? reportData.medicalConditions?.total ?? 0
  const medsCount = reportData.summary?.medicationsCount ?? reportData.medications?.total ?? 0

  return (
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
            <Text style={{ ...medStyles.summaryValue, color: '#DC2626' }}>{safeNumber(allergiesCount)}</Text>
          </View>
          <View style={medStyles.summaryItem}>
            <Text style={medStyles.summaryLabel}>Dietary</Text>
            <Text style={{ ...medStyles.summaryValue, color: '#EA580C' }}>{safeNumber(dietaryCount)}</Text>
          </View>
          <View style={medStyles.summaryItem}>
            <Text style={medStyles.summaryLabel}>Medical</Text>
            <Text style={{ ...medStyles.summaryValue, color: '#2563EB' }}>{safeNumber(medicalCount)}</Text>
          </View>
          <View style={medStyles.summaryItem}>
            <Text style={medStyles.summaryLabel}>Medications</Text>
            <Text style={{ ...medStyles.summaryValue, color: '#9333EA' }}>{safeNumber(medsCount)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Details ({safeNumber(students.length)} students)</Text>
          <View style={medStyles.categoryHeader}>
            <Text style={{ ...medStyles.categoryHeaderText, width: '25%' }}>Name</Text>
            <Text style={{ ...medStyles.categoryHeaderText, width: '20%' }}>Group</Text>
            <Text style={{ ...medStyles.categoryHeaderText, width: '30%' }}>Allergies</Text>
            <Text style={{ ...medStyles.categoryHeaderText, width: '25%' }}>Dietary</Text>
          </View>
          {students.map((student: any, idx: number) => {
            const allergyDisplay = formatMedicalItems(student.allergies, student.allergyFullText)
            const dietaryDisplay = formatMedicalItems(student.dietaryRestrictions, student.dietaryFullText)
            const isSevere = student.allergySeverity === 'SEVERE'
            const rowStyle = isSevere
              ? medStyles.severeRow
              : idx % 2 === 0
              ? medStyles.normalRow
              : medStyles.altRow

            return (
              <View key={idx} style={rowStyle} wrap={false}>
                <View style={medStyles.nameCell}>
                  <Text>{safeString(student.name)}</Text>
                  {isSevere && <Text style={medStyles.severeBadge}>SEVERE</Text>}
                </View>
                <Text style={medStyles.groupCell}>{safeString(student.group)}</Text>
                <Text style={medStyles.allergyCell}>{allergyDisplay || '--'}</Text>
                <Text style={medStyles.dietaryCell}>{dietaryDisplay || '--'}</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.footer}>
          <Text>ChiRho Events - Dietary & Medical Report - CONFIDENTIAL</Text>
        </View>
      </Page>
    </Document>
  )
}
