import { prisma } from '@/lib/prisma'

interface LiabilityFormWithRelations {
  id: string
  formType: string
  participantFirstName: string
  participantLastName: string
  participantPreferredName?: string | null
  participantAge?: number | null
  participantGender?: string | null
  participantEmail?: string | null
  participantPhone?: string | null
  participantType?: string | null
  tShirtSize?: string | null
  clergyTitle?: string | null
  dioceseOfIncardination?: string | null
  currentAssignment?: string | null
  facultyInformation?: string | null
  needsHousing?: boolean | null
  medicalConditions?: string | null
  medications?: string | null
  allergies?: string | null
  dietaryRestrictions?: string | null
  adaAccommodations?: string | null
  emergencyContact1Name?: string | null
  emergencyContact1Phone?: string | null
  emergencyContact1Relation?: string | null
  emergencyContact2Name?: string | null
  emergencyContact2Phone?: string | null
  emergencyContact2Relation?: string | null
  insuranceProvider?: string | null
  insurancePolicyNumber?: string | null
  insuranceGroupNumber?: string | null
  signatureData: any
  completedByEmail?: string | null
  completedAt?: Date | null
  organizationId: string
  eventId: string
  event?: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    startTime?: string | null
    endTime?: string | null
    locationName?: string | null
    locationAddress?: unknown
  } | null
  organization?: {
    name: string
    contactName?: string | null
  } | null
  safeEnvironmentCertificates?: Array<{
    id: string
    programName?: string | null
    completionDate?: Date | null
    expirationDate?: Date | null
    status?: string
  }>
}

function toSafeString(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toLocaleDateString()
  return fallback
}

