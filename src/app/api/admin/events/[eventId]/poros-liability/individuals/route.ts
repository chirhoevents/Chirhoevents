import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify user has forms.view permission and event access
    const { error } = await verifyFormsViewAccess(
      request,
      eventId,
      '[Individual Forms List]'
    )
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''

    // Check if liability forms are required for this event
    const eventSettings = await prisma.eventSettings.findUnique({
      where: { eventId },
    })

    if (!eventSettings?.liabilityFormsRequiredIndividual) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = individuals.map((individual: any) => {
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
