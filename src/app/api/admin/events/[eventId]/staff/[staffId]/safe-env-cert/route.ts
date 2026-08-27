import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { uploadSafeEnvCert } from '@/lib/r2/upload-safe-env-cert'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  const { eventId, staffId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Admin Upload Safe Env Cert - Staff]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Please upload a PDF or image.' },
      { status: 400 }
    )
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
  }

  const staff = await prisma.staffRegistration.findFirst({
    where: { id: staffId, eventId, organizationId: effectiveOrgId },
    include: {
      event: {
        include: {
          settings: { select: { contactEmail: true } },
          organization: { select: { name: true, contactEmail: true } },
        },
      },
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff registration not found' }, { status: 404 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const url = await uploadSafeEnvCert(buffer, file.name, 'staff', staff.id, effectiveOrgId)

  await prisma.staffRegistration.update({
    where: { id: staff.id },
    data: {
      safeEnvironmentCertUrl: url,
      safeEnvironmentCertUploadedAt: new Date(),
      safeEnvironmentCertUploadedById: user.id,
    },
  })

  // Notify the staffer that the org uploaded their cert
  try {
    const emailContent = wrapEmail(
      `
        <h1>Safe Environment Certificate Uploaded</h1>
        <p>Hi ${staff.firstName},</p>
        <p>
          The team at <strong>${staff.event.organization.name}</strong> received your
          Safe Environment certificate for <strong>${staff.event.name}</strong> and
          uploaded it to your registration on your behalf.
        </p>
        ${emailInfoBox(
          '<strong>Nothing more to do.</strong> Your Safe Environment requirement is now recorded.',
          'success'
        )}
        <p>See you at the event!</p>
      `,
      {
        organizationName: staff.event.organization.name,
        preheader: `Safe Environment certificate uploaded for ${staff.event.name}`,
        supportEmail: resolveReplyTo(staff.event.settings, staff.event.organization),
      }
    )

    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: resolveReplyTo(staff.event.settings, staff.event.organization),
      to: staff.email,
      subject: `Safe Environment Certificate Uploaded - ${staff.event.name}`,
      html: emailContent,
    })
  } catch (emailErr) {
    console.error('[Admin Upload Safe Env Cert - Staff] Failed to send confirmation email:', emailErr)
  }

  return NextResponse.json({ success: true, url })
}
