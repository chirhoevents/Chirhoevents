import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      userRole: user.role,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    })
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
