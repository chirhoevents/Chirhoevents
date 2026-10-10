import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { createMagicLink, EMAILED_LINK_MINUTES, magicLinkUrl } from '@/lib/lux/family-session'
import { appUrl, familyLinkEmail, sendLuxEmail } from '@/lib/lux/email'
import { ensureOrgPublicSlug } from '@/lib/lux/org-slug'

type Params = { params: Promise<{ id: string }> }

/** POST /api/lux/households/[id]/link — email the family a link to their family page */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const household = await prisma.luxHousehold.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, email: true, guardian1FirstName: true, guardian1LastName: true },
  })
  if (!household) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  await ensureOrgPublicSlug(ctx.organizationId)
  const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { contactEmail: true } })
  const token = await createMagicLink({ organizationId: ctx.organizationId, householdId: household.id, minutes: EMAILED_LINK_MINUTES })
  const message = familyLinkEmail({
    organizationName: ctx.organization.name,
    guardianFirstName: household.guardian1FirstName,
    link: magicLinkUrl(appUrl(), token),
    expiresMinutes: EMAILED_LINK_MINUTES,
  })
  const sent = await sendLuxEmail({
    organizationId: ctx.organizationId,
    organizationName: ctx.organization.name,
    to: household.email,
    recipientName: `${household.guardian1FirstName} ${household.guardian1LastName}`,
    replyTo: org?.contactEmail || undefined,
    emailType: 'lux_family_link',
    redactFromLog: true,
    ...message,
  })
  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: 'household.link_sent',
    targetType: 'lux_household', targetId: household.id, ip: clientIp(request),
  })
  if (!sent) return NextResponse.json({ error: 'The email could not be sent. Please try again.' }, { status: 502 })
  return NextResponse.json({ success: true, email: household.email })
}
