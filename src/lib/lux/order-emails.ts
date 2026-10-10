import { prisma } from '@/lib/prisma'
import { appUrl, programOrderEmail, sendLuxEmail } from '@/lib/lux/email'
import { createMagicLink, EMAILED_LINK_MINUTES, magicLinkUrl } from '@/lib/lux/family-session'
import { parseLuxSettings } from '@/lib/lux/settings'
import { FAMILY_OUTSTANDING } from '@/lib/lux/program-status'
import { documentLabel } from '@/lib/lux/i18n'
import { parseSessions } from '@/lib/lux/program-templates'

/** Link a family can use to pay (or finish paying) an order online */
export function orderPayUrl(orgSlug: string, orderId: string, payToken: string): string {
  return appUrl(`/lux/${orgSlug}/pay/${orderId}?t=${payToken}`)
}

/**
 * The "registration received" email for a faith formation order, with a
 * family link (signs them in to upload documents) and, when something is
 * owed, a pay link.
 */
export async function sendOrderConfirmation(orderId: string, receiptUrl?: string | null): Promise<boolean> {
  const order = await prisma.luxOrder.findUnique({
    where: { id: orderId },
    include: {
      household: true,
      organization: { select: { id: true, name: true, contactEmail: true, publicSlug: true, luxSettings: true } },
      registrations: {
        where: { status: { not: 'cancelled' } },
        include: {
          child: { select: { firstName: true, lastName: true } },
          program: { select: { name: true, confirmationMessage: true, sessions: true } },
          documents: { include: { requirement: { select: { label: true, required: true } } } },
        },
      },
    },
  })
  if (!order || !order.organization.publicSlug) return false

  const settings = parseLuxSettings(order.organization.luxSettings)
  const token = await createMagicLink({
    organizationId: order.organizationId,
    householdId: order.householdId,
    minutes: EMAILED_LINK_MINUTES,
  })
  const amountDue = Math.max(0, Number(order.amountDue) - Number(order.amountPaid))
  const state =
    order.status === 'paid' ? (Number(order.total) > 0 ? 'paid' : 'free')
    : order.status === 'waived' ? 'free'
    : order.status === 'assistance_requested' ? 'assistance_requested'
    : order.status === 'office_pending' ? 'office'
    : 'card_pending'

  const lang = order.household.preferredLanguage === 'es' ? 'es' : 'en'
  const email = programOrderEmail({
    lang,
    organizationName: order.organization.name,
    guardianFirstName: order.household.guardian1FirstName,
    confirmationCode: order.confirmationCode,
    children: order.registrations.map(r => ({
      childName: `${r.child.firstName} ${r.child.lastName}`,
      programName: r.program.name,
      amount: Number(r.feeAmount),
      session: parseSessions(r.program.sessions).find(sess => sess.id === r.sessionId)?.name ?? null,
    })),
    breakdown: {
      subtotal: Number(order.subtotal),
      siblingDiscount: Number(order.siblingDiscount),
      familyCapAdjustment: Number(order.familyCapAdjustment),
      total: Number(order.total),
    },
    amountDue,
    state,
    receiptUrl,
    officeInstructions: settings.officePaymentInstructions,
    documentsNeeded: order.registrations.flatMap(r =>
      r.documents
        .filter(d => d.requirement.required && FAMILY_OUTSTANDING.includes(d.status))
        .map(d => ({ childName: r.child.firstName, label: documentLabel(lang, d.requirement.label) }))
    ),
    familyUrl: magicLinkUrl(appUrl(), token),
    payUrl: amountDue > 0 && state !== 'assistance_requested'
      ? orderPayUrl(order.organization.publicSlug, order.id, order.payToken)
      : undefined,
    confirmationMessages: [...new Set(order.registrations.map(r => r.program.confirmationMessage).filter(Boolean) as string[])],
  })
  return sendLuxEmail({
    organizationId: order.organizationId,
    organizationName: order.organization.name,
    to: order.household.email,
    recipientName: `${order.household.guardian1FirstName} ${order.household.guardian1LastName}`,
    replyTo: order.organization.contactEmail,
    registrationId: order.id,
    registrationType: 'lux_order',
    emailType: `lux_program_order_${state}`,
    redactFromLog: true,
    ...email,
  })
}
