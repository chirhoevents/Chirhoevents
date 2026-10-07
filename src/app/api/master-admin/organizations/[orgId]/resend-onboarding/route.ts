import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { generateOrgAdminOnboardingEmail, type OnboardingBilling } from '@/emails/org-admin-onboarding'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { getTier } from '@/lib/subscription-tiers'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Send (or preview, with `dryRun: true`) the onboarding email for an org.
 *
 * Body (all optional):
 *   personalMessage    – note from the master admin shown at the top
 *   includePaymentLink – include the online link for a pending setup fee
 *                        invoice; defaults to off for orgs that pay by check
 *   billingNote        – what the billing step says when there's no link
 *   dryRun             – return the email without sending or changing anything
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const currentUser = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true, firstName: true, lastName: true },
    })

    if (!currentUser || currentUser.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master Admin access required' },
        { status: 403 }
      )
    }

    const { orgId } = await params

    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun === true
    const personalMessage: string | null =
      typeof body.personalMessage === 'string' && body.personalMessage.trim() ? body.personalMessage.trim() : null
    const billingNote: string | null =
      typeof body.billingNote === 'string' && body.billingNote.trim() ? body.billingNote.trim() : null

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Find the Org Admin user for this organization
    let orgAdmin = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        role: 'org_admin',
      },
      orderBy: {
        createdAt: 'asc', // Get the first/primary org admin
      },
    })

    if (!orgAdmin && !organization.contactEmail) {
      return NextResponse.json(
        { error: 'No organization admin found and no contact email on organization' },
        { status: 404 }
      )
    }

    // Parse contact name (format is usually "FirstName LastName")
    const nameParts = (organization.contactName || '').split(' ')

    // A preview shows who it would go to without creating or updating anyone
    if (!dryRun) {
      // If org admin exists but organization contact email has changed, update the org admin's email
      // This ensures the onboarding email goes to the current contact, not the original one
      if (orgAdmin && organization.contactEmail && orgAdmin.email !== organization.contactEmail) {
        console.log(`Updating org admin email from ${orgAdmin.email} to current contact email ${organization.contactEmail}`)

        orgAdmin = await prisma.user.update({
          where: { id: orgAdmin.id },
          data: {
            email: organization.contactEmail,
            firstName: nameParts[0] || orgAdmin.firstName,
            lastName: nameParts.slice(1).join(' ') || orgAdmin.lastName,
            phone: organization.contactPhone || orgAdmin.phone,
          },
        })
      }

      // If no org admin exists, create one from the organization's contact info
      if (!orgAdmin && organization.contactEmail) {
        // Check if a user with this email already exists
        const existingUser = await prisma.user.findFirst({
          where: { email: organization.contactEmail },
        })

        if (existingUser) {
          // Update existing user to be org admin for this organization
          orgAdmin = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              organizationId: organization.id,
              role: existingUser.role === 'master_admin' ? 'master_admin' : 'org_admin',
            },
          })
          console.log(`Updated existing user ${organization.contactEmail} to be org admin for ${organization.id}`)
        } else {
          // Create new org admin user
          orgAdmin = await prisma.user.create({
            data: {
              firstName: nameParts[0] || 'Organization',
              lastName: nameParts.slice(1).join(' ') || 'Admin',
              email: organization.contactEmail,
              phone: organization.contactPhone,
              role: 'org_admin',
              organizationId: organization.id,
              createdBy: currentUser.id,
            },
          })
          console.log(`Created org admin user for ${organization.name}: ${organization.contactEmail}`)
        }
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    // A preview mirrors the admin updates above without making them: the
    // email goes to the org's current contact whenever that differs.
    const previewFromContact =
      dryRun && (!orgAdmin || (!!organization.contactEmail && orgAdmin.email !== organization.contactEmail))
    const recipientEmail = previewFromContact ? organization.contactEmail! : orgAdmin!.email
    const recipientFirstName = previewFromContact
      ? nameParts[0] || orgAdmin?.firstName || 'Organization'
      : orgAdmin!.firstName
    const hasAccount = !!orgAdmin?.clerkUserId

    // Generate invite link
    // If user already has clerkUserId, they've signed up - send them sign-in link
    const inviteLink = hasAccount
      ? `${appUrl}/sign-in`
      : `${appUrl}/invite/${orgAdmin?.id ?? 'preview'}`

    // An unpaid setup fee invoice can go out as an online payment link —
    // unless this org pays by check, in which case it's off unless asked for.
    const setupInvoice = organization.setupFeePaid
      ? null
      : await prisma.invoice.findFirst({
          where: {
            organizationId: organization.id,
            invoiceType: 'setup_fee',
            status: { in: ['pending', 'overdue'] },
          },
          orderBy: { createdAt: 'desc' },
        })
    const paysByCheck = organization.paymentMethodPreference === 'check'
    const includePaymentLink =
      !!setupInvoice && (typeof body.includePaymentLink === 'boolean' ? body.includePaymentLink : !paysByCheck)

    const tier = getTier(organization.subscriptionTier)
    let billing: OnboardingBilling | null = null
    if (includePaymentLink && setupInvoice) {
      let paymentToken = setupInvoice.paymentToken
      if (!paymentToken && !dryRun) {
        paymentToken = crypto.randomBytes(32).toString('hex')
        await prisma.invoice.update({ where: { id: setupInvoice.id }, data: { paymentToken } })
      }
      billing = {
        mode: 'online',
        amount: Number(setupInvoice.amount),
        label: tier?.isSelfServe ? 'Basic Access Fee' : 'Setup Fee',
        payUrl: `${appUrl}/pay/invoice/${paymentToken ?? 'preview'}`,
      }
    } else if (billingNote || paysByCheck || setupInvoice) {
      billing = { mode: 'manual', note: billingNote }
    }

    // Generate and send onboarding email
    const emailHtml = generateOrgAdminOnboardingEmail({
      orgName: organization.name,
      orgAdminFirstName: recipientFirstName,
      orgAdminEmail: recipientEmail,
      inviteLink,
      organizationId: organization.id,
      hasAccount,
      tierKey: organization.subscriptionTier,
      billingCycle: organization.billingCycle,
      planPrice: Number(
        (organization.billingCycle === 'annual' ? organization.annualPrice : organization.monthlyPrice) ?? 0
      ) || null,
      modulesEnabled: organization.modulesEnabled,
      personalMessage,
      personalMessageFrom: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      billing,
    })

    const subject = hasAccount
      ? `Reminder: Get Started with ChiRho Events - ${organization.name}`
      : `Welcome to ChiRho Events - ${organization.name}`

    if (dryRun) {
      return NextResponse.json({
        html: emailHtml,
        subject,
        sentTo: recipientEmail,
        hasAccount,
        paysByCheck,
        setupInvoice: setupInvoice
          ? { invoiceNumber: setupInvoice.invoiceNumber, amount: Number(setupInvoice.amount) }
          : null,
        includePaymentLink,
      })
    }

    // The Resend SDK reports most failures in `error` rather than throwing
    const { error: sendError } = await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: 'support@chirhoevents.com',
      to: recipientEmail,
      subject,
      html: emailHtml,
    })

    if (sendError) {
      console.error('Error resending onboarding email:', sendError)
      return NextResponse.json(
        { error: `The email service rejected the message: ${sendError.message}` },
        { status: 502 }
      )
    }

    await prisma.platformActivityLog.create({
      data: {
        organizationId: organization.id,
        userId: currentUser.id,
        activityType: 'onboarding_email_sent',
        description: `Onboarding email sent to ${recipientEmail}`,
        metadata: { includePaymentLink, hasPersonalMessage: !!personalMessage },
      },
    })

    console.log('Onboarding email resent to:', recipientEmail)

    return NextResponse.json({
      success: true,
      message: 'Onboarding email sent successfully',
      sentTo: recipientEmail,
    })
  } catch (error) {
    console.error('Error resending onboarding email:', error)
    return NextResponse.json(
      { error: 'Failed to resend onboarding email' },
      { status: 500 }
    )
  }
}
