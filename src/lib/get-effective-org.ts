import { cookies } from 'next/headers'
import { AuthUser } from './auth-utils'

/**
 * Get the effective organization ID for the current request.
 * If a master admin is impersonating, returns the impersonated org's ID.
 * Otherwise, returns the user's own organization ID.
 */
export async function getEffectiveOrgId(user: AuthUser): Promise<string> {
  // Check if master admin is impersonating
  if (user.role === 'master_admin') {
    const cookieStore = await cookies()
    const impersonatingOrg = cookieStore.get('impersonating_org')?.value
    const masterAdminId = cookieStore.get('master_admin_id')?.value

    // Verify this is the master admin who started impersonation
    if (impersonatingOrg && masterAdminId === user.id) {
      return impersonatingOrg
    }
  }

  return user.organizationId
}

/**
 * Check if the current user is impersonating an organization
 */
export async function isImpersonating(user: AuthUser): Promise<boolean> {
  if (user.role !== 'master_admin') {
    return false
  }

  const cookieStore = await cookies()
  const impersonatingOrg = cookieStore.get('impersonating_org')?.value
  const masterAdminId = cookieStore.get('master_admin_id')?.value

  return !!(impersonatingOrg && masterAdminId === user.id)
}

/**
 * Get impersonation details if impersonating
 */
export async function getImpersonationDetails(user: AuthUser): Promise<{
  isImpersonating: boolean
  impersonatedOrgId: string | null
  impersonatedOrgName: string | null
}> {
  if (user.role !== 'master_admin') {
    return {
      isImpersonating: false,
      impersonatedOrgId: null,
      impersonatedOrgName: null,
    }
  }

  const cookieStore = await cookies()
  const impersonatingOrg = cookieStore.get('impersonating_org')?.value
  const impersonatingOrgName = cookieStore.get('impersonating_org_name')?.value
  const masterAdminId = cookieStore.get('master_admin_id')?.value

  if (impersonatingOrg && masterAdminId === user.id) {
    return {
      isImpersonating: true,
      impersonatedOrgId: impersonatingOrg,
      impersonatedOrgName: impersonatingOrgName || null,
    }
  }

  return {
    isImpersonating: false,
    impersonatedOrgId: null,
    impersonatedOrgName: null,
  }
}
