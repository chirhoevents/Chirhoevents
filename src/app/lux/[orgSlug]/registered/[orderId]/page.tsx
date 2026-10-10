import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, HandHeart } from 'lucide-react'
import { findOrderByPayToken } from '@/lib/lux/order-access'
import { getFamilySessionFromCookies } from '@/lib/lux/family-session'
import { familyDocuments } from '@/lib/lux/family-documents'
import { parseLuxSettings } from '@/lib/lux/settings'
import { formatMoney } from '@/lib/lux/format'
import { retrieveCheckoutSession } from '@/lib/lux/stripe-checkout'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import DocumentUploadList from '@/components/lux/public/DocumentUploadList'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ orgSlug: string; orderId: string }>
  searchParams: Promise<{ t?: string; session_id?: string; uploadIssues?: string }>
}

/** "Registration received" page for a faith formation order */
export default async function OrderRegisteredPage({ params, searchParams }: Props) {
  const { orgSlug, orderId } = await params
  const { t, session_id: sessionId, uploadIssues } = await searchParams
  const order = await findOrderByPayToken(orderId, t)
  if (!order || order.organization.publicSlug !== orgSlug) notFound()

  let justPaid = false
  if (order.status === 'pending_payment' && sessionId?.startsWith('cs_')) {
    try {
      const session = await retrieveCheckoutSession(sessionId)
      justPaid = session.payment_status === 'paid' && session.metadata?.registrationId === order.id
    } catch {
      // Fall through to the pending message
    }
  }

  const session = await getFamilySessionFromCookies()
  const canUpload = !!session && session.householdId === order.householdId &&
    session.organizationId === order.organizationId && (!session.orderId || session.orderId === order.id)
  const documents = canUpload ? await familyDocuments(order.householdId, order.id) : []
  const settings = parseLuxSettings(order.organization.luxSettings)
  const owed = Math.max(0, Number(order.amountDue) - Number(order.amountPaid))
  const live = order.registrations.filter(r => r.status !== 'cancelled')
  const paid = order.status === 'paid' || order.status === 'waived' || justPaid
  const stillPaying = order.status === 'pending_payment' && !justPaid

  return (
    <LuxPublicShell organizationName={order.organization.name} logoUrl={order.organization.logoUrl} parishSlug={orgSlug}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-7 text-center">
          {stillPaying ? (
            <>
              <Clock className="h-14 w-14 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-semibold text-[#1E3A5F] mt-3">Payment not finished</h1>
              <p className="text-gray-600 mt-2">Your children’s spots are held for a little while.</p>
              <Link href={`/lux/${orgSlug}/pay/${order.id}?t=${t}`} className="inline-block mt-5 rounded-lg bg-[#1E3A5F] px-5 py-2.5 text-white">Finish paying</Link>
            </>
          ) : (
            <>
              {order.status === 'assistance_requested'
                ? <HandHeart className="h-14 w-14 text-[#C8A24A] mx-auto" />
                : <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />}
              <h1 className="text-2xl font-semibold text-[#1E3A5F] mt-3" style={{ fontFamily: 'Georgia, serif' }}>Your children are registered!</h1>
              <p className="text-gray-600 mt-2">A confirmation is on its way to <strong>{order.household.email}</strong>.</p>
            </>
          )}

          <div className="text-left mt-6 rounded-xl bg-[#FAF8F3] p-5 text-sm">
            {live.map(r => (
              <p key={r.id} className="flex justify-between py-1"><span><strong>{r.child.firstName}</strong> · {r.program.name}</span><span>{formatMoney(Number(r.feeAmount))}</span></p>
            ))}
            <p className="flex justify-between pt-2 mt-2 border-t border-[#EDE6D6] font-semibold"><span>Total</span><span>{formatMoney(Number(order.total))}</span></p>
            <p className="text-gray-500 mt-1">Confirmation #{order.confirmationCode}</p>
          </div>

          {paid && Number(order.total) > 0 && <p className="mt-4 text-green-700 font-medium">Paid in full. Thank you!</p>}
          {order.status === 'office_pending' && owed > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 text-left">
              <p className="font-medium">Please pay {formatMoney(owed)} at the parish office.</p>
              {settings.officePaymentInstructions && <p className="mt-1">{settings.officePaymentInstructions}</p>}
              <p className="mt-2">Prefer card? <Link className="underline" href={`/lux/${orgSlug}/pay/${order.id}?t=${t}`}>Pay online</Link></p>
            </div>
          )}
          {order.status === 'assistance_requested' && (
            <p className="mt-4 text-sm text-gray-700 text-left rounded-lg bg-[#FAF8F3] p-4">
              Thank you for letting us know. The parish will review your fee assistance request privately and contact you. Nothing is due right now.
            </p>
          )}
        </div>

        {canUpload && documents.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E2D4] p-6">
            <h2 className="font-semibold text-[#1E3A5F] mb-1">Documents</h2>
            {uploadIssues && <p className="text-sm text-amber-700 mb-2">Some files didn’t upload. Please try again below.</p>}
            <p className="text-sm text-gray-600 mb-3">Upload anything still needed now, or later from the link in your email.</p>
            <DocumentUploadList items={documents} />
          </div>
        )}
        {!canUpload && (
          <p className="text-center text-sm text-gray-600">To upload documents or update your information, use the family link in your confirmation email.</p>
        )}
      </div>
    </LuxPublicShell>
  )
}
