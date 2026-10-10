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
import { getLuxLang } from '@/lib/lux/i18n-server'
import { dict } from '@/lib/lux/i18n'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ orgSlug: string; orderId: string }>
  searchParams: Promise<{ t?: string; session_id?: string; uploadIssues?: string }>
}

/** "Registration received" page for a faith formation order */
export default async function OrderRegisteredPage({ params, searchParams }: Props) {
  const { orgSlug, orderId } = await params
  const { t: token, session_id: sessionId, uploadIssues } = await searchParams
  const order = await findOrderByPayToken(orderId, token)
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

  const [session, lang] = await Promise.all([getFamilySessionFromCookies(), getLuxLang()])
  const t = dict(lang)
  const r = t.registered
  const canUpload = !!session && session.householdId === order.householdId &&
    session.organizationId === order.organizationId && (!session.orderId || session.orderId === order.id)
  const documents = canUpload ? await familyDocuments(order.householdId, order.id) : []
  const settings = parseLuxSettings(order.organization.luxSettings)
  const owed = Math.max(0, Number(order.amountDue) - Number(order.amountPaid))
  const live = order.registrations.filter(r => r.status !== 'cancelled')
  const paid = order.status === 'paid' || order.status === 'waived' || justPaid
  const stillPaying = order.status === 'pending_payment' && !justPaid

  return (
    <LuxPublicShell organizationName={order.organization.name} logoUrl={order.organization.logoUrl} parishSlug={orgSlug} accentColor={settings.page.accentColor}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-7 text-center">
          {stillPaying ? (
            <>
              <Clock className="h-14 w-14 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-semibold text-[#1E3A5F] mt-3">{r.notFinished}</h1>
              <p className="text-gray-600 mt-2">{r.heldAWhile}</p>
              <Link href={`/lux/${orgSlug}/pay/${order.id}?t=${token}`} className="inline-block mt-5 rounded-lg bg-[#1E3A5F] px-5 py-2.5 text-white">{r.finishPaying}</Link>
            </>
          ) : (
            <>
              {order.status === 'assistance_requested'
                ? <HandHeart className="h-14 w-14 text-[#C8A24A] mx-auto" />
                : <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />}
              <h1 className="text-2xl font-semibold text-[#1E3A5F] mt-3" style={{ fontFamily: 'Georgia, serif' }}>{r.done}</h1>
              <p className="text-gray-600 mt-2">{r.confirmationTo} <strong>{order.household.email}</strong>.</p>
            </>
          )}

          <div className="text-left mt-6 rounded-xl bg-[#FAF8F3] p-5 text-sm">
            {live.map(reg => (
              <p key={reg.id} className="flex justify-between py-1"><span><strong>{reg.child.firstName}</strong> · {reg.program.name}</span><span>{formatMoney(Number(reg.feeAmount))}</span></p>
            ))}
            <p className="flex justify-between pt-2 mt-2 border-t border-[#EDE6D6] font-semibold"><span>{t.common.total}</span><span>{formatMoney(Number(order.total))}</span></p>
            <p className="text-gray-500 mt-1">{t.common.confirmation(order.confirmationCode)}</p>
          </div>

          {paid && Number(order.total) > 0 && <p className="mt-4 text-green-700 font-medium">{r.paidInFull}</p>}
          {order.status === 'office_pending' && owed > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 text-left">
              <p className="font-medium">{r.payAtOffice(formatMoney(owed))}</p>
              {settings.officePaymentInstructions && <p className="mt-1">{settings.officePaymentInstructions}</p>}
              <p className="mt-2">{r.preferCard} <Link className="underline" href={`/lux/${orgSlug}/pay/${order.id}?t=${token}`}>{r.payOnline}</Link></p>
            </div>
          )}
          {order.status === 'assistance_requested' && (
            <p className="mt-4 text-sm text-gray-700 text-left rounded-lg bg-[#FAF8F3] p-4">
              {r.assistance}
            </p>
          )}
        </div>

        {canUpload && documents.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E2D4] p-6">
            <h2 className="font-semibold text-[#1E3A5F] mb-1">{r.docsHeading}</h2>
            {uploadIssues && <p className="text-sm text-amber-700 mb-2">{r.uploadIssues}</p>}
            <p className="text-sm text-gray-600 mb-3">{r.docsHint}</p>
            <DocumentUploadList items={documents} lang={lang} />
          </div>
        )}
        {!canUpload && (
          <p className="text-center text-sm text-gray-600">{r.useLink}</p>
        )}
      </div>
    </LuxPublicShell>
  )
}
