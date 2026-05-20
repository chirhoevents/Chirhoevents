import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 16,
    borderBottom: '2pt solid #1E3A5F',
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
  },
  section: {
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt solid #9C8466',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  fieldLabel: {
    width: '32%',
    fontWeight: 'bold',
    color: '#333333',
    paddingBottom: 2,
  },
  fieldLine: {
    flex: 1,
    borderBottom: '1pt solid #555555',
    height: 14,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  halfField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  halfLabel: {
    fontWeight: 'bold',
    color: '#333333',
    paddingBottom: 2,
  },
  halfLine: {
    flex: 1,
    borderBottom: '1pt solid #555555',
    height: 14,
  },
  eventBlock: {
    backgroundColor: '#F0F4F8',
    padding: 12,
    borderRadius: 4,
    marginBottom: 14,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt solid #9C8466',
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  eventLabel: {
    width: '35%',
    fontWeight: 'bold',
    color: '#333333',
  },
  eventValue: {
    flex: 1,
    color: '#000000',
  },
  consentSection: {
    marginTop: 12,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  consentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  consentText: {
    fontSize: 8.5,
    color: '#374151',
    lineHeight: 1.4,
  },
  checkbox: {
    width: 12,
    height: 12,
    border: '1pt solid #555555',
    marginTop: 1,
  },
  sigBlock: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    border: '1pt solid #D1D5DB',
  },
  sigTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 10,
  },
  sigRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  sigLabel: {
    width: '40%',
    fontWeight: 'bold',
    fontSize: 10,
    paddingBottom: 2,
  },
  sigLine: {
    flex: 1,
    borderBottom: '1pt solid #333333',
    height: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 8,
    borderTop: '1pt solid #E5E7EB',
    paddingTop: 8,
  },
  pageHeader: {
    marginBottom: 14,
    borderBottom: '1pt solid #D1D5DB',
    paddingBottom: 8,
  },
  pageHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  noteText: {
    fontSize: 8.5,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
})

export type BlankFormType = 'youth_u18' | 'youth_o18_chaperone' | 'clergy' | 'religious'

interface BlankFormData {
  formType: BlankFormType
  eventName?: string
  eventDates?: string
  organizationName?: string
  locationName?: string
  locationLine1?: string
  locationLine2?: string
  eventTime?: string
  eventCoordinator?: string
  generalWaiverText?: string
  medicalReleaseText?: string
  photoVideoConsentText?: string
  transportationConsentText?: string
  emergencyTreatmentText?: string
}

interface BlankFormTemplateProps {
  data: BlankFormData
}

const FORM_TITLES: Record<BlankFormType, string> = {
  youth_u18: 'LIABILITY FORM — YOUTH (UNDER 18)',
  youth_o18_chaperone: 'LIABILITY FORM — ADULTS & CHAPERONES (18+)',
  clergy: 'LIABILITY FORM — CLERGY & SEMINARIANS',
  religious: 'LIABILITY FORM — RELIGIOUS (SISTERS & BROTHERS)',
}

const FORM_SUBTITLES: Record<BlankFormType, string> = {
  youth_u18: 'Completed by Parent or Legal Guardian',
  youth_o18_chaperone: 'Completed by Adult Participant or Chaperone',
  clergy: 'For Priests, Deacons, Seminarians, and Clergy',
  religious: 'For Sisters, Brothers, and Members of Religious Orders',
}

