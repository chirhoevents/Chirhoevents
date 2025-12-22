import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { userId } = await params

    // Can't delete yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the team' },
        { status: 400 }
      )
    }

    // Check if user exists and belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: user.organizationId,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Can't delete master_admin
    if (targetUser.role === 'master_admin') {
      return NextResponse.json(
        { error: 'Cannot remove a master admin' },
        { status: 400 }
      )
    }

    // Check if this is a pending invite (no clerkUserId)
    if (!targetUser.clerkUserId) {
      // For pending invites, we can safely delete the user record
      await prisma.user.delete({
        where: { id: userId },
      })

      return NextResponse.json({
        message: 'Invitation cancelled successfully',
      })
    }

    // For active users, check if they have any related records
    const hasEvents = await prisma.event.count({
      where: { createdBy: userId },
    })

    const hasCreatedUsers = await prisma.user.count({
      where: { createdBy: userId },
    })

    if (hasEvents > 0 || hasCreatedUsers > 0) {
      // Instead of deleting, we should deactivate/demote the user
      // For now, change their role to remove admin access
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'individual', // Demote to non-admin role
        },
      })

      return NextResponse.json({
        message: 'User has been removed from the admin team',
        note: 'User account was demoted instead of deleted due to existing records',
      })
    }

    // Try to delete - if it fails due to constraints, demote instead
    try {
      await prisma.user.delete({
        where: { id: userId },
      })

      return NextResponse.json({
        message: 'Team member removed successfully',
      })
    } catch (deleteError: unknown) {
      // Foreign key constraint - demote instead
      console.log('Could not delete user due to constraints, demoting instead:', deleteError)

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'individual',
        },
      })

      return NextResponse.json({
        message: 'User has been removed from the admin team',
      })
    }
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { userId } = await params
    const body = await request.json()
    const { role } = body

    // Validate role
    const validRoles = ['org_admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Can't change your own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    // Check if user exists and belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: user.organizationId,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Can't change master_admin role
    if (targetUser.role === 'master_admin') {
      return NextResponse.json(
        { error: 'Cannot change master admin role' },
        { status: 400 }
      )
    }

    // Update the role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    })

    return NextResponse.json({
      message: 'Role updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating team member role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
