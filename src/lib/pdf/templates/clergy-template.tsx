import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

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
  clergyBox: {
    padding: 12,
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    marginBottom: 15,
  },
})

interface ClergyTemplateProps {
  data: {
    id: string
    eventName?: string
    eventDates?: string
    clergyTitle?: string
    participantFirstName: string
    participantLastName: string
    participantPreferredName?: string
    participantAge?: number
    participantGender?: string
    participantEmail?: string
    participantPhone?: string
    tShirtSize?: string
    dioceseOfIncardination?: string
    currentAssignment?: string
    facultyInformation?: string
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
  }
}

const ClergyTemplate: React.FC<ClergyTemplateProps> = ({ data }) => {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const clergyTitleLabel =
    data.clergyTitle === 'priest' ? 'Priest' :
    data.clergyTitle === 'deacon' ? 'Deacon' :
    data.clergyTitle === 'bishop' ? 'Bishop' :
    data.clergyTitle === 'cardinal' ? 'Cardinal' : 'Clergy'

  return (
    <Document>
      {/* PAGE 1: Header + Participant + Clergy Info + Medical */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LIABILITY FORM - CLERGY</Text>
          <Text style={styles.subtitle}>
            {data.eventName || 'Event'} • Form ID: {data.id.substring(0, 8)}
          </Text>
        </View>

        {/* Participant Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. PARTICIPANT INFORMATION</Text>

          <View style={styles.clergyBox}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Clergy Title:</Text>
              <Text style={[styles.fieldValue, { fontWeight: 'bold' }]}>{clergyTitleLabel}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Full Legal Name:</Text>
            <Text style={styles.fieldValue}>
              {data.participantFirstName} {data.participantLastName}
            </Text>
          </View>

          {data.participantPreferredName && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Preferred Name:</Text>
              <Text style={styles.fieldValue}>{data.participantPreferredName}</Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Age:</Text>
            <Text style={styles.fieldValue}>{data.participantAge || 'N/A'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Gender:</Text>
            <Text style={styles.fieldValue}>
              {data.participantGender === 'male' ? 'Male' : data.participantGender === 'female' ? 'Female' : 'N/A'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email:</Text>
            <Text style={styles.fieldValue}>{data.participantEmail || 'N/A'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone:</Text>
            <Text style={styles.fieldValue}>{data.participantPhone || 'N/A'}</Text>
          </View>

          {data.tShirtSize && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>T-Shirt Size:</Text>
              <Text style={styles.fieldValue}>{data.tShirtSize}</Text>
            </View>
          )}
        </View>

        {/* Clergy Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. CLERGY INFORMATION</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Diocese of Incardination:</Text>
            <Text style={styles.fieldValue}>{data.dioceseOfIncardination || 'N/A'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Current Assignment:</Text>
            <Text style={styles.fieldValue}>{data.currentAssignment || 'N/A'}</Text>
          </View>

          {data.facultyInformation && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Faculty Information:</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.4, color: '#374151' }}>
                {data.facultyInformation}
              </Text>
            </View>
          )}
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. MEDICAL INFORMATION</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Medical Conditions:</Text>
            <Text style={styles.fieldValue}>
              {data.medicalConditions || 'None reported'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Current Medications:</Text>
            <Text style={styles.fieldValue}>
              {data.medications || 'None'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>⚠️ ALLERGIES:</Text>
            <Text style={[styles.fieldValue, data.allergies ? styles.alertText : {}]}>
              {data.allergies ? data.allergies.toUpperCase() : 'None'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Dietary Restrictions:</Text>
            <Text style={styles.fieldValue}>
              {data.dietaryRestrictions || 'None'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>ADA Accommodations:</Text>
            <Text style={styles.fieldValue}>
              {data.adaAccommodations || 'None'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>ChiRho Events | Form ID: {data.id.substring(0, 8)} | Page 1 of 3</Text>
          <Text>{data.eventName || 'Event'} | Generated: {formatDate(new Date())}</Text>
        </View>
      </Page>

      {/* PAGE 2: Emergency Contacts + Insurance */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LIABILITY FORM - CLERGY</Text>
          <Text style={styles.subtitle}>
            {clergyTitleLabel} {data.participantFirstName} {data.participantLastName} (continued)
          </Text>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. EMERGENCY CONTACTS</Text>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>
              Primary Contact:
            </Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <Text style={styles.fieldValue}>{data.emergencyContact1Name || 'N/A'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone:</Text>
              <Text style={styles.fieldValue}>{data.emergencyContact1Phone || 'N/A'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Relationship:</Text>
              <Text style={styles.fieldValue}>{data.emergencyContact1Relation || 'N/A'}</Text>
            </View>
          </View>

          {data.emergencyContact2Name && (
            <View>
              <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>
                Secondary Contact:
              </Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name:</Text>
                <Text style={styles.fieldValue}>{data.emergencyContact2Name}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone:</Text>
                <Text style={styles.fieldValue}>{data.emergencyContact2Phone || 'N/A'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Relationship:</Text>
                <Text style={styles.fieldValue}>{data.emergencyContact2Relation || 'N/A'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Insurance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. INSURANCE INFORMATION</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Insurance Provider:</Text>
            <Text style={styles.fieldValue}>{data.insuranceProvider || 'N/A'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Policy Number:</Text>
            <Text style={styles.fieldValue}>{data.insurancePolicyNumber || 'N/A'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Group Number:</Text>
            <Text style={styles.fieldValue}>{data.insuranceGroupNumber || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>ChiRho Events | Form ID: {data.id.substring(0, 8)} | Page 2 of 3</Text>
          <Text>{data.eventName || 'Event'} | Generated: {formatDate(new Date())}</Text>
        </View>
      </Page>

      {/* PAGE 3: Consent Sections + Signature */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LIABILITY FORM - CLERGY</Text>
          <Text style={styles.subtitle}>
            {clergyTitleLabel} {data.participantFirstName} {data.participantLastName} (continued)
          </Text>
        </View>

        {/* Consent Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. CONSENT & WAIVER</Text>

          <Text style={{ marginBottom: 10, fontSize: 10 }}>
            The participant has reviewed and consented to the following sections:
          </Text>

          {data.signatureData.sections_initialed?.includes('medical_consent') && (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Medical Consent</Text>
              </View>
              <Text style={styles.consentText}>
                I authorize ChiRho Events staff and medical personnel to provide necessary medical treatment
                in case of emergency. I understand that every effort will be made to contact my emergency
                contacts before any medical treatment is administered.
              </Text>
            </View>
          )}

          {data.signatureData.sections_initialed?.includes('activity_waiver') && (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Activity Waiver</Text>
              </View>
              <Text style={styles.consentText}>
                I acknowledge that participation in this event involves physical activities and accept any
                risks associated with such participation. I release ChiRho Events from liability for any
                injuries that may occur during normal activities.
              </Text>
            </View>
          )}

          {data.signatureData.sections_initialed?.includes('photo_release') && (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Photo & Media Release</Text>
              </View>
              <Text style={styles.consentText}>
                I grant permission for ChiRho Events to use photographs and videos of myself for
                promotional purposes including website, social media, and printed materials.
              </Text>
            </View>
          )}

          {data.signatureData.sections_initialed?.includes('transportation') && (
            <View style={styles.consentSection}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.consentTitle}>Transportation Consent</Text>
              </View>
              <Text style={styles.consentText}>
                I give permission to be transported by ChiRho Events staff or designated drivers for
                event-related activities and in case of emergency.
              </Text>
            </View>
          )}
        </View>

        {/* Electronic Signature */}
        <View style={styles.signatureSection}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10, color: '#1E3A5F' }}>
            ELECTRONIC SIGNATURE
          </Text>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Full Legal Name:</Text>
            <Text style={styles.signatureValue}>{data.signatureData.full_legal_name}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Initials:</Text>
            <Text style={styles.signatureValue}>{data.signatureData.initials}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Date Signed:</Text>
            <Text style={styles.signatureValue}>{data.signatureData.date_signed}</Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>Completed By:</Text>
            <Text style={styles.signatureValue}>{data.completedByEmail || 'N/A'}</Text>
          </View>

          {data.signatureData.ip_address && (
            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabel}>IP Address:</Text>
              <Text style={styles.signatureValue}>{data.signatureData.ip_address}</Text>
            </View>
          )}

          <View style={{ marginTop: 10, flexDirection: 'row' }}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={{ fontSize: 9 }}>
              I certify that all information provided in this form is accurate and complete.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>ChiRho Events | Form ID: {data.id.substring(0, 8)} | Page 3 of 3</Text>
          <Text>{data.eventName || 'Event'} | Generated: {formatDate(new Date())}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default ClergyTemplate
