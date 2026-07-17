import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  const { eventId, staffId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Staff Resend Poros]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staff = await prisma.staffRegistration.findFirst({
    where: { id: staffId, eventId, organizationId: effectiveOrgId },
    include: {
      event: {
        include: {
          organization: { select: { name: true, contactEmail: true } },
          settings: { select: { contactEmail: true } },
        },
      },
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff registration not found' }, { status: 404 })
  }

  if (!staff.porosAccessCode) {
    return NextResponse.json(
      { error: 'This staffer has no liability access code. The event may not require liability forms.' },
      { status: 400 }
    )
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://chirhoevents.com'
  const liabilityUrl = `${baseUrl}/poros?code=${staff.porosAccessCode}`
  const supportEmail = resolveReplyTo(staff.event.settings, staff.event.organization)

  const html = wrapEmail(
    `
      <h1>Your Liability Form Access Code</h1>
      <p>Hi ${staff.firstName},</p>
      <p>Here is your access code to complete the liability form for <strong>${staff.event.name}</strong>.</p>

      ${emailInfoBox(
        `<strong>Your Access Code:</strong><br>
         <div style="font-size:32px;letter-spacing:4px;color:#1E3A5F;margin-top:8px;font-weight:bold;">${staff.porosAccessCode}</div>`,
        'info'
      )}

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
        <tr>
          <td style="background-color:#1E3A5F;border-radius:6px;text-align:center;">
            <a href="${liabilityUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;">
              Complete Liability Form
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#666;text-align:center;">
        Don't have your Safe Environment certificate handy? You can email a copy to
        <a href="mailto:${supportEmail}" style="color:#1E3A5F;">${supportEmail}</a>
        and we'll upload it to your record for you.
      </p>
    `,
    {
      organizationName: staff.event.organization.name,
      preheader: `Your liability form access code for ${staff.event.name}`,
      supportEmail,
    }
  )

  try {
    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: supportEmail,
      to: staff.email,
      subject: `Your Liability Form Access Code - ${staff.event.name}`,
      html,
    })
  } catch (e) {
    console.error('[Staff Resend Poros] Failed to send email:', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
