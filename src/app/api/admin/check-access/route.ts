import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
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

    // Fetch additional organization branding data
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        logoUrl: true,
        modulesEnabled: true,
      },
    })

    return NextResponse.json({
      userId: user.id,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      userRole: user.role,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      permissions: user.permissions,
      logoUrl: organization?.logoUrl || null,
      modulesEnabled: organization?.modulesEnabled || { poros: true, salve: true, rapha: true },
    })
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
