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
