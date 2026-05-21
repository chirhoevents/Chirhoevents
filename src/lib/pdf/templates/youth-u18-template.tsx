import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #1E3A5F',
    paddingBottom: 15,
  },
  logo: {
    width: 150,
    height: 45,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1pt solid #9C8466',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fieldLabel: {
    width: '35%',
    fontWeight: 'bold',
    color: '#333333',
  },
  fieldValue: {
    width: '65%',
    color: '#000000',
  },
  alertText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
  },
  consentSection: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  consentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 5,
  },
  consentText: {
    fontSize: 9,
    color: '#4B5563',
    lineHeight: 1.4,
  },
  checkmark: {
    color: '#059669',
    fontWeight: 'bold',
    marginRight: 5,
  },
  signatureSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    border: '1pt solid #D1D5DB',
  },
  signatureRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  signatureLabel: {
    width: '40%',
    fontWeight: 'bold',
    fontSize: 10,
  },
  signatureValue: {
    width: '60%',
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 9,
    borderTop: '1pt solid #E5E7EB',
    paddingTop: 10,
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
})

function safeString(value: any, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === 'object') return fallback
  return String(value)
}

interface YouthU18TemplateProps {
  data: {
    id: string
    eventName?: string
    eventDates?: string
    organizationName?: string
    locationName?: string
    locationLine1?: string
    locationLine2?: string
    eventTime?: string
    eventCoordinator?: string
    participantFirstName: string
    participantLastName: string
    participantPreferredName?: string
    participantAge?: number
    participantGender?: string
    tShirtSize?: string
    medicalConditions?: string
    medications?: string
    allergies?: string
    dietaryRestrictions?: string
    adaAccommodations?: string
    emergencyContact1Name?: string
    emergencyContact1Phone?: string
    emergencyContact1Relation?: string
    emergencyContact2Name?: string
    emergencyContact2Phone?: string
    emergencyContact2Relation?: string
    insuranceProvider?: string
    insurancePolicyNumber?: string
    insuranceGroupNumber?: string
    signatureData: {
      full_legal_name: string
      initials: string
      date_signed: string
      ip_address?: string
      sections_initialed?: string[]
    }
    completedByEmail?: string
    completedAt?: Date | string
    generalWaiverText?: string
    medicalReleaseText?: string
    photoVideoConsentText?: string
    transportationConsentText?: string
    emergencyTreatmentText?: string
  }
}

