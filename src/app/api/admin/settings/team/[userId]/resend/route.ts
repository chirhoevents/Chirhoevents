import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, userHasPermission } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { Resend } from 'resend'
import { getRoleName, getRoleDescription, type UserRole } from '@/lib/permissions'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    // Only users with team.manage permission can resend invites
    if (!userHasPermission(user, 'team.manage')) {
      return NextResponse.json(
        { error: 'You do not have permission to manage team invitations' },
        { status: 403 }
      )
    }

    const { userId } = await params

    // Find the pending invite
    const pendingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: organizationId,
        clerkUserId: null, // Only pending invites
      },
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'Pending invitation not found' },
        { status: 404 }
      )
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    // Resend invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/invite/${pendingUser.id}`
    const roleName = getRoleName(pendingUser.role as UserRole)
    const roleDescription = getRoleDescription(pendingUser.role as UserRole)

    await resend.emails.send({
      from: 'ChirhoEvents <noreply@chirhoevents.com>',
      to: pendingUser.email,
      subject: `Reminder: You've been invited to join ${organization?.name || 'ChirhoEvents'} as ${roleName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2A4A6F 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Invitation Reminder</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${pendingUser.firstName},</p>
            <p>This is a friendly reminder that <strong>${user.firstName} ${user.lastName}</strong> has invited you to join <strong>${organization?.name || 'their organization'}</strong> on ChiRho Events.</p>

            <div style="background: #F5F1E8; border-left: 4px solid #9C8466; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
              <p style="margin: 0 0 5px 0; font-weight: bold; color: #1E3A5F;">Your Role: ${roleName}</p>
              <p style="margin: 0; color: #666; font-size: 14px;">${roleDescription}</p>
            </div>

            <p>ChiRho Events helps Catholic organizations manage retreats, conferences, and events with ease.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #9C8466; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px;">After accepting, you'll be taken to your dashboard where you can access the features available to your role.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} ChiRho Events. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({
      message: 'Invitation resent successfully',
    })
  } catch (error) {
    console.error('Error resending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
