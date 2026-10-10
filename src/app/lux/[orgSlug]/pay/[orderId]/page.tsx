import { notFound } from 'next/navigation'
import Link from 'next/link'
import { findOrderByPayToken } from '@/lib/lux/order-access'
import { parseLuxSettings } from '@/lib/lux/settings'
import { formatMoney } from '@/lib/lux/format'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import PayOrderButton from '@/components/lux/public/PayOrderButton'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orgSlug: string; orderId: string }>; searchParams: Promise<{ t?: string; cancelled?: string }> }

/** Pay what's owed on a faith formation registration (link from the family's email) */
export default async function PayOrderPage({ params, searchParams }: Props) {
  const { orgSlug, orderId } = await params
  const { t, cancelled } = await searchParams
  const order = await findOrderByPayToken(orderId, t)
  if (!order || order.organization.publicSlug !== orgSlug) notFound()

  const owed = Math.max(0, Math.round((Number(order.amountDue) - Number(order.amountPaid)) * 100) / 100)
  const live = order.registrations.filter(r => r.status !== 'cancelled')
  const settings = parseLuxSettings(order.organization.luxSettings)
  const cardAllowed = !!order.organization.stripeAccountId && order.organization.stripeChargesEnabled && live.every(r => r.program.onlinePaymentEnabled)

  return (
    <LuxPublicShell organizationName={order.organization.name} logoUrl={order.organization.logoUrl} parishSlug={orgSlug}>
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-7">
        <h1 className="text-2xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>Registration payment</h1>
        <p className="text-gray-600 mt-1">Confirmation #{order.confirmationCode}</p>
        {cancelled && owed > 0 && order.status !== 'cancelled' && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Your payment wasn’t completed. You can try again below.</p>
        )}
        <div className="mt-5 rounded-xl bg-[#FAF8F3] p-4 text-sm">
          {live.map(r => (
            <p key={r.id} className="flex justify-between py-1"><span><strong>{r.child.firstName}</strong> · {r.program.name}</span><span>{formatMoney(Number(r.feeAmount))}</span></p>
          ))}
          {Number(order.amountDue) !== Number(order.total) && (
            <p className="flex justify-between py-1 text-green-700"><span>Adjusted by the parish</span><span>{formatMoney(Number(order.amountDue))}</span></p>
          )}
          {Number(order.amountPaid) > 0 && <p className="flex justify-between py-1"><span>Paid so far</span><span>−{formatMoney(Number(order.amountPaid))}</span></p>}
          <p className="flex justify-between pt-2 mt-2 border-t border-[#EDE6D6] font-semibold text-base"><span>Amount due</span><span>{formatMoney(owed)}</span></p>
        </div>

        <div className="mt-6">
          {order.status === 'cancelled' ? (
            <p className="text-gray-700">This registration expired before it was paid. <Link className="underline" href={`/lux/${orgSlug}/register`}>Please register again.</Link></p>
          ) : owed <= 0 ? (
            <p className="text-green-700 font-medium">Nothing is owed. Thank you!</p>
          ) : (
            <div className="space-y-4">
              {cardAllowed && <PayOrderButton orderId={order.id} token={t!} label={`Pay ${formatMoney(owed)} by card`} />}
              <p className="text-sm text-gray-600">{cardAllowed ? 'Or pay' : 'Please pay'} at the parish office. {settings.officePaymentInstructions}</p>
            </div>
          )}
        </div>
      </div>
    </LuxPublicShell>
  )
}
