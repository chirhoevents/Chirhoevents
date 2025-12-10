import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parent_token } = body

    if (!parent_token) {
      return NextResponse.json(
        { error: 'Parent token is required' },
        { status: 400 }
      )
    }

    // Find liability form by parent token
    const liabilityForm = await prisma.liabilityForm.findUnique({
      where: { parentToken: parent_token },
    })

    if (!liabilityForm) {
      return NextResponse.json(
        { error: 'Invalid token. Please check your link and try again.' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (liabilityForm.parentTokenExpiresAt && new Date() > liabilityForm.parentTokenExpiresAt) {
      return NextResponse.json(
        { error: 'This link has expired. Please contact your group leader to resend the form.' },
        { status: 410 }
      )
    }

    // Check if form is already completed
    if (liabilityForm.completed) {
      return NextResponse.json(
        { error: 'This form has already been completed.' },
        { status: 400 }
      )
    }

    // Return youth info for display
    return NextResponse.json({
      success: true,
      youth_info: {
        firstName: liabilityForm.participantFirstName,
        lastName: liabilityForm.participantLastName,
        age: liabilityForm.participantAge,
        gender: liabilityForm.participantGender,
        tShirtSize: 'M', // TODO: Add tShirtSize to liabilityForm model
      },
    })
  } catch (error) {
    console.error('Validate token error:', error)
    return NextResponse.json(
      { error: 'Failed to validate token. Please try again.' },
      { status: 500 }
    )
  }
}
