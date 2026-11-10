import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { secureFileLink } from '@/lib/r2/private-files'
import { generateVendorCode, generateVendorAccessCode } from '@/lib/access-code'
import { logVendorActivity, toCents } from '@/lib/vendor-admin'

interface VendorTier {
  id: string
  name: string
  price: string | number
  description?: string
  active?: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify event access
    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Event Vendors]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Fetch vendor registrations
    const vendors = await prisma.vendorRegistration.findMany({
      where: { eventId, organizationId: effectiveOrgId },
      include: {
        _count: {
          select: {
            boothStaff: true,
          },
        },
        liabilityForm: {
          select: { completed: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch custom question answers for all vendor registrations
    const vendorIds = vendors.map((v) => v.id)
    const customAnswers = vendorIds.length > 0
      ? await prisma.customRegistrationAnswer.findMany({
          where: {
            registrationId: { in: vendorIds },
            registrationType: 'vendor',
          },
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                displayOrder: true,
              },
            },
          },
        })
      : []

    // Group answers by registration ID
    const answersByRegistration: Record<string, typeof customAnswers> = {}
    for (const answer of customAnswers) {
      if (!answersByRegistration[answer.registrationId]) {
        answersByRegistration[answer.registrationId] = []
      }
      answersByRegistration[answer.registrationId].push(answer)
    }

    // Attach answers to vendor records
    const vendorsWithAnswers = vendors.map((v) => ({
      ...v,
      safeEnvironmentCertUrl: secureFileLink('vendor-cert', v.id, v.safeEnvironmentCertUrl),
      customAnswers: (answersByRegistration[v.id] || []).map((a) => ({
        questionText: a.question.questionText,
        answerText: a.answerText,
      })),
    }))

    const settings = await prisma.eventSettings.findUnique({
      where: { eventId },
      select: { vendorTiers: true },
    })
    const tiers = ((settings?.vendorTiers as VendorTier[] | null) || []).map((t) => ({
      id: t.id,
      name: t.name,
      price: Number(t.price || 0),
      active: t.active !== false,
    }))

    return NextResponse.json({ vendors: vendorsWithAnswers, tiers })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor registrations' },
      { status: 500 }
    )
  }
}


/**
 * Admin adds a vendor directly (phone/email signups, walk-ins) without the
 * public form. Created as pending with no email sent; the admin then uses
 * Review to approve and send the invoice.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Admin Add Vendor]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const required = ['businessName', 'contactFirstName', 'contactLastName', 'email'] as const
  for (const key of required) {
    if (!String(body[key] || '').trim()) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 })
    }
  }
  const tierPrice = toCents(Number(body.tierPrice || 0))
  if (!Number.isFinite(tierPrice) || tierPrice < 0) {
    return NextResponse.json({ error: 'Booth price must be a positive number' }, { status: 400 })
  }

  const uniqueCode = async (gen: () => string, field: 'vendorCode' | 'accessCode') => {
    for (let i = 0; i < 5; i++) {
      const code = gen()
      const existing = await prisma.vendorRegistration.findFirst({
        where: { [field]: code },
        select: { id: true },
      })
      if (!existing) return code
    }
    throw new Error(`Could not generate a unique ${field}`)
  }

  const vendor = await prisma.vendorRegistration.create({
    data: {
      eventId,
      organizationId: effectiveOrgId,
      businessName: String(body.businessName).trim(),
      contactFirstName: String(body.contactFirstName).trim(),
      contactLastName: String(body.contactLastName).trim(),
      email: String(body.email).trim(),
      phone: String(body.phone || '').trim(),
      boothDescription: String(body.boothDescription || '').trim(),
      selectedTier: String(body.selectedTier || '').trim() || 'Custom',
      tierPrice,
      additionalNeeds: String(body.additionalNeeds || '').trim() || null,
      status: 'pending',
      vendorCode: await uniqueCode(generateVendorCode, 'vendorCode'),
      accessCode: await uniqueCode(generateVendorAccessCode, 'accessCode'),
      paymentStatus: 'unpaid',
      amountPaid: 0,
    },
  })

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: effectiveOrgId,
    userId: user.id,
    editType: 'info_updated',
    action: 'created_by_admin',
  })

  return NextResponse.json({ vendor })
}
