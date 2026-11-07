import { prisma } from '@/lib/prisma'
import UnsubscribeButton from './UnsubscribeButton'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = {
  title: 'Stop vendor emails | ChiRho Events',
  robots: { index: false, follow: false },
}

export default async function VendorLeadUnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const lead = UUID_RE.test(token)
    ? await prisma.vendorLead.findUnique({
        where: { unsubscribeToken: token },
        select: {
          unsubscribedAt: true,
          vendorRegistration: { select: { businessName: true } },
          event: { select: { name: true } },
        },
      })
    : null

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        {!lead ? (
          <>
            <h1 className="text-xl font-semibold text-[#1E3A5F] mb-2">Link not valid</h1>
            <p className="text-[#6B7280]">This unsubscribe link has expired or is incorrect.</p>
          </>
        ) : lead.unsubscribedAt ? (
          <>
            <h1 className="text-xl font-semibold text-[#1E3A5F] mb-2">You&apos;re unsubscribed</h1>
            <p className="text-[#6B7280]">
              You won&apos;t get any more emails from {lead.vendorRegistration.businessName} through ChiRho Events.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[#1E3A5F] mb-2">
              Stop emails from {lead.vendorRegistration.businessName}?
            </h1>
            <p className="text-[#6B7280] mb-6">
              Your badge was scanned at their booth at {lead.event.name}. Unsubscribing stops their
              follow-up emails sent through ChiRho Events. It doesn&apos;t affect emails about the event itself.
            </p>
            <UnsubscribeButton token={token} businessName={lead.vendorRegistration.businessName} />
          </>
        )}
      </div>
    </div>
  )
}
