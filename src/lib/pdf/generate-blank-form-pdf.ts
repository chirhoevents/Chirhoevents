import BlankFormTemplate, { BlankFormType } from './templates/blank-form-template'
import { withRenderLock } from './render-lock'

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

  const resolve = (stored: string | null | undefined, fallback: string) =>
    (stored || fallback)
      .replace(/\[Activity Name\]/g, activityName)
      .replace(/\[Organization Name\]/g, orgName)

  const data = {
    formType,
    eventName: event.name,
    eventDates,
    organizationName: organization.name,
    locationName: event.locationName || undefined,
    locationLine1,
    locationLine2,
    eventTime,
    eventCoordinator: organization.contactName || undefined,
    generalWaiverText: enabled.generalWaiver
      ? resolve(template?.generalWaiverText, `By signing this form, I (and/or as parent/guardian of the participant) agree to release and hold harmless ${orgName}, its officers, employees, and volunteers from any claims arising from participation in ${activityName} activities, except in cases of gross negligence or willful misconduct.`)
      : undefined,
    medicalReleaseText: enabled.medicalRelease
      ? resolve(template?.medicalReleaseText, `I authorize the staff and medical personnel of ${activityName} to obtain emergency medical treatment for the participant if I cannot be reached. I understand that every effort will be made to contact me first.`)
      : undefined,
    photoVideoConsentText: enabled.photoVideoConsent
      ? resolve(template?.photoVideoConsentText, `I grant permission to ${orgName} to use photographs and video recordings of the participant taken during ${activityName} for educational, promotional, and informational purposes without compensation.`)
      : undefined,
    transportationConsentText: enabled.transportationConsent
      ? resolve(template?.transportationConsentText, `I authorize ${orgName} and its designated drivers to transport the participant to and from ${activityName} activities and related outings in approved vehicles.`)
      : undefined,
    emergencyTreatmentText: enabled.emergencyTreatment
      ? resolve(template?.emergencyTreatmentText, `In the event of a medical emergency, I authorize event staff to consent to and obtain necessary emergency medical treatment for the participant. Every attempt will be made to contact the emergency contacts listed on this form before treatment is authorized.`)
      : undefined,
  }

  const element = BlankFormTemplate({ data })
  const { renderToBuffer } = await import('@react-pdf/renderer')
  return withRenderLock(() => renderToBuffer(element as any))
}
