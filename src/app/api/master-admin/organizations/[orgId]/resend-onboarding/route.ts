import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateOrgAdminOnboardingEmail } from '@/emails/org-admin-onboarding'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const currentUser = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!currentUser || currentUser.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master Admin access required' },
        { status: 403 }
      )
    }

    const { orgId } = await params

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
    const orgAdmin = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        role: 'org_admin',
      },
      orderBy: {
        createdAt: 'asc', // Get the first/primary org admin
      },
    })

    if (!orgAdmin) {
      return NextResponse.json(
        { error: 'No organization admin found for this organization' },
        { status: 404 }
      )
    }

    // Generate invite link
    // If user already has clerkUserId, they've signed up - send them sign-in link
    const inviteLink = orgAdmin.clerkUserId
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/sign-in`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/invite/${orgAdmin.id}`

    // Generate and send onboarding email
    const emailHtml = generateOrgAdminOnboardingEmail({
      orgName: organization.name,
      orgAdminFirstName: orgAdmin.firstName,
      orgAdminEmail: orgAdmin.email,
      inviteLink,
      organizationId: organization.id,
    })

    const subject = orgAdmin.clerkUserId
      ? `Reminder: Get Started with ChiRho Events - ${organization.name}`
      : `Welcome to ChiRho Events - ${organization.name}`

    await resend.emails.send({
      from: 'ChiRho Events <noreply@chirhoevents.com>',
      to: orgAdmin.email,
      subject,
      html: emailHtml,
    })

    console.log('Onboarding email resent to:', orgAdmin.email)

    return NextResponse.json({
      success: true,
      message: 'Onboarding email sent successfully',
      sentTo: orgAdmin.email,
    })
  } catch (error) {
    console.error('Error resending onboarding email:', error)
    return NextResponse.json(
      { error: 'Failed to resend onboarding email' },
      { status: 500 }
    )
  }
}
