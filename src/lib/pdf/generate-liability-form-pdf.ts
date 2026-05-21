import { prisma } from '@/lib/prisma'
import YouthU18Template from './templates/youth-u18-template'
import YouthO18ChaperoneTemplate from './templates/youth-o18-chaperone-template'
import ClergyTemplate from './templates/clergy-template'
import { withRenderLock } from './render-lock'

// Type for form data with relations (from Prisma)
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

export async function generateLiabilityFormPDF(
  formData: LiabilityFormWithRelations
): Promise<Buffer> {
  // Format event dates if available
  const eventDates = formData.event
    ? `${new Date(formData.event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(formData.event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : undefined

  // Parse location address JSON into a display string
  const locationAddress = formData.event?.locationAddress as {
    street?: string; city?: string; state?: string; zip?: string
  } | null | undefined
  const locationLine1 = locationAddress?.street || undefined
  const locationLine2 = [
    locationAddress?.city,
    locationAddress?.state,
    locationAddress?.zip,
  ].filter(Boolean).join(', ') || undefined

  // Format event time range
  const eventTime = formData.event?.startTime
    ? formData.event.endTime
      ? `${formData.event.startTime} – ${formData.event.endTime}`
      : formData.event.startTime
    : undefined

  // Fetch stored template wording — prefer event-specific, fall back to org-level
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

  const eventName = formData.event?.name || ''
  const orgName = formData.organization?.name || ''
  const resolveText = (text: string | null | undefined) =>
    text
      ? text.replace(/\[Activity Name\]/g, eventName).replace(/\[Organization Name\]/g, orgName)
      : undefined

  // Prepare common data structure
  const commonData = {
    id: formData.id,
    eventName: formData.event?.name,
    eventDates,
    organizationName: formData.organization?.name,
    locationName: formData.event?.locationName || undefined,
    locationLine1,
    locationLine2,
    eventTime,
    eventCoordinator: formData.organization?.contactName || undefined,
    participantFirstName: formData.participantFirstName,
    participantLastName: formData.participantLastName,
    participantPreferredName: formData.participantPreferredName || undefined,
    participantAge: formData.participantAge || undefined,
    participantGender: formData.participantGender || undefined,
    participantEmail: formData.participantEmail || undefined,
    participantPhone: formData.participantPhone || undefined,
    tShirtSize: formData.tShirtSize || undefined,
    medicalConditions: formData.medicalConditions || undefined,
    medications: formData.medications || undefined,
    allergies: formData.allergies || undefined,
    dietaryRestrictions: formData.dietaryRestrictions || undefined,
    adaAccommodations: formData.adaAccommodations || undefined,
    emergencyContact1Name: formData.emergencyContact1Name || undefined,
    emergencyContact1Phone: formData.emergencyContact1Phone || undefined,
    emergencyContact1Relation: formData.emergencyContact1Relation || undefined,
    emergencyContact2Name: formData.emergencyContact2Name || undefined,
    emergencyContact2Phone: formData.emergencyContact2Phone || undefined,
    emergencyContact2Relation: formData.emergencyContact2Relation || undefined,
    insuranceProvider: formData.insuranceProvider || undefined,
    insurancePolicyNumber: formData.insurancePolicyNumber || undefined,
    insuranceGroupNumber: formData.insuranceGroupNumber || undefined,
    signatureData: formData.signatureData as {
      full_legal_name: string
      initials: string
      date_signed: string
      ip_address?: string
      sections_initialed?: string[]
    },
    completedByEmail: formData.completedByEmail || undefined,
    completedAt: formData.completedAt || undefined,
    // Template wording (with placeholders resolved)
    generalWaiverText: resolveText(template?.generalWaiverText),
    medicalReleaseText: resolveText(template?.medicalReleaseText),
    photoVideoConsentText: resolveText(template?.photoVideoConsentText),
    transportationConsentText: resolveText(template?.transportationConsentText),
    emergencyTreatmentText: resolveText(template?.emergencyTreatmentText),
  }

  // Select template based on form type
  let pdfTemplate: any

  switch (formData.formType) {
    case 'youth_u18':
      pdfTemplate = YouthU18Template({ data: commonData })
      break

    case 'youth_o18_chaperone':
      pdfTemplate = YouthO18ChaperoneTemplate({
        data: {
          ...commonData,
          participantType: formData.participantType || undefined,
          safeEnvironmentCertificates: formData.safeEnvironmentCertificates?.map(cert => ({
            programName: cert.programName || undefined,
            completionDate: cert.completionDate || undefined,
            expirationDate: cert.expirationDate || undefined,
            status: cert.status || undefined,
          })),
        },
      })
      break

    case 'clergy':
    case 'religious':
      pdfTemplate = ClergyTemplate({
        data: {
          ...commonData,
          clergyTitle: formData.clergyTitle || undefined,
          dioceseOfIncardination: formData.dioceseOfIncardination || undefined,
          currentAssignment: formData.currentAssignment || undefined,
          facultyInformation: formData.facultyInformation || undefined,
          needsHousing: formData.needsHousing || false,
        },
      })
      break

    default:
      throw new Error(`Unknown form type: ${formData.formType}`)
  }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  return withRenderLock(() => renderToBuffer(pdfTemplate))
}
