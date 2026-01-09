import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// GET /api/group-leader/registration?id=... - Get registration details for editing
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const registrationId = searchParams.get('id')

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Find the registration and verify it belongs to this user
    const registration = await prisma.groupRegistration.findFirst({
      where: {
        id: registrationId,
        clerkUserId: userId,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found or access denied' },
        { status: 404 }
      )
    }

    // Return the editable fields
    return NextResponse.json({
      groupName: registration.groupName,
      parishName: registration.parishName,
      dioceseName: registration.dioceseName,
      groupLeaderName: registration.groupLeaderName,
      groupLeaderEmail: registration.groupLeaderEmail,
      groupLeaderPhone: registration.groupLeaderPhone,
      groupLeaderStreet: registration.groupLeaderStreet,
      groupLeaderCity: registration.groupLeaderCity,
      groupLeaderState: registration.groupLeaderState,
      groupLeaderZip: registration.groupLeaderZip,
      alternativeContact1Name: registration.alternativeContact1Name,
      alternativeContact1Email: registration.alternativeContact1Email,
      alternativeContact1Phone: registration.alternativeContact1Phone,
      alternativeContact2Name: registration.alternativeContact2Name,
      alternativeContact2Email: registration.alternativeContact2Email,
      alternativeContact2Phone: registration.alternativeContact2Phone,
      youthCount: registration.youthCount,
      chaperoneCount: registration.chaperoneCount,
      priestCount: registration.priestCount,
      housingType: registration.housingType,
      specialRequests: registration.specialRequests,
      dietaryRestrictionsSummary: registration.dietaryRestrictionsSummary,
      adaAccommodationsSummary: registration.adaAccommodationsSummary,
    })
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/group-leader/registration - Update registration details
export async function PUT(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Verify the registration belongs to this user
    const existingRegistration = await prisma.groupRegistration.findFirst({
      where: {
        id,
        clerkUserId: userId,
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found or access denied' },
        { status: 404 }
      )
    }

    // Update the registration
    // Note: Participant counts (youthCount, chaperoneCount, priestCount, totalParticipants)
    // are intentionally excluded from updates. These must be changed by administrators
    // as they affect payment calculations and liability requirements.
    const updatedRegistration = await prisma.groupRegistration.update({
      where: { id },
      data: {
        groupName: updateData.groupName,
        parishName: updateData.parishName,
        dioceseName: updateData.dioceseName,
        groupLeaderName: updateData.groupLeaderName,
        groupLeaderEmail: updateData.groupLeaderEmail,
        groupLeaderPhone: updateData.groupLeaderPhone,
        groupLeaderStreet: updateData.groupLeaderStreet,
        groupLeaderCity: updateData.groupLeaderCity,
        groupLeaderState: updateData.groupLeaderState,
        groupLeaderZip: updateData.groupLeaderZip,
        alternativeContact1Name: updateData.alternativeContact1Name,
        alternativeContact1Email: updateData.alternativeContact1Email,
        alternativeContact1Phone: updateData.alternativeContact1Phone,
        alternativeContact2Name: updateData.alternativeContact2Name,
        alternativeContact2Email: updateData.alternativeContact2Email,
        alternativeContact2Phone: updateData.alternativeContact2Phone,
        housingType: updateData.housingType,
        specialRequests: updateData.specialRequests,
        dietaryRestrictionsSummary: updateData.dietaryRestrictionsSummary,
        adaAccommodationsSummary: updateData.adaAccommodationsSummary,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Registration updated successfully',
      registration: updatedRegistration,
    })
  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
