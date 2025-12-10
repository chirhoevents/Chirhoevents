import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import YouthU18Template from './templates/youth-u18-template'
import YouthO18ChaperoneTemplate from './templates/youth-o18-chaperone-template'
import ClergyTemplate from './templates/clergy-template'

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

  // Prepare common data structure
  const commonData = {
    id: formData.id,
    eventName: formData.event?.name,
    eventDates,
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
  }

  // Select template based on form type
  let template: any

  switch (formData.formType) {
    case 'youth_u18':
      template = createElement(YouthU18Template, { data: commonData })
      break

    case 'youth_o18_chaperone':
      template = createElement(YouthO18ChaperoneTemplate, {
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
      template = createElement(ClergyTemplate, {
        data: {
          ...commonData,
          clergyTitle: formData.clergyTitle || undefined,
          dioceseOfIncardination: formData.dioceseOfIncardination || undefined,
          currentAssignment: formData.currentAssignment || undefined,
          facultyInformation: formData.facultyInformation || undefined,
        },
      })
      break

    default:
      throw new Error(`Unknown form type: ${formData.formType}`)
  }

  // Generate PDF buffer
  const pdfBuffer = await renderToBuffer(template)

  return pdfBuffer
}
