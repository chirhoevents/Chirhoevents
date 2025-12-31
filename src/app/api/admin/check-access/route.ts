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

    // Check if master admin is impersonating an organization
    const cookieStore = await cookies()
    const impersonatingOrg = cookieStore.get('impersonating_org')?.value
    const impersonatingOrgName = cookieStore.get('impersonating_org_name')?.value
    const masterAdminId = cookieStore.get('master_admin_id')?.value

    // If impersonating, use the impersonated org's data
    let organizationId = user.organizationId
    let organizationName = user.organization.name
    let isImpersonating = false

    if (impersonatingOrg && masterAdminId && user.role === 'master_admin') {
      // Verify this is the master admin who started impersonation
      if (user.id === masterAdminId) {
        organizationId = impersonatingOrg
        organizationName = impersonatingOrgName || 'Organization'
        isImpersonating = true
      }
    }

    // Fetch organization branding data (use impersonated org if applicable)
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        logoUrl: true,
        modulesEnabled: true,
        primaryColor: true,
        secondaryColor: true,
      },
    })

    // When impersonating, use org_admin role for permission checks
    const effectiveRole = isImpersonating ? 'org_admin' : user.role

    return NextResponse.json({
      userId: user.id,
      organizationId: organizationId,
      organizationName: organization?.name || organizationName,
      userRole: effectiveRole,
      actualRole: user.role, // Keep track of actual role
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      permissions: user.permissions,
      logoUrl: organization?.logoUrl || null,
      modulesEnabled: organization?.modulesEnabled || { poros: true, salve: true, rapha: true },
      primaryColor: organization?.primaryColor || '#1E3A5F',
      secondaryColor: organization?.secondaryColor || '#9C8466',
      isImpersonating: isImpersonating,
      impersonatedOrgId: isImpersonating ? organizationId : null,
    })
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
