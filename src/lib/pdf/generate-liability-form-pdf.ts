import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import YouthU18Template from './templates/youth-u18-template'
import YouthO18ChaperoneTemplate from './templates/youth-o18-chaperone-template'
import ClergyTemplate from './templates/clergy-template'
import { withRenderLock } from './render-lock'
import type React from 'react'

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

/** Ensure a value is a plain string, never an object/Decimal/Date/React element. */
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

  const eventName = toSafeString(formData.event?.name)
  const orgName = toSafeString(formData.organization?.name)
  const resolveText = (text: string | null | undefined) =>
    text
      ? text.replace(/\[Activity Name\]/g, eventName).replace(/\[Organization Name\]/g, orgName)
      : undefined

  // Ensure signatureData is a plain object with string fields
  const rawSig = formData.signatureData as Record<string, unknown> | null | undefined
  const signatureData = {
    full_legal_name: toSafeString(rawSig?.full_legal_name),
    initials: toSafeString(rawSig?.initials),
    date_signed: toSafeString(rawSig?.date_signed),
    ip_address: rawSig?.ip_address ? toSafeString(rawSig.ip_address) : undefined,
    sections_initialed: Array.isArray(rawSig?.sections_initialed)
      ? (rawSig.sections_initialed as unknown[]).map(s => toSafeString(s)).filter(Boolean)
      : undefined,
  }

  // Prepare common data — all values are plain primitives, no objects
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
    completedAt: formData.completedAt instanceof Date ? formData.completedAt : undefined,
    // Template wording (with placeholders resolved)
    generalWaiverText: resolveText(template?.generalWaiverText),
    medicalReleaseText: resolveText(template?.medicalReleaseText),
    photoVideoConsentText: resolveText(template?.photoVideoConsentText),
    transportationConsentText: resolveText(template?.transportationConsentText),
    emergencyTreatmentText: resolveText(template?.emergencyTreatmentText),
  }

  // Call template functions directly (not via React.createElement) so that
  // renderToBuffer receives a <Document> element from @react-pdf/renderer,
  // not a user-component wrapper.  Template functions don't use hooks so
  // calling them as plain functions is safe.
  let element: React.ReactElement

  switch (formData.formType) {
    case 'youth_u18':
      element = YouthU18Template({ data: commonData }) as React.ReactElement
      break

    case 'youth_o18_chaperone':
      element = YouthO18ChaperoneTemplate({
        data: {
          ...commonData,
          participantType: toSafeString(formData.participantType) || undefined,
          safeEnvironmentCertificates: formData.safeEnvironmentCertificates?.map(cert => ({
            programName: toSafeString(cert.programName) || undefined,
            completionDate: cert.completionDate instanceof Date ? cert.completionDate : undefined,
            expirationDate: cert.expirationDate instanceof Date ? cert.expirationDate : undefined,
            status: toSafeString(cert.status) || undefined,
          })),
        },
      }) as React.ReactElement
      break

    case 'clergy':
    case 'religious':
      element = ClergyTemplate({
        data: {
          ...commonData,
          clergyTitle: toSafeString(formData.clergyTitle) || undefined,
          dioceseOfIncardination: toSafeString(formData.dioceseOfIncardination) || undefined,
          currentAssignment: toSafeString(formData.currentAssignment) || undefined,
          facultyInformation: toSafeString(formData.facultyInformation) || undefined,
          needsHousing: formData.needsHousing === true,
        },
      }) as React.ReactElement
      break

    default:
      throw new Error(`Unknown form type: ${formData.formType}`)
  }

  return withRenderLock(async () => {
    try {
      return await renderToBuffer(element)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      console.error('[generateLiabilityFormPDF] renderToBuffer failed:', msg)
      if (stack) console.error('[generateLiabilityFormPDF] stack:', stack)
      console.error('[generateLiabilityFormPDF] formType:', formData.formType, 'formId:', formData.id)
      throw err
    }
  })
}
