import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'
import { prismaIncludingCancelled as prisma } from '@/lib/prisma'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import { formatEventDate, formatMoney, formatTimeRange } from '@/lib/lux/format'
import { parseSimpleEventConfig } from '@/lib/lux/simple-event'
import { ticketLines } from '@/lib/lux/registrations'
import { retrieveCheckoutSession } from '@/lib/lux/stripe-checkout'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** "You're registered!" page after signing up for a Lux simple event */
export default async function LuxRegisteredPage({ params, searchParams }: {
  params: Promise<{ registrationId: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { registrationId } = await params
  const { session_id: sessionId } = await searchParams
  if (!UUID_RE.test(registrationId)) notFound()

  const registration = await prisma.individualRegistration.findUnique({
    where: { id: registrationId },
    include: {
      event: {
        include: { organization: { select: { name: true, logoUrl: true, publicSlug: true } } },
      },
    },
  })
  if (!registration || registration.event.mode !== 'simple') notFound()

  const balance = await prisma.paymentBalance.findUnique({ where: { registrationId } })
  const config = parseSimpleEventConfig(registration.event.luxConfig)
  const lines = ticketLines(registration.ticketSelections)
  const total = Number(balance?.totalAmountDue ?? 0)

  // Just back from Stripe and the webhook hasn't landed yet: ask Stripe directly
  let paidPendingWebhook = false
  if (registration.registrationStatus === 'incomplete' && sessionId?.startsWith('cs_')) {
    try {
      const session = await retrieveCheckoutSession(sessionId)
      paidPendingWebhook = session.payment_status === 'paid' && session.metadata?.registrationId === registrationId
    } catch {
      // Show the pending state below
    }
  }
  const paid = registration.registrationStatus === 'complete' || paidPendingWebhook
  const stillPaying = registration.registrationStatus === 'incomplete' && !paidPendingWebhook
  const owesOffice = registration.registrationStatus === 'pending_payment' && Number(balance?.amountRemaining ?? 0) > 0
  const event = registration.event
  const timeRange = formatTimeRange(event.startTime, event.endTime)

  return (
    <LuxPublicShell organizationName={event.organization.name} logoUrl={event.organization.logoUrl} parishSlug={event.organization.publicSlug}>
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-8 text-center">
        {stillPaying ? (
          <>
            <Clock className="h-14 w-14 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-semibold text-[#1E3A5F] mt-4">Payment not finished</h1>
            <p className="text-gray-600 mt-2">Your spot is held for a little while. If you closed the payment page, you can register again.</p>
            <Link href={`/events/${event.slug}?cancelled=1&r=${registration.id}`} className="inline-block mt-6 rounded-lg bg-[#1E3A5F] px-5 py-2.5 text-white">Try again</Link>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
            <h1 className="text-2xl font-semibold text-[#1E3A5F] mt-4" style={{ fontFamily: 'Georgia, serif' }}>You’re registered!</h1>
            <p className="text-gray-600 mt-2">A confirmation is on its way to <strong>{registration.email}</strong>.</p>

            <div className="text-left mt-6 rounded-xl bg-[#FAF8F3] p-5 space-y-2 text-sm">
              <p className="font-semibold text-[#1E3A5F] text-base">{event.name}</p>
              <p>{formatEventDate(event.startDate)}{timeRange ? ` · ${timeRange}` : ''}</p>
              {event.locationName && <p>{event.locationName}</p>}
              <div className="border-t border-[#E8E2D4] pt-2 mt-2">
                {lines.map((l, i) => (
                  <p key={i} className="flex justify-between"><span>{l.quantity}× {l.name}</span><span>{Number(l.amount) > 0 ? formatMoney(Number(l.amount)) : 'Free'}</span></p>
                ))}
                {total > 0 && <p className="flex justify-between font-semibold mt-1"><span>Total</span><span>{formatMoney(total)}</span></p>}
              </div>
              <p className="text-gray-500">Confirmation #{registration.confirmationCode}</p>
            </div>

            {paid && total > 0 && <p className="mt-4 text-green-700 font-medium">Paid in full. Thank you!</p>}
            {owesOffice && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 text-left">
                <p className="font-medium">Please pay {formatMoney(Number(balance?.amountRemaining))} at the parish office.</p>
                {config.officePayment.instructions && <p className="mt-1">{config.officePayment.instructions}</p>}
              </div>
            )}
            {config.confirmationMessage && <p className="mt-4 text-gray-700 whitespace-pre-line text-left">{config.confirmationMessage}</p>}
            <Link href={`/events/${event.slug}`} className="inline-block mt-6 text-sm text-[#9C8466] underline">Back to the event</Link>
          </>
        )}
      </div>
    </LuxPublicShell>
  )
}
