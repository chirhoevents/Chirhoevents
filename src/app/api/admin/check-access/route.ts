import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Check for impersonation cookies
    const cookieStore = await cookies()
    const impersonatingOrg = cookieStore.get('impersonating_org')?.value
    const masterAdminId = cookieStore.get('master_admin_id')?.value

    // If impersonating, return the impersonated org's info
    if (impersonatingOrg && masterAdminId && user.role === 'master_admin') {
      // Get the impersonated organization
      const impersonatedOrg = await prisma.organization.findUnique({
        where: { id: impersonatingOrg },
        select: { id: true, name: true },
      })

      if (impersonatedOrg) {
        return NextResponse.json({
          userId: user.id,
          organizationId: impersonatedOrg.id,
          organizationName: impersonatedOrg.name,
          userRole: 'org_admin', // Show as org_admin while impersonating
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          permissions: user.permissions,
          isImpersonating: true,
          actualRole: 'master_admin',
        })
      }
    }

    return NextResponse.json({
      userId: user.id,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      userRole: user.role,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      permissions: user.permissions,
      isImpersonating: false,
    })
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
