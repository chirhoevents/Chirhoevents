import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

function generatePaymentToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function GET(request: NextRequest) {
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    if (organizationId === 'platform-admin') {
      return NextResponse.json({ invoices: [] })
    }

    const now = new Date()

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['pending', 'overdue'] },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceType: true,
        amount: true,
        description: true,
        dueDate: true,
        status: true,
        paymentToken: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    const invoicesWithLinks = await Promise.all(
      overdueInvoices.map(async (invoice) => {
        let token = invoice.paymentToken
        if (!token) {
          token = generatePaymentToken()
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { paymentToken: token },
          })
        }

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceType: invoice.invoiceType,
          amount: Number(invoice.amount),
          description: invoice.description,
          dueDate: invoice.dueDate,
          status: invoice.status,
          paymentLink: `${appUrl}/pay/invoice/${token}`,
        }
      })
    )

    return NextResponse.json({ invoices: invoicesWithLinks })
  } catch (error) {
    console.error('Overdue invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overdue invoices' },
      { status: 500 }
    )
  }
}