const YouthU18Template: React.FC<YouthU18TemplateProps> = ({ data }) => {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const genderLabel =
    data.participantGender === 'male' ? 'Male' :
    data.participantGender === 'female' ? 'Female' : 'N/A'

  const allergiesDisplay = safeString(data.allergies)
  const formId = safeString(data.id, '').substring(0, 8)

  return (
    <Document>
      {/* PAGE 1: Header + Participant + Medical Info */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LIABILITY FORM {' — '} YOUTH (UNDER 18)</Text>
          <Text style={styles.subtitle}>Form ID: {formId}</Text>
        </View>

        {/* Event Information */}
        <View style={[styles.section, { backgroundColor: '#F0F4F8', padding: 12, borderRadius: 4, marginTop: 0 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>EVENT INFORMATION</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Organization:</Text>
            <Text style={styles.fieldValue}>{safeString(data.organizationName, '—')}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Event Name:</Text>
            <Text style={styles.fieldValue}>{safeString(data.eventName, '—')}</Text>
          </View>
          {data.locationName ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Location:</Text>
              <Text style={styles.fieldValue}>{safeString(data.locationName)}</Text>
            </View>
          ) : null}
          {data.locationLine1 ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Address:</Text>
              <Text style={styles.fieldValue}>{safeString(data.locationLine1)}</Text>
            </View>
          ) : null}
          {data.locationLine2 ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>City/State/Zip:</Text>
              <Text style={styles.fieldValue}>{safeString(data.locationLine2)}</Text>
            </View>
          ) : null}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date:</Text>
            <Text style={styles.fieldValue}>{safeString(data.eventDates, '—')}</Text>
          </View>
          {data.eventTime ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Time:</Text>
              <Text style={styles.fieldValue}>{safeString(data.eventTime)}</Text>
            </View>
          ) : null}
          {data.eventCoordinator ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Coordinator:</Text>
              <Text style={styles.fieldValue}>{safeString(data.eventCoordinator)}</Text>
            </View>
          ) : null}
        </View>

        {/* Participant Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. PARTICIPANT INFORMATION</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Full Legal Name:</Text>
            <Text style={styles.fieldValue}>
              {safeString(data.participantFirstName)} {safeString(data.participantLastName)}
            </Text>
          </View>

          {data.participantPreferredName ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Preferred Name:</Text>
              <Text style={styles.fieldValue}>{safeString(data.participantPreferredName)}</Text>
            </View>
          ) : null}

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Age:</Text>
            <Text style={styles.fieldValue}>{safeString(data.participantAge, 'N/A')}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Gender:</Text>
            <Text style={styles.fieldValue}>{genderLabel}</Text>
          </View>

          {data.tShirtSize ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>T-Shirt Size:</Text>
              <Text style={styles.fieldValue}>{safeString(data.tShirtSize)}</Text>
            </View>
          ) : null}
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. MEDICAL INFORMATION</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Medical Conditions:</Text>
            <Text style={styles.fieldValue}>
              {safeString(data.medicalConditions, 'None reported')}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Current Medications:</Text>
            <Text style={styles.fieldValue}>
              {safeString(data.medications, 'None')}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>ALLERGIES:</Text>
            <Text style={[styles.fieldValue, allergiesDisplay ? styles.alertText : {}]}>
              {allergiesDisplay ? allergiesDisplay.toUpperCase() : 'None'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Dietary Restrictions:</Text>
            <Text style={styles.fieldValue}>
              {safeString(data.dietaryRestrictions, 'None')}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>ADA Accommodations:</Text>
            <Text style={styles.fieldValue}>
              {safeString(data.adaAccommodations, 'None')}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>ChiRho Events | Form ID: {formId} | Page 1 of 3</Text>
          <Text>{safeString(data.eventName, 'Event')} | Generated: {formatDate(new Date())}</Text>
        </View>
      </Page>

      {/* PAGE 2: Emergency Contacts + Insurance */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LIABILITY FORM - YOUTH UNDER 18</Text>
          <Text style={styles.subtitle}>
            {safeString(data.participantFirstName)} {safeString(data.participantLastName)} (continued)
          </Text>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. EMERGENCY CONTACTS</Text>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>
              Primary Contact:
            </Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <Text style={styles.fieldValue}>{safeString(data.emergencyContact1Name, 'N/A')}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone:</Text>
              <Text style={styles.fieldValue}>{safeString(data.emergencyContact1Phone, 'N/A')}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Relationship:</Text>
              <Text style={styles.fieldValue}>{safeString(data.emergencyContact1Relation, 'N/A')}</Text>
            </View>
          </View>

          {data.emergencyContact2Name ? (
            <View>
              <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>
                Secondary Contact:
              </Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name:</Text>
                <Text style={styles.fieldValue}>{safeString(data.emergencyContact2Name)}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone:</Text>
                <Text style={styles.fieldValue}>{safeString(data.emergencyContact2Phone, 'N/A')}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Relationship:</Text>
                <Text style={styles.fieldValue}>{safeString(data.emergencyContact2Relation, 'N/A')}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Insurance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. INSURANCE INFORMATION</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Insurance Provider:</Text>
            <Text style={styles.fieldValue}>{safeString(data.insuranceProvider, 'N/A')}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Policy Number:</Text>
            <Text style={styles.fieldValue}>{safeString(data.insurancePolicyNumber, 'N/A')}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Group Number:</Text>
            <Text style={styles.fieldValue}>{safeString(data.insuranceGroupNumber, 'N/A')}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>ChiRho Events | Form ID: {formId} | Page 2 of 3</Text>
          <Text>{safeString(data.eventName, 'Event')} | Generated: {formatDate(new Date())}</Text>
        </View>
      </Page>

      {/* PAGE 3: Consent Sections + Signature */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LIABILITY FORM - YOUTH UNDER 18</Text>
          <Text style={styles.subtitle}>
            {safeString(data.participantFirstName)} {safeString(data.participantLastName)} (continued)
          </Text>
        </View>

        {/* Consent Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. CONSENT {' & '} WAIVER</Text>

          <Text style={{ marginBottom: 10, fontSize: 10 }}>
            The parent/guardian has reviewed and agreed to the following sections:
          </Text>

          {data.generalWaiverText ? (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Waiver and Release of Liability</Text>
              </View>
              <Text style={styles.consentText}>{safeString(data.generalWaiverText)}</Text>
            </View>
          ) : null}

          {data.medicalReleaseText ? (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Medical Release Authorization</Text>
              </View>
              <Text style={styles.consentText}>{safeString(data.medicalReleaseText)}</Text>
            </View>
          ) : null}

          {data.photoVideoConsentText ? (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Photo {' & '} Video Consent</Text>
              </View>
              <Text style={styles.consentText}>{safeString(data.photoVideoConsentText)}</Text>
            </View>
          ) : null}

          {data.transportationConsentText ? (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Transportation Consent</Text>
              </View>
              <Text style={styles.consentText}>{safeString(data.transportationConsentText)}</Text>
            </View>
          ) : null}

          {data.emergencyTreatmentText ? (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Emergency Treatment Authorization</Text>
              </View>
              <Text style={styles.consentText}>{safeString(data.emergencyTreatmentText)}</Text>
            </View>
          ) : null}
        </View>

        {/* Electronic Signature */}
        <View style={styles.signatureSection}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10, color: '#1E3A5F' }}>
            ELECTRONIC SIGNATURE
          </Text>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Parent/Guardian Full Legal Name:</Text>
            <Text style={styles.signatureValue}>{safeString(data.signatureData.full_legal_name)}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Participant Full Name:</Text>
            <Text style={styles.signatureValue}>{safeString(data.participantFirstName)} {safeString(data.participantLastName)}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Initials:</Text>
            <Text style={styles.signatureValue}>{safeString(data.signatureData.initials)}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Date Signed:</Text>
            <Text style={styles.signatureValue}>{safeString(data.signatureData.date_signed)}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Completed By:</Text>
            <Text style={styles.signatureValue}>{safeString(data.completedByEmail, 'N/A')}</Text>
          </View>

          {data.signatureData.ip_address ? (
            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabel}>IP Address:</Text>
              <Text style={styles.signatureValue}>{safeString(data.signatureData.ip_address)}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 10, flexDirection: 'row' }}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={{ fontSize: 9 }}>
              I certify that all information provided in this form is accurate and complete.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>ChiRho Events | Form ID: {formId} | Page 3 of 3</Text>
          <Text>{safeString(data.eventName, 'Event')} | Generated: {formatDate(new Date())}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default YouthU18Template
