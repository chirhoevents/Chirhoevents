export type BlankFormType = 'youth_u18' | 'youth_o18_chaperone' | 'clergy' | 'religious'

interface EventData {
  name: string
  startDate: Date
  endDate: Date
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
  locationAddress?: unknown
}

interface OrgData {
  name: string
  contactName?: string | null
}

interface TemplateData {
  generalWaiverText?: string | null
  medicalReleaseText?: string | null
  photoVideoConsentText?: string | null
  transportationConsentText?: string | null
  emergencyTreatmentText?: string | null
}

interface SectionFlags {
  generalWaiver: boolean
  medicalRelease: boolean
  photoVideoConsent: boolean
  transportationConsent: boolean
  emergencyTreatment: boolean
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

export async function generateBlankFormPDF(
  formType: BlankFormType,
  event: EventData,
  organization: OrgData,
  template?: TemplateData | null,
  sections?: SectionFlags
): Promise<Buffer> {
  const enabled: SectionFlags = sections ?? {
    generalWaiver: true,
    medicalRelease: true,
    photoVideoConsent: true,
    transportationConsent: true,
    emergencyTreatment: true,
  }

  const eventDates = `${new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const locationAddress = event.locationAddress as {
    street?: string; city?: string; state?: string; zip?: string
  } | null | undefined

  const locationLine1 = locationAddress?.street || undefined
  const locationLine2 = [locationAddress?.city, locationAddress?.state, locationAddress?.zip]
    .filter(Boolean).join(', ') || undefined

  const eventTime = event.startTime
    ? event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime
    : undefined

  const activityName = event.name
  const orgName = organization.name

  const resolveText = (stored: string | null | undefined, fallback: string) =>
    (stored || fallback)
      .replace(/\[Activity Name\]/g, activityName)
      .replace(/\[Organization Name\]/g, orgName)

  const genWaiver = enabled.generalWaiver
    ? resolveText(template?.generalWaiverText, `By signing this form, I (and/or as parent/guardian of the participant) agree to release and hold harmless ${orgName}, its officers, employees, and volunteers from any claims arising from participation in ${activityName} activities, except in cases of gross negligence or willful misconduct.`)
    : null

  const medRelease = enabled.medicalRelease
    ? resolveText(template?.medicalReleaseText, `I authorize the staff and medical personnel of ${activityName} to obtain emergency medical treatment for the participant if I cannot be reached. I understand that every effort will be made to contact me first.`)
    : null

  const photoConsent = enabled.photoVideoConsent
    ? resolveText(template?.photoVideoConsentText, `I grant permission to ${orgName} to use photographs and video recordings of the participant taken during ${activityName} for educational, promotional, and informational purposes without compensation.`)
    : null

  const transportConsent = enabled.transportationConsent
    ? resolveText(template?.transportationConsentText, `I authorize ${orgName} and its designated drivers to transport the participant to and from ${activityName} activities and related outings in approved vehicles.`)
    : null

  const emergencyConsent = enabled.emergencyTreatment
    ? resolveText(template?.emergencyTreatmentText, `In the event of a medical emergency, I authorize event staff to consent to and obtain necessary emergency medical treatment for the participant. Every attempt will be made to contact the emergency contacts listed on this form before treatment is authorized.`)
    : null

  const isYouthU18 = formType === 'youth_u18'
  const isClergy = formType === 'clergy'
  const isReligious = formType === 'religious'
  const isAdult = formType === 'youth_o18_chaperone'
  const isClergOrReligious = isClergy || isReligious

  const formTitle = FORM_TITLES[formType]
  const formSubtitle = FORM_SUBTITLES[formType]
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

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

      const M = 40
      const W = doc.page.width - M * 2       // ~515
      const PH = doc.page.height             // ~841
      const BOTTOM = PH - 55
      const LW = Math.round(W * 0.34)        // label width for full-width field rows
      const HW = (W - 12) / 2               // half-width for two-column rows

      const NAVY = '#1E3A5F'
      const TAN = '#9C8466'
      const GRAY = '#6B7280'
      const LINE_COLOR = '#555555'

      let y = M

      const checkPage = (need = 24) => {
        if (y + need > BOTTOM) { doc.addPage(); y = M }
      }

      // Horizontal fill-in line
      const drawLine = (x: number, ly: number, width: number) => {
        doc.moveTo(x, ly).lineTo(x + width, ly).strokeColor(LINE_COLOR).lineWidth(0.7).stroke()
      }

      // Small checkbox square
      const checkbox = (x: number, cy: number, sz = 9) => {
        doc.rect(x, cy - sz + 2, sz, sz).strokeColor('#555555').lineWidth(0.7).stroke()
      }

      // Section heading with tan underline
      const sectionHead = (title: string) => {
        checkPage(30)
        doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text(title, M, y)
        y += 14
        doc.moveTo(M, y).lineTo(M + W, y).strokeColor(TAN).lineWidth(0.8).stroke()
        y += 6
      }

      // Full-width label + blank line
      const fieldLine = (label: string, labelW = LW) => {
        checkPage(20)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text(label, M, y, { width: labelW, lineBreak: false })
        drawLine(M + labelW + 4, y + 10, W - labelW - 4)
        y += 20
      }

      // Two-column label + blank line (side by side)
      const twoCol = (left: [string, number], right: [string, number]) => {
        checkPage(20)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text(left[0], M, y, { width: left[1], lineBreak: false })
        drawLine(M + left[1] + 4, y + 10, HW - left[1] - 4)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text(right[0], M + HW + 12, y, { width: right[1], lineBreak: false })
        drawLine(M + HW + 12 + right[1] + 4, y + 10, HW - right[1] - 4)
        y += 20
      }

      // Consent text box with grey background
      const consentBlock = (title: string, text: string) => {
        const tH = doc.font('Helvetica').fontSize(8.5).heightOfString(text, { width: W - 20 })
        const bH = 8 + 13 + 4 + tH + 8
        checkPage(bH + 6)
        doc.rect(M, y, W, bH).fillColor('#F3F4F6').fill()
        const by = y
        y += 8
        doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(title, M + 8, y)
        y += 14
        doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(text, M + 8, y, { width: W - 20 })
        y = by + bH + 8
      }

      // ===================================================================
      // PAGE 1 — event info, participant info, medical info
      // ===================================================================

      // Page header
      doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY)
        .text(formTitle, M, y, { width: W, align: 'center' })
      y += 20
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
        .text(formSubtitle, M, y, { width: W, align: 'center' })
      y += 13
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(NAVY).lineWidth(1.5).stroke()
      y += 12

      // Event Information box (prefilled with event data)
      {
        const evtFields: Array<[string, string]> = [
          ['Organization:', orgName],
          ['Event Name:', activityName],
          ...(event.locationName ? [['Location:', event.locationName] as [string, string]] : []),
          ...(locationLine1 ? [['Address:', locationLine1] as [string, string]] : []),
          ...(locationLine2 ? [['City/State/Zip:', locationLine2] as [string, string]] : []),
          ['Date(s):', eventDates],
          ...(eventTime ? [['Time:', eventTime] as [string, string]] : []),
          ...(organization.contactName ? [['Coordinator:', organization.contactName] as [string, string]] : []),
        ]
        const evtLW = Math.round(W * 0.34)
        const boxH = 8 + 16 + evtFields.length * 16 + 8
        doc.rect(M, y, W, boxH).fillColor('#F0F4F8').fill()
        const by = y
        y += 8
        doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('EVENT INFORMATION', M + 8, y)
        y += 14
        doc.moveTo(M + 8, y).lineTo(M + W - 8, y).strokeColor(TAN).lineWidth(0.5).stroke()
        y += 4
        for (const [lb, vl] of evtFields) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
            .text(lb, M + 8, y, { width: evtLW - 8, lineBreak: false })
          doc.font('Helvetica').fontSize(9).fillColor('#111111')
            .text(vl, M + evtLW + 8, y, { width: W - evtLW - 16 })
          y += 16
        }
        y = by + boxH + 12
      }

      // Section 1 — Participant Information
      sectionHead('1. PARTICIPANT INFORMATION')

      twoCol(['First Name:', 55], ['Last Name:', 54])
      twoCol(['Preferred Name:', 80], [isYouthU18 ? 'Age:' : 'Date of Birth:', 80])

      if (isClergy) {
        fieldLine('Title (Fr./Dcn./Mr./etc.):', LW)
        fieldLine('Diocese of Incardination:', LW)
        fieldLine('Current Assignment / Parish:', LW)
        fieldLine('Faculty Information:', LW)
      }

      if (isReligious) {
        fieldLine('Title / Religious Name:', LW)
        fieldLine('Religious Order / Congregation:', LW)
        fieldLine('Current Convent / House:', LW)
      }

      if (isAdult) {
        checkPage(20)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text('Participant Type:', M, y, { lineBreak: false })
        let cx = M + 90
        for (const t of ['Youth 18+', 'Chaperone']) {
          checkbox(cx, y + 9)
          doc.font('Helvetica').fontSize(9).fillColor('#111111').text(t, cx + 12, y, { lineBreak: false })
          cx += 80
        }
        y += 20
      }

      // Gender checkboxes + T-Shirt on same row
      checkPage(20)
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Gender:', M, y, { lineBreak: false })
      let gx = M + 45
      for (const g of ['Male', 'Female', 'Prefer not to say']) {
        checkbox(gx, y + 9)
        doc.font('Helvetica').fontSize(9).fillColor('#111111').text(g, gx + 12, y, { lineBreak: false })
        gx += g.length * 5.5 + 20
      }
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
        .text('T-Shirt Size:', M + HW + 12, y, { lineBreak: false })
      drawLine(M + HW + 12 + 60, y + 10, HW - 60 - 12)
      y += 20

      twoCol(['Email:', 32], ['Phone:', 34])
      fieldLine('Parish / Parish of Origin:', LW)

      if (isClergOrReligious) {
        checkPage(20)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text('Needs Housing:', M, y, { lineBreak: false })
        let hx = M + 85
        for (const h of ['Yes', 'No']) {
          checkbox(hx, y + 9)
          doc.font('Helvetica').fontSize(9).fillColor('#111111').text(h, hx + 12, y, { lineBreak: false })
          hx += 40
        }
        y += 20
      }

      y += 4
      sectionHead('2. MEDICAL INFORMATION')
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY)
        .text('Write None if not applicable.', M, y)
      y += 14

      const medLW = Math.round(W * 0.36)
      fieldLine('Medical Conditions:', medLW)
      fieldLine('Current Medications:', medLW)
      fieldLine('Allergies:', medLW)
      fieldLine('Dietary Restrictions:', medLW)
      fieldLine('ADA Accommodations:', medLW)

      // ===================================================================
      // PAGE 2 — emergency contacts, insurance, optional safe environment
      // ===================================================================
      doc.addPage()
      y = M

      doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY)
        .text(`${formTitle} (continued)`, M, y, { width: W, align: 'center' })
      y += 14
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor('#D1D5DB').lineWidth(0.8).stroke()
      y += 12

      sectionHead('3. EMERGENCY CONTACTS')

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text('Primary Contact:', M, y)
      y += 13
      twoCol(['Name:', 35], ['Relationship:', 72])
      fieldLine('Phone:', 35)

      y += 6
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text('Secondary Contact (Optional):', M, y)
      y += 13
      twoCol(['Name:', 35], ['Relationship:', 72])
      fieldLine('Phone:', 35)

      y += 4
      sectionHead('4. INSURANCE INFORMATION')
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY)
        .text('Please provide your primary health insurance information.', M, y)
      y += 14

      const insLW = Math.round(W * 0.36)
      fieldLine('Insurance Provider:', insLW)
      fieldLine('Policy Number:', insLW)
      fieldLine('Group Number:', insLW)

      if (isAdult) {
        y += 4
        sectionHead('5. SAFE ENVIRONMENT CERTIFICATION')
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY)
          .text('Chaperones are required to have a current Safe Environment certification. Please list your certification(s) below.', M, y, { width: W })
        y += 22
        twoCol(['Program Name:', 80], ['Completion Date:', 90])
        twoCol(['Expiration Date:', 90], ['Status:', 40])
      }

      // ===================================================================
      // PAGE 3 — consent sections + signature
      // ===================================================================
      doc.addPage()
      y = M

      doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY)
        .text(`${formTitle} — Signature`, M, y, { width: W, align: 'center' })
      y += 14
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor('#D1D5DB').lineWidth(0.8).stroke()
      y += 12

      const consentSectionNum = isAdult ? '6' : '5'
      sectionHead(`${consentSectionNum}. CONSENT & RELEASE`)

      doc.font('Helvetica').fontSize(9).fillColor('#555555')
        .text('Please read each section carefully. By signing below you acknowledge that you have read, understand, and agree to the terms set forth in each section.', M, y, { width: W })
      y += 28

      if (genWaiver) consentBlock('Waiver and Release of Liability', genWaiver)
      if (medRelease) consentBlock('Medical Release Authorization', medRelease)
      if (photoConsent) consentBlock('Photo & Video Consent', photoConsent)
      if (transportConsent) consentBlock('Transportation Consent', transportConsent)
      if (emergencyConsent) consentBlock('Emergency Treatment Authorization', emergencyConsent)

      // Signature block
      y += 6
      const sigLabel = isYouthU18 ? 'Parent/Guardian Full Legal Name:' : 'Participant Full Legal Name:'
      const sigBH = 10 + 14 + (isYouthU18 ? 20 * 4 : 20 * 3) + 10
      checkPage(sigBH + 6)

      doc.rect(M, y, W, sigBH).fillColor('#F9FAFB').fill()
      doc.rect(M, y, W, sigBH).strokeColor('#D1D5DB').lineWidth(0.8).stroke()
      y += 10

      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('SIGNATURE', M + 10, y)
      y += 14

      const sigEntries: Array<[string, number]> = [
        [sigLabel, W - 20],
        ...(isYouthU18 ? [['Participant Name:', W - 20] as [string, number]] : []),
        ['Date:', 120],
        ['Initials:', 80],
      ]

      for (const [lb, lw] of sigEntries) {
        checkPage(20)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          .text(lb, M + 10, y, { lineBreak: false })
        drawLine(M + 10 + lw + 6, y + 10, W - lw - 20)
        y += 20
      }

      // ===================================================================
      // FOOTERS — applied to every page after all content is written
      // ===================================================================
      const pagesRange = doc.bufferedPageRange()
      for (let i = 0; i < pagesRange.count; i++) {
        doc.switchToPage(i)
        const fy = PH - 30
        doc.moveTo(M, fy - 5).lineTo(M + W, fy - 5).strokeColor('#E5E7EB').lineWidth(0.5).stroke()
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
          .text(
            `${orgName} | ${activityName} | Page ${i + 1} of ${pagesRange.count} | Printed: ${today}`,
            M, fy, { width: W, align: 'center' },
          )
      }

      doc.end()
    } catch (err) {
      console.error('[generateBlankFormPDF] PDFKit failed:', err instanceof Error ? err.message : String(err))
      reject(err)
    }
  })
}
