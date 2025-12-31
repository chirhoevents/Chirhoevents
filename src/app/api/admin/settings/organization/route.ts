import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        logoUrl: true,
        stripeAccountId: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const body = await request.json()
    const {
      name,
      type,
      contactName,
      contactEmail,
      contactPhone,
      address,
    } = body

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    // Validate organization type
    const validTypes = ['diocese', 'archdiocese', 'parish', 'seminary', 'retreat_center']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid organization type' },
        { status: 400 }
      )
    }

    // Check if email is being changed and if it's already in use
    if (contactEmail) {
      const existingOrg = await prisma.organization.findFirst({
        where: {
          contactEmail,
          id: { not: organizationId },
        },
      })

      if (existingOrg) {
        return NextResponse.json(
          { error: 'This email is already in use by another organization' },
          { status: 400 }
        )
      }
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name,
        type,
        contactName: contactName || null,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || null,
        address: address || null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        logoUrl: true,
      },
    })

    return NextResponse.json({ organization: updatedOrganization })
  } catch (error) {
    console.error('Error updating organization settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
