import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit, requireLuxStaff } from '@/lib/lux/access'
import { appUrl, documentReminderEmail, sendLuxEmail } from '@/lib/lux/email'
import { createMagicLink, EMAILED_LINK_MINUTES, magicLinkUrl } from '@/lib/lux/family-session'
import { FAMILY_OUTSTANDING } from '@/lib/lux/program-status'

/**
 * POST /api/lux/reminders  { programId?, householdIds?, submissionIds? }
 * Emails each family a list of the documents they still owe, with a family
 * link straight to the upload page. One email per family.
 */
export async function POST(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const body = await request.json().catch(() => ({}))
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 2000) : undefined)

  const submissions = await prisma.luxDocumentSubmission.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: { in: FAMILY_OUTSTANDING },
      requirement: { required: true },
      programRegistration: {
        cancelledAt: null,
        ...(typeof body.programId === 'string' ? { programId: body.programId } : {}),
      },
      ...(ids(body.householdIds) ? { householdId: { in: ids(body.householdIds) } } : {}),
      ...(ids(body.submissionIds) ? { id: { in: ids(body.submissionIds) } } : {}),
    },
    include: {
      requirement: { select: { label: true } },
      child: { select: { firstName: true } },
      household: { select: { id: true, email: true, guardian1FirstName: true, guardian1LastName: true } },
      programRegistration: { select: { program: { select: { name: true } } } },
    },
  })
  const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { name: true, contactEmail: true } })

  const byHousehold = new Map<string, typeof submissions>()
  for (const s of submissions) byHousehold.set(s.householdId, [...(byHousehold.get(s.householdId) || []), s])

  let sent = 0
  for (const [householdId, items] of byHousehold) {
    const household = items[0].household
    const token = await createMagicLink({ organizationId: ctx.organizationId, householdId, minutes: EMAILED_LINK_MINUTES })
    const email = documentReminderEmail({
      organizationName: org!.name,
      guardianFirstName: household.guardian1FirstName,
      items: items.map(i => ({
        childName: i.child.firstName,
        programName: i.programRegistration.program.name,
        label: i.requirement.label,
        note: i.status === 'needs_resubmission' ? i.reviewerNote : null,
        needsResubmission: i.status === 'needs_resubmission',
      })),
      link: magicLinkUrl(appUrl(), token),
    })
    const ok = await sendLuxEmail({
      organizationId: ctx.organizationId,
      organizationName: org!.name,
      to: household.email,
      recipientName: `${household.guardian1FirstName} ${household.guardian1LastName}`,
      replyTo: org!.contactEmail,
      emailType: 'lux_document_reminder',
      redactFromLog: true,
      ...email,
    })
    if (ok) {
      sent++
      await prisma.luxDocumentSubmission.updateMany({ where: { id: { in: items.map(i => i.id) } }, data: { lastReminderAt: new Date() } })
    }
  }
  await luxAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.user.id,
    action: 'documents.reminders_sent',
    metadata: { families: byHousehold.size, sent },
    ip: clientIp(request),
  })
  return NextResponse.json({ families: byHousehold.size, sent })
}
