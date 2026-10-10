import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

/** An order opened from an email link: the id plus its pay token must match */
export async function findOrderByPayToken(orderId: string, token: string | null | undefined) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(orderId)) return null
  const order = await prisma.luxOrder.findUnique({
    where: { id: orderId },
    include: {
      organization: { select: { id: true, name: true, publicSlug: true, logoUrl: true, contactEmail: true, luxSettings: true, stripeAccountId: true, stripeChargesEnabled: true, platformFeePercentage: true } },
      household: { select: { email: true, guardian1FirstName: true, guardian1LastName: true } },
      registrations: {
        include: {
          child: { select: { firstName: true, lastName: true } },
          program: { select: { name: true, term: true, onlinePaymentEnabled: true, payAtOfficeEnabled: true } },
        },
      },
    },
  })
  if (!order) return null
  const a = Buffer.from(order.payToken)
  const b = Buffer.from(token)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return order
}
