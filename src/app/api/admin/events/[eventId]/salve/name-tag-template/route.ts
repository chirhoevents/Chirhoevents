import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

// Helper function to check if user can access Salve portal
async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Admins always have access
  if (isAdmin(user)) {
    return user
  }

  // Check for Salve-specific roles
  const portalRoles = ['salve_user', 'salve_coordinator', 'portals.salve.view']
  const hasPortalRole = user.permissions
    ? portalRoles.some(role => user.permissions?.[role] === true)
    : false

  if (!hasPortalRole) {
    throw new Error('Access denied')
  }

  // Verify the event belongs to the user's organization
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
  })

  if (!event) {
    throw new Error('Access denied to this event')
  }

  return user
}

// Default template settings
const DEFAULT_TEMPLATE = {
  size: 'standard',
  showName: true,
  showGroup: true,
  showParticipantType: true,
  showHousing: true,
  showDiocese: false,
  showMealColor: false,
  showSmallGroup: false,
  showQrCode: true,
  showConferenceHeader: true,
  conferenceHeaderText: '',
  showLogo: false,
  logoUrl: '',
  // 4x6 Header Banner (top 2.5 inches)
  showHeaderBanner: false,
  headerBannerUrl: '',
  backgroundColor: '#FFFFFF',
  textColor: '#1E3A5F',
  accentColor: '#9C8466',
  fontFamily: 'sans-serif',
  fontSize: 'medium',
}

// GET - Load name tag template settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const template = await prisma.nameTagTemplate.findUnique({
      where: { eventId },
    })

    if (template && template.settingsJson) {
      // Return saved settings from JSON
      return NextResponse.json({
        template: template.settingsJson,
        savedAt: template.updatedAt,
      })
    }

    // Return default template if none exists
    return NextResponse.json({
      template: DEFAULT_TEMPLATE,
      savedAt: null,
    })
  } catch (error: any) {
    console.error('Failed to load name tag template:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Please sign in to view template settings' },
        { status: 401 }
      )
    }
    if (error.message === 'Access denied' || error.message === 'Access denied to this event') {
      return NextResponse.json(
        { message: 'You do not have permission to view template settings for this event' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to load template settings' },
      { status: 500 }
    )
  }
}

// PUT - Save name tag template settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const body = await request.json()
    const { template } = body

    if (!template) {
      return NextResponse.json(
        { message: 'Template settings are required' },
        { status: 400 }
      )
    }

    // Upsert the template - create if doesn't exist, update if it does
    const savedTemplate = await prisma.nameTagTemplate.upsert({
      where: { eventId },
      create: {
        eventId,
        settingsJson: template,
        // Also save some fields to the regular columns for backwards compatibility
        logoUrl: template.logoUrl || null,
        backgroundUrl: template.headerBannerUrl || null, // Use headerBannerUrl for backgroundUrl column
        primaryColor: template.textColor || '#1E3A5F',
        accentColor: template.accentColor || '#9C8466',
        textColor: template.textColor || '#000000',
        showRole: template.showParticipantType ?? true,
        showMealColor: template.showMealColor ?? true,
        showSmallGroup: template.showSmallGroup ?? true,
        showHousing: template.showHousing ?? false,
        showQrCode: template.showQrCode ?? true,
      },
      update: {
        settingsJson: template,
        logoUrl: template.logoUrl || null,
        backgroundUrl: template.headerBannerUrl || null, // Use headerBannerUrl for backgroundUrl column
        primaryColor: template.textColor || '#1E3A5F',
        accentColor: template.accentColor || '#9C8466',
        textColor: template.textColor || '#000000',
        showRole: template.showParticipantType ?? true,
        showMealColor: template.showMealColor ?? true,
        showSmallGroup: template.showSmallGroup ?? true,
        showHousing: template.showHousing ?? false,
        showQrCode: template.showQrCode ?? true,
      },
    })

    return NextResponse.json({
      message: 'Template saved successfully',
      savedAt: savedTemplate.updatedAt,
    })
  } catch (error: any) {
    console.error('Failed to save name tag template:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Please sign in to save template settings' },
        { status: 401 }
      )
    }
    if (error.message === 'Access denied' || error.message === 'Access denied to this event') {
      return NextResponse.json(
        { message: 'You do not have permission to save template settings for this event' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to save template settings' },
      { status: 500 }
    )
  }
}
