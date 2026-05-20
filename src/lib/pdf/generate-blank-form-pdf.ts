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
      generalWaiverText: template?.generalWaiverText || undefined,
      medicalReleaseText: template?.medicalReleaseText || undefined,
      photoVideoConsentText: template?.photoVideoConsentText || undefined,
      transportationConsentText: template?.transportationConsentText || undefined,
      emergencyTreatmentText: template?.emergencyTreatmentText || undefined,
    },
  })

  return renderToBuffer(element as any)
}
