import { prisma } from '@/lib/prisma'

// Events whose vendor booth payments are collected by the ChiRho platform
// Stripe account instead of the hosting organization's connected account.
// Mount 2000 only — not a general feature.
const PLATFORM_COLLECTED_VENDOR_PAYMENT_EVENT_IDS = new Set<string>([
  '8c7aaf89-6790-4a81-bf6b-33e8dd8586f1', // Mount 2000
])

export function vendorPaymentsGoToPlatform(eventId: string): boolean {
  return PLATFORM_COLLECTED_VENDOR_PAYMENT_EVENT_IDS.has(eventId)
}

/**
 * Apply a succeeded vendor booth payment to the vendor's balance.
 * Idempotent per payment intent: the success-page confirmation and the Stripe
 * webhook both call this, and only the first one counts the money.
 */
export async function recordVendorPayment(
  vendorId: string,
  paymentIntentId: string,
  amountDollars: number
) {
  const claimed = await prisma.vendorRegistration.updateMany({
    where: {
      id: vendorId,
      OR: [
        { stripePaymentIntentId: null },
        { stripePaymentIntentId: { not: paymentIntentId } },
      ],
    },
    data: {
      stripePaymentIntentId: paymentIntentId,
      amountPaid: { increment: amountDollars },
    },
  })

  const vendor = await prisma.vendorRegistration.findUnique({
    where: { id: vendorId },
    select: { amountPaid: true, invoiceTotal: true, paidAt: true },
  })
  if (!vendor) return null

  const amountPaid = Number(vendor.amountPaid)
  const totalDue = vendor.invoiceTotal ? Number(vendor.invoiceTotal) : 0
  const paymentStatus: 'unpaid' | 'partial' | 'paid' =
    amountPaid >= totalDue ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'

  if (claimed.count > 0) {
    await prisma.vendorRegistration.update({
      where: { id: vendorId },
      data: {
        paymentStatus,
        paidAt: paymentStatus === 'paid' ? vendor.paidAt ?? new Date() : vendor.paidAt,
      },
    })
  }

  return { amountPaid, paymentStatus }
}
