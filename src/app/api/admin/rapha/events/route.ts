import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAdmin()

    // Get events with Rapha enabled
    const events = await prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
        status: {
          in: ['published', 'registration_open', 'registration_closed'],
        },
        settings: {
          raphaMedicalEnabled: true,
        },
      },
      include: {
        settings: true,
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    // Get medical stats for each event
    type EventRecord = typeof events[number]
    const eventsWithStats = await Promise.all(
      events.map(async (event: EventRecord) => {
        // Get liability forms with medical info
        const liabilityForms = await prisma.liabilityForm.findMany({
          where: {
            eventId: event.id,
            completed: true,
          },
          select: {
            allergies: true,
            medications: true,
            medicalConditions: true,
            dietaryRestrictions: true,
          },
        })

        // Get participants count
        const participantCount = await prisma.participant.count({
          where: {
            groupRegistration: {
              eventId: event.id,
            },
          },
        })

        const individualCount = await prisma.individualRegistration.count({
          where: {
            eventId: event.id,
          },
        })

        // Get medical incident counts
        const activeIncidents = await prisma.medicalIncident.count({
          where: {
            eventId: event.id,
            status: {
              in: ['active', 'monitoring'],
            },
          },
        })

        const totalIncidents = await prisma.medicalIncident.count({
          where: {
            eventId: event.id,
          },
        })

        // Calculate stats from liability forms
        type FormRecord = typeof liabilityForms[number]
        // Detect severe allergies by keywords in allergies text
        const severeAllergyKeywords = ['severe', 'epipen', 'epi-pen', 'anaphylaxis', 'anaphylactic', 'life-threatening', 'life threatening']
        const severeAllergies = liabilityForms.filter((f: FormRecord) => {
          if (!f.allergies) return false
          const lowerAllergies = f.allergies.toLowerCase()
          return severeAllergyKeywords.some(keyword => lowerAllergies.includes(keyword))
        }).length
        const allergies = liabilityForms.filter((f: FormRecord) => f.allergies && f.allergies.trim() !== '').length
        const medications = liabilityForms.filter((f: FormRecord) => f.medications && f.medications.trim() !== '').length
        const medicalConditions = liabilityForms.filter((f: FormRecord) => f.medicalConditions && f.medicalConditions.trim() !== '').length
        const dietaryRestrictions = liabilityForms.filter((f: FormRecord) => f.dietaryRestrictions && f.dietaryRestrictions.trim() !== '').length

        return {
          id: event.id,
          name: event.name,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          status: event.status,
          raphaMedicalEnabled: true,
          stats: {
            totalParticipants: participantCount + individualCount,
            severeAllergies,
            allergies,
            medications,
            medicalConditions,
            dietaryRestrictions,
            activeIncidents,
            totalIncidents,
          },
        }
      })
    )

    return NextResponse.json(eventsWithStats)
  } catch (error) {
    console.error('Failed to fetch Rapha events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