export async function generateLiabilityFormPDF(
  formData: LiabilityFormWithRelations
): Promise<Buffer> {
  const eventDates = formData.event
    ? `${new Date(formData.event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(formData.event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : undefined

  const locationAddress = formData.event?.locationAddress as {
    street?: string; city?: string; state?: string; zip?: string
  } | null | undefined
  const locationLine1 = locationAddress?.street || undefined
  const locationLine2 = [
    locationAddress?.city,
    locationAddress?.state,
    locationAddress?.zip,
  ].filter(Boolean).join(', ') || undefined

  const eventTime = formData.event?.startTime
    ? formData.event.endTime
      ? `${formData.event.startTime} – ${formData.event.endTime}`
      : formData.event.startTime
    : undefined

  const templateFormType = formData.formType === 'religious' ? 'religious' : formData.formType
  const template = await prisma.liabilityFormTemplate.findFirst({
    where: {
      organizationId: formData.organizationId,
      formType: templateFormType as any,
      active: true,
      OR: [{ eventId: formData.eventId }, { eventId: null }],
    },
    orderBy: [{ eventId: 'asc' }, { updatedAt: 'desc' }],
  }).catch(() => null)

  const eventName = toSafeString(formData.event?.name)
  const orgName = toSafeString(formData.organization?.name)
  const resolveText = (text: string | null | undefined) =>
    text
      ? text.replace(/\[Activity Name\]/g, eventName).replace(/\[Organization Name\]/g, orgName)
      : undefined

  const rawSig = formData.signatureData as Record<string, unknown> | null | undefined
  const signatureData = {
    full_legal_name: toSafeString(rawSig?.full_legal_name),
    initials: toSafeString(rawSig?.initials),
    date_signed: toSafeString(rawSig?.date_signed),
    ip_address: rawSig?.ip_address ? toSafeString(rawSig.ip_address) : undefined,
  }

  const commonData = {
    id: toSafeString(formData.id),
    eventName: toSafeString(formData.event?.name) || undefined,
    eventDates,
    organizationName: toSafeString(formData.organization?.name) || undefined,
    locationName: toSafeString(formData.event?.locationName) || undefined,
    locationLine1,
    locationLine2,
    eventTime,
    eventCoordinator: toSafeString(formData.organization?.contactName) || undefined,
    participantFirstName: toSafeString(formData.participantFirstName),
    participantLastName: toSafeString(formData.participantLastName),
    participantPreferredName: toSafeString(formData.participantPreferredName) || undefined,
    participantAge: typeof formData.participantAge === 'number' ? formData.participantAge : undefined,
    participantGender: toSafeString(formData.participantGender) || undefined,
    participantEmail: toSafeString(formData.participantEmail) || undefined,
    participantPhone: toSafeString(formData.participantPhone) || undefined,
    tShirtSize: toSafeString(formData.tShirtSize) || undefined,
    medicalConditions: toSafeString(formData.medicalConditions) || undefined,
    medications: toSafeString(formData.medications) || undefined,
    allergies: toSafeString(formData.allergies) || undefined,
    dietaryRestrictions: toSafeString(formData.dietaryRestrictions) || undefined,
    adaAccommodations: toSafeString(formData.adaAccommodations) || undefined,
    emergencyContact1Name: toSafeString(formData.emergencyContact1Name) || undefined,
    emergencyContact1Phone: toSafeString(formData.emergencyContact1Phone) || undefined,
    emergencyContact1Relation: toSafeString(formData.emergencyContact1Relation) || undefined,
    emergencyContact2Name: toSafeString(formData.emergencyContact2Name) || undefined,
    emergencyContact2Phone: toSafeString(formData.emergencyContact2Phone) || undefined,
    emergencyContact2Relation: toSafeString(formData.emergencyContact2Relation) || undefined,
    insuranceProvider: toSafeString(formData.insuranceProvider) || undefined,
    insurancePolicyNumber: toSafeString(formData.insurancePolicyNumber) || undefined,
    insuranceGroupNumber: toSafeString(formData.insuranceGroupNumber) || undefined,
    signatureData,
    completedByEmail: toSafeString(formData.completedByEmail) || undefined,
    generalWaiverText: resolveText(template?.generalWaiverText),
    medicalReleaseText: resolveText(template?.medicalReleaseText),
    photoVideoConsentText: resolveText(template?.photoVideoConsentText),
    transportationConsentText: resolveText(template?.transportationConsentText),
    emergencyTreatmentText: resolveText(template?.emergencyTreatmentText),
  }

  const isYouthU18 = formData.formType === 'youth_u18'
  const isAdultParticipant = formData.formType === 'youth_o18_chaperone'
  const isChaperone = isAdultParticipant && formData.participantType === 'chaperone'
  const isClergy = formData.formType === 'clergy' || formData.formType === 'religious'

  if (!isYouthU18 && !isAdultParticipant && !isClergy) {
    throw new Error(`Unknown form type: ${formData.formType}`)
  }

  const clergyTitleLabel =
    formData.clergyTitle === 'priest' ? 'Priest' :
    formData.clergyTitle === 'deacon' ? 'Deacon' :
    formData.clergyTitle === 'bishop' ? 'Bishop' :
    formData.clergyTitle === 'cardinal' ? 'Cardinal' : 'Clergy'

  const participantTypeLabel = formData.participantType === 'youth_o18' ? 'Youth (18+)' : 'Chaperone'

  const genderLabel =
    formData.participantGender === 'male' ? 'Male' :
    formData.participantGender === 'female' ? 'Female' : 'N/A'

  const formTitle =
    isYouthU18 ? 'LIABILITY FORM — YOUTH (UNDER 18)' :
    isAdultParticipant ? 'LIABILITY FORM — ADULT PARTICIPANT / CHAPERONE' :
    'LIABILITY FORM — CLERGY, SEMINARIANS & RELIGIOUS'

  const formId = commonData.id.substring(0, 8)
  const participantName = `${commonData.participantFirstName} ${commonData.participantLastName}`
  const eventNameStr = commonData.eventName || 'Event'

  // Dynamic import keeps PDFKit out of the webpack bundle for Edge runtimes
  const PDFDocument = (await import('pdfkit')).default

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const M = 40                            // margin
      const W = doc.page.width - M * 2        // content width (~515 for A4)
      const LW = Math.round(W * 0.36)         // label column width
      const VW = W - LW                       // value column width
      const PH = doc.page.height              // page height (~841 for A4)
      const BOTTOM = PH - 55                  // stop adding content here (footer zone)

      const NAVY = '#1E3A5F'
      const TAN = '#9C8466'
      const GRAY = '#6B7280'
      const RED = '#DC2626'
      const GREEN = '#059669'
      const AMBER = '#D97706'

      let y = M

      // Add a new page if there isn't enough vertical space remaining
      const checkPage = (need = 24) => {
        if (y + need > BOTTOM) { doc.addPage(); y = M }
      }

      // Page header — call once per page
      const renderHeader = (subtitle: string) => {
        doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY)
          .text(formTitle, M, y, { width: W, align: 'center' })
        y += 20
        doc.font('Helvetica').fontSize(9).fillColor(GRAY)
          .text(subtitle, M, y, { width: W, align: 'center' })
        y += 13
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(1.5).stroke()
        y += 10
      }

      // Section heading with tan underline
      const renderSection = (title: string) => {
        checkPage(32)
        doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text(title, M, y)
        y += 15
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 6
      }

      // Label + value row (handles multi-line values)
      const renderField = (label: string, value: string, opts?: { color?: string; bold?: boolean }) => {
        const vH = doc.font('Helvetica').fontSize(9).heightOfString(value || '—', { width: VW })
        const rowH = Math.max(17, vH + 3)
        checkPage(rowH)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text(label, M, y, { width: LW, lineBreak: false })
        doc.font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
          .fillColor(opts?.color || '#111111')
          .text(value || '—', M + LW, y, { width: VW })
        y += rowH + 1
      }

      // Consent section with grey background box and checkmark
      const renderConsent = (title: string, text: string) => {
        const tH = doc.font('Helvetica').fontSize(8).heightOfString(text, { width: W - 20 })
        const bH = 8 + 15 + 4 + tH + 10
        checkPage(bH + 6)
        doc.rect(M, y, W, bH).fillColor('#F3F4F6').fill()
        const by = y
        y += 8
        doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN)
          .text('✓ ', M + 8, y, { continued: true })
        doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(title)
        y += 15
        doc.font('Helvetica').fontSize(8).fillColor('#4B5563')
          .text(text, M + 8, y, { width: W - 20 })
        y = by + bH + 6
      }

      // ===================================================================
      // PAGE 1 — event info, participant info, medical info, type-specific
      // ===================================================================
      renderHeader(`Form ID: ${formId}`)

      // Event information box with light blue background
      {
        const evtFields: Array<[string, string]> = [
          ['Organization:', commonData.organizationName || '—'],
          ['Event Name:', commonData.eventName || '—'],
          ...(commonData.locationName ? [['Location:', commonData.locationName] as [string, string]] : []),
          ...(commonData.locationLine1 ? [['Address:', commonData.locationLine1] as [string, string]] : []),
          ...(commonData.locationLine2 ? [['City/State/Zip:', commonData.locationLine2] as [string, string]] : []),
          ['Date:', commonData.eventDates || '—'],
          ...(commonData.eventTime ? [['Time:', commonData.eventTime] as [string, string]] : []),
          ...(commonData.eventCoordinator ? [['Coordinator:', commonData.eventCoordinator] as [string, string]] : []),
        ]
        const boxH = 10 + 20 + evtFields.length * 17 + 8
        doc.rect(M, y, W, boxH).fillColor('#F0F4F8').fill()
        const by = y
        y += 8
        doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('EVENT INFORMATION', M + 8, y)
        y += 15
        doc.moveTo(M + 8, y).lineTo(M + W - 8, y).strokeColor(TAN).lineWidth(0.5).stroke()
        y += 4
        for (const [lb, vl] of evtFields) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
            .text(lb, M + 8, y, { width: LW - 8, lineBreak: false })
          doc.font('Helvetica').fontSize(9).fillColor('#111111')
            .text(vl, M + LW + 8, y, { width: VW - 8 })
          y += 17
        }
        y = by + boxH + 12
      }

      // Section 1 — Participant Information
      renderSection('1. PARTICIPANT INFORMATION')

      if (isClergy) {
        // Purple box for clergy title
        checkPage(32)
        doc.rect(M, y, W, 26).fillColor('#EDE9FE').fill()
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text('Clergy Title:', M + 8, y + 8, { width: LW - 8, lineBreak: false })
        doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
          .text(clergyTitleLabel, M + LW + 8, y + 8, { width: VW - 8 })
        y += 32
      }

      if (isAdultParticipant) renderField('Participant Type:', participantTypeLabel)
      renderField('Full Legal Name:', participantName)
      if (commonData.participantPreferredName) renderField('Preferred Name:', commonData.participantPreferredName)
      renderField('Age:', commonData.participantAge !== undefined ? String(commonData.participantAge) : 'N/A')
      renderField('Gender:', genderLabel)
      if (!isYouthU18) {
        renderField('Email:', commonData.participantEmail || 'N/A')
        renderField('Phone:', commonData.participantPhone || 'N/A')
      }
      if (commonData.tShirtSize) renderField('T-Shirt Size:', commonData.tShirtSize)

      // Clergy-specific information section
      if (isClergy) {
        y += 4
        renderSection('2. CLERGY INFORMATION')
        renderField('Diocese of Incardination:', toSafeString(formData.dioceseOfIncardination, 'N/A'))
        renderField('Current Assignment:', toSafeString(formData.currentAssignment, 'N/A'))
        if (formData.facultyInformation) {
          const fi = toSafeString(formData.facultyInformation)
          const fiH = doc.font('Helvetica').fontSize(9).heightOfString(fi, { width: W })
          checkPage(14 + fiH + 6)
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Faculty Information:', M, y)
          y += 13
          doc.font('Helvetica').fontSize(9).fillColor('#374151').text(fi, M, y, { width: W })
          y += fiH + 6
        }
        renderField('Needs Housing:', formData.needsHousing ? 'Yes' : 'No', {
          color: formData.needsHousing ? GREEN : GRAY,
          bold: true,
        })
      }

      // Medical Information
      y += 4
      const medNum = isClergy ? '3' : '2'
      renderSection(`${medNum}. MEDICAL INFORMATION`)
      renderField('Medical Conditions:', commonData.medicalConditions || 'None reported')
      renderField('Current Medications:', commonData.medications || 'None')
      const alg = commonData.allergies
      renderField('ALLERGIES:', alg ? alg.toUpperCase() : 'None', { color: alg ? RED : undefined, bold: !!alg })
      renderField('Dietary Restrictions:', commonData.dietaryRestrictions || 'None')
      renderField('ADA Accommodations:', commonData.adaAccommodations || 'None')

      // Safe Environment Certification (chaperone only)
      if (isChaperone) {
        y += 4
        renderSection('3. SAFE ENVIRONMENT CERTIFICATION')
        const certs = formData.safeEnvironmentCertificates
        const hasCert = certs && certs.length > 0
        const bH = hasCert ? 26 * 4 + 12 : 26 * 2 + 12
        checkPage(bH + 4)
        doc.rect(M, y, W, bH).fillColor('#DBEAFE').fill()
        const by = y
        y += 8
        if (hasCert) {
          const cert = certs![0]
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Status:', M + 8, y, { width: LW - 8, lineBreak: false })
          doc.font('Helvetica').fontSize(9).fillColor(GREEN).text('✓ Uploaded', M + LW + 8, y)
          y += 18
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Program:', M + 8, y, { width: LW - 8, lineBreak: false })
          doc.font('Helvetica').fontSize(9).fillColor('#111111').text(toSafeString(cert.programName, 'N/A'), M + LW + 8, y)
          y += 18
          const cd = cert.completionDate instanceof Date ? cert.completionDate.toLocaleDateString() : 'N/A'
          const ed = cert.expirationDate instanceof Date ? cert.expirationDate.toLocaleDateString() : 'N/A'
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Completion Date:', M + 8, y, { width: LW - 8, lineBreak: false })
          doc.font('Helvetica').fontSize(9).fillColor('#111111').text(cd, M + LW + 8, y)
          y += 18
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Expiration Date:', M + 8, y, { width: LW - 8, lineBreak: false })
          doc.font('Helvetica').fontSize(9).fillColor('#111111').text(ed, M + LW + 8, y)
          y += 18
        } else {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Status:', M + 8, y, { width: LW - 8, lineBreak: false })
          doc.font('Helvetica-Bold').fontSize(9).fillColor(AMBER).text('Pending Upload', M + LW + 8, y)
          y += 18
          doc.font('Helvetica').fontSize(8).fillColor(GRAY)
            .text('Certificate will be uploaded to the Group Leader Portal', M + 8, y)
          y += 14
        }
        y = by + bH + 8
      }

      // ===================================================================
      // PAGE 2 — emergency contacts, insurance
      // ===================================================================
      doc.addPage()
      y = M
      renderHeader(`${participantName} (continued)`)

      const emgNum = (isClergy || isChaperone) ? '4' : '3'
      renderSection(`${emgNum}. EMERGENCY CONTACTS`)

      checkPage(16)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text('Primary Contact:', M, y)
      y += 14
      renderField('Name:', commonData.emergencyContact1Name || 'N/A')
      renderField('Phone:', commonData.emergencyContact1Phone || 'N/A')
      renderField('Relationship:', commonData.emergencyContact1Relation || 'N/A')

      if (commonData.emergencyContact2Name) {
        y += 6
        checkPage(16)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text('Secondary Contact:', M, y)
        y += 14
        renderField('Name:', commonData.emergencyContact2Name)
        renderField('Phone:', commonData.emergencyContact2Phone || 'N/A')
        renderField('Relationship:', commonData.emergencyContact2Relation || 'N/A')
      }

      y += 6
      const insNum = (isClergy || isChaperone) ? '5' : '4'
      renderSection(`${insNum}. INSURANCE INFORMATION`)
      renderField('Insurance Provider:', commonData.insuranceProvider || 'N/A')
      renderField('Policy Number:', commonData.insurancePolicyNumber || 'N/A')
      renderField('Group Number:', commonData.insuranceGroupNumber || 'N/A')

      // ===================================================================
      // PAGE 3 — consent sections, electronic signature
      // ===================================================================
      doc.addPage()
      y = M
      renderHeader(`${participantName} (continued)`)

      const consentNum = (isClergy || isChaperone) ? '6' : '5'
      renderSection(`${consentNum}. CONSENT & WAIVER`)

      checkPage(14)
      const preamble = isYouthU18
        ? 'The parent/guardian has reviewed and agreed to the following sections:'
        : 'The participant has reviewed and agreed to the following sections:'
      doc.font('Helvetica').fontSize(9).fillColor('#374151').text(preamble, M, y, { width: W })
      y += 14

      if (commonData.generalWaiverText) renderConsent('Waiver and Release of Liability', commonData.generalWaiverText)
      if (commonData.medicalReleaseText) renderConsent('Medical Release Authorization', commonData.medicalReleaseText)
      if (commonData.photoVideoConsentText) renderConsent('Photo & Video Consent', commonData.photoVideoConsentText)
      if (commonData.transportationConsentText) renderConsent('Transportation Consent', commonData.transportationConsentText)
      if (commonData.emergencyTreatmentText) renderConsent('Emergency Treatment Authorization', commonData.emergencyTreatmentText)

      // Electronic Signature block
      y += 8
      const sigFields: Array<[string, string]> = [
        [
          isYouthU18 ? 'Parent/Guardian Full Legal Name:' : 'Full Legal Name:',
          commonData.signatureData.full_legal_name || 'N/A',
        ],
        ...(isYouthU18 ? [['Participant Full Name:', participantName] as [string, string]] : []),
        ['Initials:', commonData.signatureData.initials || 'N/A'],
        ['Date Signed:', commonData.signatureData.date_signed || 'N/A'],
        ['Completed By:', commonData.completedByEmail || 'N/A'],
        ...(commonData.signatureData.ip_address ? [['IP Address:', commonData.signatureData.ip_address] as [string, string]] : []),
      ]

      const sigBH = 10 + 16 + sigFields.length * 17 + 8 + 16
      checkPage(sigBH)
      doc.rect(M, y, W, sigBH).fillColor('#F9FAFB').fill()
      doc.rect(M, y, W, sigBH).strokeColor('#D1D5DB').lineWidth(0.8).stroke()
      y += 10
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('ELECTRONIC SIGNATURE', M + 10, y)
      y += 16

      for (const [lb, vl] of sigFields) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text(lb, M + 10, y, { width: LW, lineBreak: false })
        doc.font('Helvetica').fontSize(9).fillColor('#111111')
          .text(vl, M + LW + 10, y, { width: VW - 10 })
        y += 17
      }

      y += 4
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN)
        .text('✓ ', M + 10, y, { continued: true })
      doc.font('Helvetica').fontSize(8).fillColor('#374151')
        .text('I certify that all information provided in this form is accurate and complete.', { width: W - 20 })

      // ===================================================================
      // FOOTERS — applied to every page after all content is written
      // ===================================================================
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor('#E5E7EB').lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(
            `ChiRho Events | Form ID: ${formId} | Page ${i + 1} of ${pagesRange.count}`,
            M, fy, { width: W, align: 'center' },
          )
        doc.font('Helvetica').fontSize(7).fillColor(GRAY)
          .text(
            `${eventNameStr} | Generated: ${new Date().toLocaleDateString()}`,
            M, fy + 10, { width: W, align: 'center' },
          )
      }

      doc.end()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      console.error('[generateLiabilityFormPDF] PDFKit failed:', msg)
      if (stack) console.error('[generateLiabilityFormPDF] stack:', stack)
      console.error('[generateLiabilityFormPDF] formType:', formData.formType, 'formId:', formData.id)
      reject(err)
    }
  })
}
