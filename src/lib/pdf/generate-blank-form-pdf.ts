import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import BlankFormTemplate, { BlankFormType } from './templates/blank-form-template'

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

export async function generateBlankFormPDF(
  formType: BlankFormType,
  event: EventData,
  organization: OrgData,
  template?: TemplateData | null
): Promise<Buffer> {
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

  // Resolve stored text with placeholder substitution, or fall back to generic defaults
  // so the printed blank form always includes readable consent sections.
  const resolve = (stored: string | null | undefined, fallback: string) =>
    (stored || fallback)
      .replace(/\[Activity Name\]/g, activityName)
      .replace(/\[Organization Name\]/g, orgName)

  const generalWaiverText = resolve(
    template?.generalWaiverText,
    `By signing this form, I (and/or as parent/guardian of the participant) agree to release and hold harmless ${orgName}, its officers, employees, and volunteers from any claims arising from participation in ${activityName} activities, except in cases of gross negligence or willful misconduct.`
  )
  const medicalReleaseText = resolve(
    template?.medicalReleaseText,
    `I authorize the staff and medical personnel of ${activityName} to obtain emergency medical treatment for the participant if I cannot be reached. I understand that every effort will be made to contact me first.`
  )
  const photoVideoConsentText = resolve(
    template?.photoVideoConsentText,
    `I grant permission to ${orgName} to use photographs and video recordings of the participant taken during ${activityName} for educational, promotional, and informational purposes without compensation.`
  )
  const transportationConsentText = resolve(
    template?.transportationConsentText,
    `I authorize ${orgName} and its designated drivers to transport the participant to and from ${activityName} activities and related outings in approved vehicles.`
  )
  const emergencyTreatmentText = resolve(
    template?.emergencyTreatmentText,
    `In the event of a medical emergency, I authorize event staff to consent to and obtain necessary emergency medical treatment for the participant. Every attempt will be made to contact the emergency contacts listed on this form before treatment is authorized.`
  )

  const element = createElement(BlankFormTemplate, {
    data: {
      formType,
      eventName: event.name,
      eventDates,
      organizationName: organization.name,
      locationName: event.locationName || undefined,
      locationLine1,
      locationLine2,
      eventTime,
      eventCoordinator: organization.contactName || undefined,
      generalWaiverText,
      medicalReleaseText,
      photoVideoConsentText,
      transportationConsentText,
      emergencyTreatmentText,
    },
  })

  return renderToBuffer(element as any)
}
