import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const registrationId = params.id
    const body = await request.json()

    // Verify the registration belongs to the user's organization
    const existingRegistration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (existingRegistration.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      housingType,
    } = body

    // Update the individual registration
    const updatedRegistration = await prisma.individualRegistration.update({
      where: { id: registrationId },
      data: {
        firstName,
        lastName,
        email,
        phone,
        age,
        housingType,
      },
    })

    // Track changes made
    const changesMade: Record<string, {old: unknown, new: unknown}> = {}
    if (existingRegistration.firstName !== firstName) {
      changesMade.firstName = { old: existingRegistration.firstName, new: firstName }
    }
    if (existingRegistration.lastName !== lastName) {
      changesMade.lastName = { old: existingRegistration.lastName, new: lastName }
    }
    if (existingRegistration.email !== email) {
      changesMade.email = { old: existingRegistration.email, new: email }
    }
    if (existingRegistration.phone !== phone) {
      changesMade.phone = { old: existingRegistration.phone, new: phone }
    }
    if (existingRegistration.age !== age) {
      changesMade.age = { old: existingRegistration.age, new: age }
    }
    if (existingRegistration.housingType !== housingType) {
      changesMade.housingType = { old: existingRegistration.housingType, new: housingType }
    }

    // Create audit trail entry if changes were made
    if (Object.keys(changesMade).length > 0) {
      await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'individual',
          editedByUserId: user.id,
          editType: 'info_updated',
          changesMade: changesMade as any,
        },
      })
    }

    return NextResponse.json({
      success: true,
      registration: updatedRegistration,
    })
  } catch (error) {
    console.error('Error updating individual registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
