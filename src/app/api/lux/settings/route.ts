import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { mergeLuxSettings, parseLuxSettings } from '@/lib/lux/settings'
import { describeFeeRules, parseFeeRules } from '@/lib/lux/family-fees'
import { ensureOrgPublicSlug, validatePublicSlug } from '@/lib/lux/org-slug'
import { privateBucketConfigured } from '@/lib/r2/private-files'
import type { ParishPageSettings } from '@/lib/lux/settings'

function pageTextPatch(raw: Record<string, unknown>): ParishPageSettings {
  const { headerImageUrl: _ignored, ...rest } = raw
  void _ignored
  return rest as unknown as ParishPageSettings
}

/** GET /api/lux/settings: the parish's Lux settings */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const settings = parseLuxSettings(ctx.organization.luxSettings)
  return NextResponse.json({
    ...settings,
    feeRulesSummary: describeFeeRules(settings.feeRules),
    publicSlug: await ensureOrgPublicSlug(ctx.organizationId),
    documentStorageReady: privateBucketConfigured(),
  })
}

/** PUT /api/lux/settings  { feeRules?, officePaymentInstructions?, publicSlug?, page? } */
export async function PUT(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const body = await request.json().catch(() => ({}))

  const data: Record<string, unknown> = {
    luxSettings: mergeLuxSettings(ctx.organization.luxSettings, {
      ...(body.feeRules !== undefined ? { feeRules: parseFeeRules(body.feeRules) } : {}),
      ...(body.officePaymentInstructions !== undefined ? { officePaymentInstructions: String(body.officePaymentInstructions) } : {}),
      // The header photo is only set by the upload endpoint
      ...(body.page && typeof body.page === 'object' ? { page: pageTextPatch(body.page) } : {}),
    }),
  }
  if (typeof body.publicSlug === 'string' && body.publicSlug !== ctx.organization.publicSlug) {
    const slug = body.publicSlug.trim().toLowerCase()
    const problem = validatePublicSlug(slug)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    const taken = await prisma.organization.findUnique({ where: { publicSlug: slug }, select: { id: true } })
    if (taken && taken.id !== ctx.organizationId) {
      return NextResponse.json({ error: 'That address is taken. Try adding your city.' }, { status: 400 })
    }
    data.publicSlug = slug
  }

  await prisma.organization.update({ where: { id: ctx.organizationId }, data })
  return NextResponse.json({ success: true })
}
