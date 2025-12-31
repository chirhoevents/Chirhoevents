import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, userHasPermission } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { ADMIN_ROLES } from '@/lib/permissions'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TeamMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  permissions: unknown
  lastLogin: Date | null
  createdAt: Date
  clerkUserId: string | null
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Anyone with admin access can view team members
    if (!userHasPermission(user, 'settings.view')) {
      return NextResponse.json(
        { error: 'You do not have permission to view team members' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    // Get all team members with admin roles
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId: organizationId,
        role: {
          in: ADMIN_ROLES,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        lastLogin: true,
        createdAt: true,
        clerkUserId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Pending invites are users without clerkUserId
    const pendingInvites = teamMembers.filter((m: TeamMember) => !m.clerkUserId)
    const activeMembers = teamMembers.filter((m: TeamMember) => m.clerkUserId)

    return NextResponse.json({
      teamMembers: activeMembers,
      pendingInvites,
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Only users with team.manage permission can invite new members
    if (!userHasPermission(user, 'team.manage')) {
      return NextResponse.json(
        { error: 'You do not have permission to invite team members' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const body = await request.json()
    const { email, firstName, lastName, role, permissions } = body

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Email, first name, last name, and role are required' },
        { status: 400 }
      )
    }

    // Validate role - must be an admin role (excluding master_admin)
    const validRoles = ADMIN_ROLES.filter(r => r !== 'master_admin')
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be a valid admin role.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Get organization details for the email
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    // Create pending user (no clerkUserId yet)
    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        permissions: permissions || null,
        organizationId: organizationId,
        createdBy: user.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    })

    // Send invitation email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/invite/${newUser.id}`

      await resend.emails.send({
        from: 'ChirhoEvents <noreply@chirhoevents.com>',
        to: email,
        subject: `You've been invited to join ${organization?.name || 'ChirhoEvents'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2A4A6F 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${firstName},</p>
              <p><strong>${user.firstName} ${user.lastName}</strong> has invited you to join <strong>${organization?.name || 'their organization'}</strong> on ChiRho Events as an <strong>Administrator</strong>.</p>
              <p>ChiRho Events helps Catholic organizations manage retreats, conferences, and events with ease.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: #9C8466; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept Invitation</a>
              </div>
              <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} ChiRho Events. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Don't fail the request if email fails - user is still created
    }

    return NextResponse.json({
      message: 'Invitation sent successfully',
      user: newUser,
    })
  } catch (error) {
    console.error('Error inviting team member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
