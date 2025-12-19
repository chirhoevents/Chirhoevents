/**
 * PDF Generation using @react-pdf/renderer
 * Generates professional PDF reports for ChiRho Events
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

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
        <Text style={styles.subtitle}>{eventName}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* Revenue Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Summary</Text>
        <View style={styles.highlight}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Revenue:</Text>
            <Text style={styles.value}>${reportData.totalRevenue?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={styles.value}>${reportData.amountPaid?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Balance Due:</Text>
            <Text style={styles.value}>${reportData.balanceDue?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Overdue Balance:</Text>
            <Text style={styles.value}>${reportData.overdueBalance?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Credit Card (Stripe):</Text>
          <Text style={styles.value}>${reportData.paymentMethods?.stripe?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Check:</Text>
          <Text style={styles.value}>${reportData.paymentMethods?.check?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pending:</Text>
          <Text style={styles.value}>${reportData.paymentMethods?.pending?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>

      {/* Revenue by Participant Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Participant Type</Text>
        {reportData.byParticipantType && Object.entries(reportData.byParticipantType).map(([type, data]: [string, any]) => (
          <View key={type} style={styles.row}>
            <Text style={styles.label}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</Text>
            <Text style={styles.value}>
              ${data.revenue?.toFixed(2) || '0.00'} ({data.count || 0} people, avg: ${data.avg?.toFixed(2) || '0.00'})
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
            ${reportData.byHousingType?.onCampus?.revenue?.toFixed(2) || '0.00'} ({reportData.byHousingType?.onCampus?.count || 0} people)
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Off-Campus:</Text>
          <Text style={styles.value}>
            ${reportData.byHousingType?.offCampus?.revenue?.toFixed(2) || '0.00'} ({reportData.byHousingType?.offCampus?.count || 0} people)
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Day Pass:</Text>
          <Text style={styles.value}>
            ${reportData.byHousingType?.dayPass?.revenue?.toFixed(2) || '0.00'} ({reportData.byHousingType?.dayPass?.count || 0} people)
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
        <Text style={styles.subtitle}>{eventName}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* Registration Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration Summary</Text>
        <View style={styles.highlight}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Registrations:</Text>
            <Text style={styles.value}>{reportData.totalRegistrations || 0} people</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Group Registrations:</Text>
            <Text style={styles.value}>{reportData.groupCount || 0} ({reportData.groupParticipants || 0} people)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Individual Registrations:</Text>
            <Text style={styles.value}>{reportData.individualCount || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Group Size:</Text>
            <Text style={styles.value}>{reportData.avgGroupSize?.toFixed(1) || '0.0'} people</Text>
          </View>
        </View>
      </View>

      {/* Demographics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demographics</Text>
        {reportData.demographics && Object.entries(reportData.demographics).map(([type, data]: [string, any]) => (
          <View key={type} style={styles.row}>
            <Text style={styles.label}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</Text>
            <Text style={styles.value}>
              {data.total || 0} (Male: {data.male || 0}, Female: {data.female || 0})
            </Text>
          </View>
        ))}
      </View>

      {/* Housing Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Housing Breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.label}>On-Campus:</Text>
          <Text style={styles.value}>{reportData.housingBreakdown?.on_campus || 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Off-Campus:</Text>
          <Text style={styles.value}>{reportData.housingBreakdown?.off_campus || 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Day Pass:</Text>
          <Text style={styles.value}>{reportData.housingBreakdown?.day_pass || 0}</Text>
        </View>
      </View>

      {/* Top Groups */}
      {reportData.topGroups && reportData.topGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Groups (by size)</Text>
          {reportData.topGroups.slice(0, 10).map((group: any, index: number) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{group.name || 'Unknown'}:</Text>
              <Text style={styles.value}>{group.count || 0} participants</Text>
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
