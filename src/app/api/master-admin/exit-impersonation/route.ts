import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const impersonatingOrg = cookieStore.get('impersonating_org')?.value
    const masterAdminId = cookieStore.get('master_admin_id')?.value

    // Log activity if we were impersonating
    if (impersonatingOrg && masterAdminId) {
      const organization = await prisma.organization.findUnique({
        where: { id: impersonatingOrg },
        select: { name: true },
      })

      await prisma.platformActivityLog.create({
        data: {
          organizationId: impersonatingOrg,
          userId: masterAdminId,
          activityType: 'impersonation_ended',
          description: `Master Admin stopped impersonating "${organization?.name}"`,
        },
      })
    }

    // Clear impersonation cookies
    cookieStore.delete('impersonating_org')
    cookieStore.delete('impersonating_user')
    cookieStore.delete('impersonating_org_name')
    cookieStore.delete('master_admin_id')

    return NextResponse.json({
      success: true,
      message: 'Impersonation ended',
      redirectUrl: '/dashboard/master-admin',
    })
  } catch (error) {
    console.error('Exit impersonation error:', error)
    return NextResponse.json(
      { error: 'Failed to exit impersonation' },
      { status: 500 }
    )
  }
}
