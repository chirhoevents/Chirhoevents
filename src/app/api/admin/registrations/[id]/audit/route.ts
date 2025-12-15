import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const registrationId = params.id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'group' | 'individual' | null

    if (!type) {
      return NextResponse.json(
        { error: 'Registration type is required' },
        { status: 400 }
      )
    }

    // Verify the registration belongs to the user's organization
    const registration =
      type === 'group'
        ? await prisma.groupRegistration.findUnique({
            where: { id: registrationId },
          })
        : await prisma.individualRegistration.findUnique({
            where: { id: registrationId },
          })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (registration.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all edits for this registration
    const edits = await prisma.registrationEdit.findMany({
      where: {
        registrationId,
        registrationType: type,
      },
      include: {
        editedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        editedAt: 'desc',
      },
    })

    return NextResponse.json({ edits })
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
