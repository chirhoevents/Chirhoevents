import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { secureFileLink } from '@/lib/r2/private-files'
import { logVendorActivity, toCents } from '@/lib/vendor-admin'

const EDITABLE_FIELDS = [
  'businessName',
  'contactFirstName',
  'contactLastName',
  'email',
  'phone',
  'boothDescription',
  'additionalNeeds',
  'selectedTier',
  'tierPrice',
] as const

async function authorize(request: NextRequest, eventId: string, logPrefix: string) {
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix,
  })
  if (error) return { error }
  if (!user || !effectiveOrgId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, orgId: effectiveOrgId }
}

/**
 * Full vendor record for the admin side panel: booth staff, payment history
 * (manual payments + refunds) and the activity/notes timeline.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const auth = await authorize(request, eventId, '[Vendor Detail]')
  if ('error' in auth) return auth.error

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: auth.orgId },
    include: {
      boothStaff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          checkedIn: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      liabilityForm: { select: { completed: true } },
      _count: { select: { boothStaff: true, leads: true } },
    },
  })
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const [payments, refunds, activity, emails] = await Promise.all([
    prisma.payment.findMany({
      where: { registrationId: vendor.id, registrationType: 'vendor' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentStatus: true,
        checkNumber: true,
        checkReceivedDate: true,
        notes: true,
        processedAt: true,
        createdAt: true,
        processedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.refund.findMany({
      where: { registrationId: vendor.id, registrationType: 'vendor' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        refundAmount: true,
        refundMethod: true,
        refundReason: true,
        notes: true,
        status: true,
        createdAt: true,
        processedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.registrationEdit.findMany({
      where: { registrationId: vendor.id, registrationType: 'vendor' },
      orderBy: { editedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        editType: true,
        changesMade: true,
        adminNotes: true,
        oldTotal: true,
        newTotal: true,
        emailSent: true,
        editedAt: true,
        editedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.emailLog.findMany({
      where: { registrationId: vendor.id, registrationType: 'vendor' },
      orderBy: { sentAt: 'desc' },
      take: 50,
      select: { id: true, subject: true, emailType: true, sentStatus: true, sentAt: true, recipientEmail: true },
    }),
  ])

  return NextResponse.json({
    vendor: {
      ...vendor,
      safeEnvironmentCertUrl: secureFileLink('vendor-cert', vendor.id, vendor.safeEnvironmentCertUrl),
    },
    payments,
    refunds,
    activity,
    emails,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const auth = await authorize(request, eventId, '[Vendor Edit]')
  if ('error' in auth) return auth.error

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: auth.orgId },
  })
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of EDITABLE_FIELDS) {
    if (body[key] === undefined) continue
    let value = body[key]
    if (key === 'tierPrice') {
      value = toCents(Number(value))
      if (!Number.isFinite(value as number) || (value as number) < 0) {
        return NextResponse.json({ error: 'Tier price must be a positive number' }, { status: 400 })
      }
    } else if (key !== 'additionalNeeds') {
      value = String(value ?? '').trim()
      if (!value) {
        return NextResponse.json({ error: `${key} cannot be empty` }, { status: 400 })
      }
    }
    const current = key === 'tierPrice' ? Number(vendor.tierPrice) : vendor[key]
    if (current !== value) {
      updates[key] = value
      changes[key] = { from: current, to: value }
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  const updated = await prisma.vendorRegistration.update({
    where: { id: vendor.id },
    data: updates,
  })

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: auth.orgId,
    userId: auth.user.id,
    editType: 'info_updated',
    action: 'details_edited',
    details: { changes },
  })

  return NextResponse.json({
    vendor: { ...updated, safeEnvironmentCertUrl: secureFileLink('vendor-cert', updated.id, updated.safeEnvironmentCertUrl) },
  })
}

/**
 * Delete a vendor (duplicates, test entries). Refused while money is on
 * file so a payment is never silently orphaned — refund first.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const auth = await authorize(request, eventId, '[Vendor Delete]')
  if ('error' in auth) return auth.error

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: auth.orgId },
    select: { id: true, amountPaid: true, _count: { select: { boothStaff: true } } },
  })
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }
  if (Number(vendor.amountPaid) > 0) {
    return NextResponse.json(
      { error: 'This vendor has payments on file. Refund them before deleting.' },
      { status: 400 }
    )
  }
  if (vendor._count.boothStaff > 0) {
    return NextResponse.json(
      { error: 'This vendor has booth staff registered. Remove them before deleting.' },
      { status: 400 }
    )
  }

  await prisma.$transaction([
    prisma.customRegistrationAnswer.deleteMany({
      where: { registrationId: vendor.id, registrationType: 'vendor' },
    }),
    prisma.vendorRegistration.delete({ where: { id: vendor.id } }),
  ])

  return NextResponse.json({ success: true })
}
