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
    const body = await request.json()
    const { firstName, lastName, email, phone, sendOnboardingEmail } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

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

    // Find current org admin(s) and demote them to staff
    const currentAdmins = await prisma.user.findMany({
      where: {
        organizationId: organization.id,
        role: 'org_admin',
      },
    })

    // Demote all current org admins to staff (except master_admin)
    for (const admin of currentAdmins) {
      if (admin.role !== 'master_admin') {
        await prisma.user.update({
          where: { id: admin.id },
          data: { role: 'staff' },
        })
        console.log(`Demoted previous org admin ${admin.email} to staff`)
      }
    }

    // Check if a user with this email already exists
    let newAdmin = await prisma.user.findFirst({
      where: { email },
    })

    if (newAdmin) {
      // Update existing user to be org admin
      newAdmin = await prisma.user.update({
        where: { id: newAdmin.id },
        data: {
          firstName,
          lastName,
          phone: phone || newAdmin.phone,
          organizationId: organization.id,
          role: newAdmin.role === 'master_admin' ? 'master_admin' : 'org_admin',
        },
      })
      console.log(`Updated existing user ${email} to be org admin for ${organization.name}`)
    } else {
      // Create new user as org admin
      newAdmin = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          role: 'org_admin',
          organizationId: organization.id,
          createdBy: currentUser.id,
        },
      })
      console.log(`Created new org admin ${email} for ${organization.name}`)
    }

    // Update organization contact info
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        contactName: `${firstName} ${lastName}`,
        contactEmail: email,
        contactPhone: phone || organization.contactPhone,
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: currentUser.id,
        activityType: 'org_admin_changed',
        description: `Organization admin changed to ${firstName} ${lastName} (${email})`,
        metadata: {
          newAdminId: newAdmin.id,
          newAdminEmail: email,
          previousAdminCount: currentAdmins.length,
        },
      },
    })

    // Send onboarding email if requested and user doesn't have a Clerk account yet
    let emailSent = false
    if (sendOnboardingEmail && !newAdmin.clerkUserId) {
      try {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/invite/${newAdmin.id}`

        const emailHtml = generateOrgAdminOnboardingEmail({
          orgName: organization.name,
          orgAdminFirstName: firstName,
          orgAdminEmail: email,
          inviteLink,
          organizationId: organization.id,
        })

        await resend.emails.send({
          from: 'ChiRho Events <noreply@chirhoevents.com>',
          to: email,
          subject: `Welcome to ChiRho Events - ${organization.name}`,
          html: emailHtml,
        })

        emailSent = true
        console.log('Onboarding email sent to new admin:', email)
      } catch (emailError) {
        console.error('Failed to send onboarding email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Organization admin changed successfully',
      admin: {
        id: newAdmin.id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        isOnboarded: !!newAdmin.clerkUserId,
      },
      emailSent,
    })
  } catch (error) {
    console.error('Error changing org admin:', error)
    return NextResponse.json(
      { error: 'Failed to change organization admin' },
      { status: 500 }
    )
  }
}
