import { prisma } from './prisma'

export interface EmailLogData {
  organizationId: string
  eventId?: string
  registrationId?: string
  registrationType?: 'group' | 'individual' | 'vendor' | 'staff'
  recipientEmail: string
  recipientName?: string
  emailType: string
  subject: string
  htmlContent: string
  metadata?: Record<string, any>
}

/**
 * Logs an email to the database for tracking and resend purposes
 */
export async function logEmail(data: EmailLogData): Promise<void> {
  try {
    console.log('[EmailLogger] Logging email:', {
      registrationId: data.registrationId,
      registrationType: data.registrationType,
      emailType: data.emailType,
      recipientEmail: data.recipientEmail,
    })

    const result = await prisma.emailLog.create({
      data: {
        organizationId: data.organizationId,
        eventId: data.eventId || null,
        registrationId: data.registrationId || null,
        registrationType: data.registrationType || null,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName || null,
        emailType: data.emailType,
        subject: data.subject,
        htmlContent: data.htmlContent,
        sentStatus: 'sent',
        metadata: data.metadata || undefined,
      },
    })

    console.log('[EmailLogger] Email logged successfully with ID:', result.id)
  } catch (error) {
    // Log error but don't fail the email sending
    console.error('[EmailLogger] Failed to log email:', error)
    console.error('[EmailLogger] Email data:', JSON.stringify(data, null, 2))
  }
}

/**
 * Logs a failed email attempt
 */
export async function logEmailFailure(
  data: EmailLogData,
  errorMessage: string
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        organizationId: data.organizationId,
        eventId: data.eventId || null,
        registrationId: data.registrationId || null,
        registrationType: data.registrationType || null,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName || null,
        emailType: data.emailType,
        subject: data.subject,
        htmlContent: data.htmlContent,
        sentStatus: 'failed',
        errorMessage,
        metadata: data.metadata || undefined,
      },
    })
  } catch (error) {
    console.error('Failed to log email failure:', error)
  }
}

/**
 * Gets email history for a registration
 */
export async function getEmailHistory(
  registrationId: string,
  registrationType: 'group' | 'individual'
) {
  console.log('[EmailLogger] Fetching email history for:', {
    registrationId,
    registrationType,
  })

  const emails = await prisma.emailLog.findMany({
    where: {
      registrationId,
      registrationType,
    },
    orderBy: {
      sentAt: 'desc',
    },
    select: {
      id: true,
      recipientEmail: true,
      recipientName: true,
      emailType: true,
      subject: true,
      sentAt: true,
      sentStatus: true,
      htmlContent: true,
    },
  })

  console.log('[EmailLogger] Found emails:', emails.length)

  return emails
}

/**
 * Gets the most recent email for a registration
 */
export async function getLatestEmail(
  registrationId: string,
  registrationType: 'group' | 'individual'
) {
  return prisma.emailLog.findFirst({
    where: {
      registrationId,
      registrationType,
      sentStatus: 'sent',
    },
    orderBy: {
      sentAt: 'desc',
    },
    select: {
      id: true,
      recipientEmail: true,
      recipientName: true,
      emailType: true,
      subject: true,
      htmlContent: true,
      sentAt: true,
    },
  })
}