const BlankFormTemplate: React.FC<BlankFormTemplateProps> = ({ data }) => {
  const { formType } = data
  const isYouthU18 = formType === 'youth_u18'
  const isClergy = formType === 'clergy'
  const isReligious = formType === 'religious'
  const isAdult = formType === 'youth_o18_chaperone'

  const activityName = data.eventName || '[Activity Name]'
  const orgName = data.organizationName || '[Organization Name]'

  const resolveText = (text?: string) =>
    text
      ? text.replace(/\[Activity Name\]/g, activityName).replace(/\[Organization Name\]/g, orgName)
      : undefined

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const genWaiver = resolveText(data.generalWaiverText)
  const medRelease = resolveText(data.medicalReleaseText)
  const photoConsent = resolveText(data.photoVideoConsentText)
  const transportConsent = resolveText(data.transportationConsentText)
  const emergencyConsent = resolveText(data.emergencyTreatmentText)

  return (
    <Document>
      {/* PAGE 1 — Header + Event Info + Participant Info + Medical */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{FORM_TITLES[formType]}</Text>
          <Text style={styles.subtitle}>{FORM_SUBTITLES[formType]}</Text>
        </View>

        {/* EVENT INFORMATION — inlined */}
        <View style={styles.eventBlock}>
          <Text style={styles.eventTitle}>EVENT INFORMATION</Text>
          <View style={styles.eventRow}>
            <Text style={styles.eventLabel}>Organization:</Text>
            <Text style={styles.eventValue}>{orgName}</Text>
          </View>
          <View style={styles.eventRow}>
            <Text style={styles.eventLabel}>Event Name:</Text>
            <Text style={styles.eventValue}>{activityName}</Text>
          </View>
          {data.locationName ? (
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Location:</Text>
              <Text style={styles.eventValue}>{data.locationName}</Text>
            </View>
          ) : null}
          {data.locationLine1 ? (
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Address:</Text>
              <Text style={styles.eventValue}>{data.locationLine1}</Text>
            </View>
          ) : null}
          {data.locationLine2 ? (
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>City/State/Zip:</Text>
              <Text style={styles.eventValue}>{data.locationLine2}</Text>
            </View>
          ) : null}
          <View style={styles.eventRow}>
            <Text style={styles.eventLabel}>Date(s):</Text>
            <Text style={styles.eventValue}>{data.eventDates || '—'}</Text>
          </View>
          {data.eventTime ? (
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Time:</Text>
              <Text style={styles.eventValue}>{data.eventTime}</Text>
            </View>
          ) : null}
          {data.eventCoordinator ? (
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Coordinator:</Text>
              <Text style={styles.eventValue}>{data.eventCoordinator}</Text>
            </View>
          ) : null}
        </View>

        {/* PARTICIPANT INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. PARTICIPANT INFORMATION</Text>

          <View style={styles.twoColRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>First Name:</Text>
              <View style={styles.halfLine} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>Last Name:</Text>
              <View style={styles.halfLine} />
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>Preferred Name:</Text>
              <View style={styles.halfLine} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>{isYouthU18 ? 'Age:' : 'Date of Birth:'}</Text>
              <View style={styles.halfLine} />
            </View>
          </View>

          {isClergy ? (
            <View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Title (Fr./Dcn./Mr./etc.):</Text>
                <View style={styles.fieldLine} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Diocese of Incardination:</Text>
                <View style={styles.fieldLine} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Current Assignment / Parish:</Text>
                <View style={styles.fieldLine} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Faculty Information:</Text>
                <View style={styles.fieldLine} />
              </View>
            </View>
          ) : null}

          {isReligious ? (
            <View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Title / Religious Name:</Text>
                <View style={styles.fieldLine} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Religious Order / Congregation:</Text>
                <View style={styles.fieldLine} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { width: '32%' }]}>Current Convent / House:</Text>
                <View style={styles.fieldLine} />
              </View>
            </View>
          ) : null}

          {isAdult ? (
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { width: '32%' }]}>Participant Type:</Text>
              <View style={{ flexDirection: 'row', gap: 20, paddingBottom: 2 }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>Youth 18+</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>Chaperone</Text>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.twoColRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.halfLabel}>Gender:</Text>
              <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 2 }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>Male</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>Female</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>Prefer not to say</Text>
                </View>
              </View>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>T-Shirt Size:</Text>
              <View style={styles.halfLine} />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>Email:</Text>
              <View style={styles.halfLine} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>Phone:</Text>
              <View style={styles.halfLine} />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '32%' }]}>Parish / Parish of Origin:</Text>
            <View style={styles.fieldLine} />
          </View>

          {isClergy || isReligious ? (
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { width: '32%' }]}>Needs Housing:</Text>
              <View style={{ flexDirection: 'row', gap: 20, paddingBottom: 2 }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>Yes</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>No</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* MEDICAL INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. MEDICAL INFORMATION</Text>
          <Text style={styles.noteText}>Write None if not applicable.</Text>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Medical Conditions:</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Current Medications:</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Allergies:</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Dietary Restrictions:</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>ADA Accommodations:</Text>
            <View style={styles.fieldLine} />
          </View>
        </View>

        <Text style={styles.footer}>
          {orgName} | {activityName} | Page 1 of 3 | Printed: {today}
        </Text>
      </Page>

      {/* PAGE 2 — Emergency Contacts + Insurance */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderText}>{FORM_TITLES[formType]} (continued)</Text>
        </View>

        {/* EMERGENCY CONTACTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. EMERGENCY CONTACTS</Text>

          <Text style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 11 }}>Primary Contact:</Text>
          <View style={styles.twoColRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>Name:</Text>
              <View style={styles.halfLine} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>Relationship:</Text>
              <View style={styles.halfLine} />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Phone:</Text>
            <View style={styles.fieldLine} />
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 11 }}>Secondary Contact (Optional):</Text>
            <View style={styles.twoColRow}>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>Name:</Text>
                <View style={styles.halfLine} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>Relationship:</Text>
                <View style={styles.halfLine} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { width: '36%' }]}>Phone:</Text>
              <View style={styles.fieldLine} />
            </View>
          </View>
        </View>

        {/* INSURANCE INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. INSURANCE INFORMATION</Text>
          <Text style={styles.noteText}>Please provide your primary health insurance information.</Text>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Insurance Provider:</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Policy Number:</Text>
            <View style={styles.fieldLine} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { width: '36%' }]}>Group Number:</Text>
            <View style={styles.fieldLine} />
          </View>
        </View>

        {/* SAFE ENVIRONMENT (adults/chaperones only) */}
        {isAdult ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. SAFE ENVIRONMENT CERTIFICATION</Text>
            <Text style={styles.noteText}>
              Chaperones are required to have a current Safe Environment certification. Please list your certification(s) below.
            </Text>
            <View style={styles.twoColRow}>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>Program Name:</Text>
                <View style={styles.halfLine} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>Completion Date:</Text>
                <View style={styles.halfLine} />
              </View>
            </View>
            <View style={styles.twoColRow}>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>Expiration Date:</Text>
                <View style={styles.halfLine} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>Status:</Text>
                <View style={styles.halfLine} />
              </View>
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {orgName} | {activityName} | Page 2 of 3 | Printed: {today}
        </Text>
      </Page>

      {/* PAGE 3 — Consent Sections + Signature */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderText}>{FORM_TITLES[formType]} — Waivers &amp; Signature</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. CONSENT &amp; RELEASE</Text>
          <Text style={{ fontSize: 9, color: '#555555', marginBottom: 8, lineHeight: 1.4 }}>
            Please read each section carefully. By signing below you acknowledge that you have read, understand, and agree to the terms set forth in each section.
          </Text>

          {genWaiver ? (
            <View style={styles.consentSection}>
              <Text style={styles.consentTitle}>Waiver and Release of Liability</Text>
              <Text style={styles.consentText}>{genWaiver}</Text>
            </View>
          ) : null}

          {medRelease ? (
            <View style={styles.consentSection}>
              <Text style={styles.consentTitle}>Medical Release Authorization</Text>
              <Text style={styles.consentText}>{medRelease}</Text>
            </View>
          ) : null}

          {photoConsent ? (
            <View style={styles.consentSection}>
              <Text style={styles.consentTitle}>Photo &amp; Video Consent</Text>
              <Text style={styles.consentText}>{photoConsent}</Text>
            </View>
          ) : null}

          {transportConsent ? (
            <View style={styles.consentSection}>
              <Text style={styles.consentTitle}>Transportation Consent</Text>
              <Text style={styles.consentText}>{transportConsent}</Text>
            </View>
          ) : null}

          {emergencyConsent ? (
            <View style={styles.consentSection}>
              <Text style={styles.consentTitle}>Emergency Treatment Authorization</Text>
              <Text style={styles.consentText}>{emergencyConsent}</Text>
            </View>
          ) : null}
        </View>

        {/* SIGNATURE */}
        <View style={styles.sigBlock}>
          <Text style={styles.sigTitle}>
            {isYouthU18 ? 'PARENT / GUARDIAN SIGNATURE' : 'PARTICIPANT SIGNATURE'}
          </Text>

          {isYouthU18 ? (
            <View>
              <View style={styles.sigRow}>
                <Text style={styles.sigLabel}>Parent/Guardian Full Legal Name:</Text>
                <View style={styles.sigLine} />
              </View>
              <View style={styles.sigRow}>
                <Text style={styles.sigLabel}>Relationship to Participant:</Text>
                <View style={styles.sigLine} />
              </View>
            </View>
          ) : (
            <View style={styles.sigRow}>
              <Text style={styles.sigLabel}>Full Legal Name:</Text>
              <View style={styles.sigLine} />
            </View>
          )}

          <View style={styles.sigRow}>
            <Text style={styles.sigLabel}>Signature:</Text>
            <View style={[styles.sigLine, { height: 30 }]} />
          </View>

          <View style={styles.sigRow}>
            <Text style={styles.sigLabel}>Date:</Text>
            <View style={[styles.sigLine, { flex: 0, width: '40%' }]} />
          </View>

          {isYouthU18 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 9, color: '#555555', fontStyle: 'italic' }}>
                Initials confirming each section read: Waiver ____ Medical ____ Photo/Video ____ Transportation ____ Emergency ____
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          {orgName} | {activityName} | Page 3 of 3 | Printed: {today}
        </Text>
      </Page>
    </Document>
  )
}

export default BlankFormTemplate
