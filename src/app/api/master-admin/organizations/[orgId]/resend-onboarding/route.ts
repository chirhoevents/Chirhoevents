import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateOrgAdminOnboardingEmail } from '@/emails/org-admin-onboarding'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    let orgAdmin = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        role: 'org_admin',
      },
      orderBy: {
        createdAt: 'asc', // Get the first/primary org admin
      },
    })

    // If no org admin exists, create one from the organization's contact info
    if (!orgAdmin) {
      if (!organization.contactEmail) {
        return NextResponse.json(
          { error: 'No organization admin found and no contact email on organization' },
          { status: 404 }
        )
      }

      // Parse contact name (format is usually "FirstName LastName")
      const nameParts = (organization.contactName || '').split(' ')
      const firstName = nameParts[0] || 'Organization'
      const lastName = nameParts.slice(1).join(' ') || 'Admin'

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
            firstName,
            lastName,
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
