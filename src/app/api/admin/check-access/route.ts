import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// Decode JWT payload to extract user ID when cookies aren't available
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  console.log('🔐 [API check-access] Request received')
  try {
    // Try to get userId from Authorization header (JWT token) as fallback
    let overrideUserId: string | undefined
    const authHeader = request.headers.get('Authorization')
    console.log('🔐 [API check-access] Auth header present:', !!authHeader)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = decodeJwtPayload(token)
      if (payload?.sub) {
        overrideUserId = payload.sub
        console.log('🔐 [API check-access] Extracted userId from JWT:', overrideUserId)
      }
    }

    const user = await getCurrentUser(overrideUserId)
    console.log('🔐 [API check-access] getCurrentUser result:', user?.email || 'NULL')

    // 401 if user not found (not authenticated or timing issue)
    if (!user) {
      console.log('❌ [API check-access] No user found - returning 401')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔐 [API check-access] User role:', user.role)
    // 403 if user exists but isn't an admin (forbidden)
    if (!isAdmin(user)) {
      console.log('❌ [API check-access] User is not admin - returning 403')
      return NextResponse.json(
        { error: 'Access denied - Admin role required' },
        { status: 403 }
      )
    }
    console.log('✅ [API check-access] User is admin, proceeding...')

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

    console.log('✅ [API check-access] Returning success response for:', user.email)
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
    console.error('💥 [API check-access] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
