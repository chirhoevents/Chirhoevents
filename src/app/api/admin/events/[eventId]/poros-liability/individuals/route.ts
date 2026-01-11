import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''

    // Check if user has access to this event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        settings: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user is a member of the organization
    if (event.organization.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if liability forms are required for individuals
    if (!event.settings?.liabilityFormsRequiredIndividual) {
      return NextResponse.json([])
    }

    // Fetch individual registrations with their liability forms
    const individuals = await prisma.individualRegistration.findMany({
      where: {
        eventId,
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { confirmationCode: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        liabilityForms: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform data for the frontend
    const result = individuals.map((individual) => {
      const form = individual.liabilityForms[0]

      let formStatus: string
      if (!form) {
        formStatus = 'not_started'
      } else if (form.completed) {
        formStatus = form.formStatus === 'denied' ? 'denied' : 'completed'
      } else if (form.parentToken) {
        formStatus = 'pending' // Waiting on parent
      } else {
        formStatus = 'not_started'
      }

      return {
        id: individual.id,
        registrationId: individual.id,
        confirmationCode: individual.confirmationCode,
        firstName: individual.firstName,
        lastName: individual.lastName,
        email: individual.email,
        age: individual.age,
        gender: individual.gender,
        formStatus,
        formId: form?.id || null,
        formType: form?.formType || null,
        pdfUrl: form?.pdfUrl || null,
        allergies: form?.allergies || null,
        medications: form?.medications || null,
        medicalConditions: form?.medicalConditions || null,
        dietaryRestrictions: form?.dietaryRestrictions || individual.dietaryRestrictions,
        tShirtSize: form?.tShirtSize || individual.tShirtSize,
        emergencyContact1Name: form?.emergencyContact1Name || individual.emergencyContact1Name,
        emergencyContact1Phone: form?.emergencyContact1Phone || individual.emergencyContact1Phone,
        completedAt: form?.completedAt?.toISOString() || null,
        parentEmail: form?.parentEmail || null,
      }
    })

    // Filter by status if specified
    let filtered = result
    if (status !== 'all') {
      filtered = result.filter((r) => r.formStatus === status)
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Error fetching individual forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch individual forms' },
      { status: 500 }
    )
  }
}
