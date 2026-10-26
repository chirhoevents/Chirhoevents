import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'
import { escapeHtml } from '@/lib/lux/format'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  check: 'Check',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

// GET the values used to prefill the admin "Send Email to Registrant" templates
// (event name, balance, due date, access code, ...) so admins don't retype them.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || (user.role !== 'org_admin' && user.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const registrationType = searchParams.get('type') as 'group' | 'individual' | null
    if (registrationType !== 'group' && registrationType !== 'individual') {
      return NextResponse.json(
        { error: 'Registration type is required' },
        { status: 400 }
      )
    }

    const eventSelect = {
      name: true,
      startDate: true,
      startTime: true,
      timezone: true,
      locationName: true,
      pricing: { select: { fullPaymentDeadline: true } },
    }

    let organizationId: string
    let event: {
      name: string
      startDate: Date
      startTime: string | null
      timezone: string
      locationName: string | null
      pricing: { fullPaymentDeadline: Date | null } | null
    }
    let accessCode: string
    let incompleteCount = 0
    const detailRows: [string, string][] = []

    if (registrationType === 'group') {
      const reg = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: {
          organizationId: true,
          groupName: true,
          parishName: true,
          groupLeaderName: true,
          accessCode: true,
          totalParticipants: true,
          event: { select: eventSelect },
          participants: { select: { liabilityFormCompleted: true } },
        },
      })
      if (!reg) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }
      organizationId = reg.organizationId
      event = reg.event
      accessCode = reg.accessCode
      incompleteCount = reg.participants.filter((p) => !p.liabilityFormCompleted).length
      detailRows.push(['Group', reg.groupName])
      if (reg.parishName) detailRows.push(['Parish', reg.parishName])
      detailRows.push(['Group Leader', reg.groupLeaderName])
      detailRows.push(['Participants', String(reg.totalParticipants)])
      detailRows.push(['Access Code', reg.accessCode])
    } else {
      const reg = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        select: {
          organizationId: true,
          firstName: true,
          lastName: true,
          confirmationCode: true,
          event: { select: eventSelect },
        },
      })
      if (!reg) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }
      organizationId = reg.organizationId
      event = reg.event
      accessCode = reg.confirmationCode || ''
      detailRows.push(['Name', `${reg.firstName} ${reg.lastName}`])
      if (reg.confirmationCode) detailRows.push(['Confirmation Code', reg.confirmationCode])
    }

    if (!canAccessOrganization(user as any, organizationId)) {
      return NextResponse.json(
        { error: 'You do not have permission to access this registration' },
        { status: 403 }
      )
    }

    const [balance, lastPayment] = await Promise.all([
      prisma.paymentBalance.findUnique({ where: { registrationId } }),
      prisma.payment.findFirst({
        where: { registrationId, registrationType, paymentStatus: 'succeeded' },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const timeZone = event.timezone || 'America/New_York'
    const formatDate = (date: Date, tz = timeZone) =>
      date.toLocaleDateString('en-US', { timeZone: tz, year: 'numeric', month: 'long', day: 'numeric' })

    const totalDue = balance ? Number(balance.totalAmountDue) : null
    const amountPaid = balance ? Number(balance.amountPaid) : null
    const remaining = balance ? Math.max(0, Number(balance.amountRemaining)) : null

    if (totalDue !== null) detailRows.push(['Total', `$${totalDue.toFixed(2)}`])
    if (amountPaid !== null) detailRows.push(['Paid', `$${amountPaid.toFixed(2)}`])
    if (remaining !== null) detailRows.push(['Balance Remaining', `$${remaining.toFixed(2)}`])

    const registrationDetails = detailRows
      .map(([label, value]) => `<p style="margin: 5px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
      .join('')

    // Event start dates are stored as @db.Date (midnight UTC), so format in UTC
    // to avoid shifting the day back in US time zones.
    let checkInTime = formatDate(event.startDate, 'UTC')
    if (event.startTime) {
      const [h, m] = event.startTime.split(':').map(Number)
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const hour12 = h % 12 === 0 ? 12 : h % 12
        checkInTime += ` at ${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
      }
    }

    const paymentDate = lastPayment?.processedAt || lastPayment?.createdAt

    return NextResponse.json({
      success: true,
      context: {
        eventName: event.name,
        accessCode,
        registrationDetails,
        amountDue: remaining !== null ? remaining.toFixed(2) : '',
        dueDate: event.pricing?.fullPaymentDeadline
          ? formatDate(event.pricing.fullPaymentDeadline)
          : '',
        amount: lastPayment ? Number(lastPayment.amount).toFixed(2) : '',
        paymentDate: paymentDate ? formatDate(paymentDate) : '',
        paymentMethod: lastPayment
          ? PAYMENT_METHOD_LABELS[lastPayment.paymentMethod] || lastPayment.paymentMethod
          : '',
        remainingBalance: remaining !== null ? remaining.toFixed(2) : '',
        incompleteCount: incompleteCount > 0 ? String(incompleteCount) : '',
        checkInTime,
        checkInLocation: event.locationName || '',
      },
    })
  } catch (error) {
    console.error('[GET /email-context] Error building email context:', error)
    return NextResponse.json(
      { error: 'Failed to load registration details' },
      { status: 500 }
    )
  }
}
