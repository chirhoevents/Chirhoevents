import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get liability forms with medical info and participant details
    const forms = await prisma.liabilityForm.findMany({
      where: {
        participant: {
          groupRegistration: eventFilter,
        },
      },
      include: {
        participant: {
          select: {
            firstName: true,
            lastName: true,
            groupRegistration: {
              select: {
                groupName: true,
                parishName: true,
                groupLeaderEmail: true,
                groupLeaderPhone: true,
              },
            },
          },
        },
      },
    })

    // Separate counting
    const foodAllergiesCount = forms.filter((f: any) => f.allergies && f.allergies !== '').length
    const dietaryRestrictionsCount = forms.filter((f: any) => f.dietaryRestrictions && f.dietaryRestrictions !== '').length
    const medicalConditionsCount = forms.filter((f: any) => f.medicalConditions && f.medicalConditions !== '').length
    const medicationsCount = forms.filter((f: any) => f.medications && f.medications !== '').length

    if (isPreview) {
      return NextResponse.json({
        foodAllergiesCount,
        dietaryRestrictionsCount,
        medicalConditionsCount,
        medicationsCount,
      })
    }

    // FOOD ALLERGIES (Critical for meal planning)
    const foodAllergies: any[] = []
    const foodAllergyKeywords = ['peanut', 'nut', 'shellfish', 'fish', 'dairy', 'egg', 'soy', 'wheat', 'gluten']

    for (const form of forms) {
      if (form.allergies) {
        const lower = form.allergies.toLowerCase()
        const detectedAllergies: string[] = []

        if (lower.includes('peanut')) detectedAllergies.push('Peanuts')
        if (lower.includes('tree nut') || (lower.includes('nut') && !lower.includes('peanut'))) detectedAllergies.push('Tree Nuts')
        if (lower.includes('shellfish')) detectedAllergies.push('Shellfish')
        if (lower.includes('fish') && !lower.includes('shellfish')) detectedAllergies.push('Fish')
        if (lower.includes('dairy') || lower.includes('milk')) detectedAllergies.push('Dairy')
        if (lower.includes('egg')) detectedAllergies.push('Eggs')
        if (lower.includes('soy')) detectedAllergies.push('Soy')
        if (lower.includes('wheat') || lower.includes('gluten')) detectedAllergies.push('Wheat/Gluten')

        if (foodAllergyKeywords.some(keyword => lower.includes(keyword))) {
          foodAllergies.push({
            name: `${form.participant?.firstName} ${form.participant?.lastName}`,
            group: form.participant?.groupRegistration?.groupName || form.participant?.groupRegistration?.parishName || 'Individual',
            groupLeaderEmail: form.participant?.groupRegistration?.groupLeaderEmail,
            groupLeaderPhone: form.participant?.groupRegistration?.groupLeaderPhone,
            allergies: detectedAllergies.length > 0 ? detectedAllergies : ['See notes'],
            fullText: form.allergies,
            severity: lower.includes('epipen') || lower.includes('anaphyl') ? 'SEVERE' : 'Moderate',
          })
        }
      }
    }

    // DIETARY RESTRICTIONS (Preferences/lifestyle)
    const dietaryRestrictions: any[] = []
    const dietaryCounts: Record<string, number> = {}

    for (const form of forms) {
      if (form.dietaryRestrictions) {
        const lower = form.dietaryRestrictions.toLowerCase()
        const restrictions: string[] = []

        if (lower.includes('vegetarian')) {
          restrictions.push('Vegetarian')
          dietaryCounts['vegetarian'] = (dietaryCounts['vegetarian'] || 0) + 1
        }
        if (lower.includes('vegan')) {
          restrictions.push('Vegan')
          dietaryCounts['vegan'] = (dietaryCounts['vegan'] || 0) + 1
        }
        if (lower.includes('kosher')) {
          restrictions.push('Kosher')
          dietaryCounts['kosher'] = (dietaryCounts['kosher'] || 0) + 1
        }
        if (lower.includes('halal')) {
          restrictions.push('Halal')
          dietaryCounts['halal'] = (dietaryCounts['halal'] || 0) + 1
        }
        if (lower.includes('gluten')) {
          restrictions.push('Gluten-Free')
          dietaryCounts['gluten_free'] = (dietaryCounts['gluten_free'] || 0) + 1
        }
        if (lower.includes('lactose')) {
          restrictions.push('Lactose Intolerant')
          dietaryCounts['lactose_free'] = (dietaryCounts['lactose_free'] || 0) + 1
        }

        dietaryRestrictions.push({
          name: `${form.participant?.firstName} ${form.participant?.lastName}`,
          group: form.participant?.groupRegistration?.groupName || form.participant?.groupRegistration?.parishName || 'Individual',
          restrictions: restrictions.length > 0 ? restrictions : ['See notes'],
          fullText: form.dietaryRestrictions,
        })
      }
    }

    // MEDICAL CONDITIONS (Health issues)
    const medicalConditions: any[] = []
    const medicalCounts: Record<string, number> = {}

    for (const form of forms) {
      if (form.medicalConditions) {
        const lower = form.medicalConditions.toLowerCase()
        const conditions: string[] = []

        if (lower.includes('asthma')) {
          conditions.push('Asthma')
          medicalCounts['asthma'] = (medicalCounts['asthma'] || 0) + 1
        }
        if (lower.includes('diabetes')) {
          conditions.push('Diabetes')
          medicalCounts['diabetes'] = (medicalCounts['diabetes'] || 0) + 1
        }
        if (lower.includes('seizure') || lower.includes('epilepsy')) {
          conditions.push('Seizure Disorder')
          medicalCounts['seizure_disorder'] = (medicalCounts['seizure_disorder'] || 0) + 1
        }
        if (lower.includes('adhd') || lower.includes('add')) {
          conditions.push('ADHD/ADD')
          medicalCounts['adhd'] = (medicalCounts['adhd'] || 0) + 1
        }
        if (lower.includes('heart')) {
          conditions.push('Heart Condition')
          medicalCounts['heart'] = (medicalCounts['heart'] || 0) + 1
        }

        medicalConditions.push({
          name: `${form.participant?.firstName} ${form.participant?.lastName}`,
          group: form.participant?.groupRegistration?.groupName || form.participant?.groupRegistration?.parishName || 'Individual',
          groupLeaderEmail: form.participant?.groupRegistration?.groupLeaderEmail,
          groupLeaderPhone: form.participant?.groupRegistration?.groupLeaderPhone,
          conditions: conditions.length > 0 ? conditions : ['See notes'],
          fullText: form.medicalConditions,
        })
      }
    }

    // MEDICATIONS (Critical medications)
    const criticalMedications: any[] = []
    const medicationCounts: Record<string, number> = {}

    for (const form of forms) {
      if (form.medications) {
        const lower = form.medications.toLowerCase()
        const meds: string[] = []

        if (lower.includes('epipen')) {
          meds.push('EpiPen')
          medicationCounts['epipen'] = (medicationCounts['epipen'] || 0) + 1
        }
        if (lower.includes('inhaler')) {
          meds.push('Inhaler')
          medicationCounts['inhaler'] = (medicationCounts['inhaler'] || 0) + 1
        }
        if (lower.includes('insulin')) {
          meds.push('Insulin')
          medicationCounts['insulin'] = (medicationCounts['insulin'] || 0) + 1
        }

        criticalMedications.push({
          name: `${form.participant?.firstName} ${form.participant?.lastName}`,
          group: form.participant?.groupRegistration?.groupName || form.participant?.groupRegistration?.parishName || 'Individual',
          groupLeaderEmail: form.participant?.groupRegistration?.groupLeaderEmail,
          groupLeaderPhone: form.participant?.groupRegistration?.groupLeaderPhone,
          medications: meds.length > 0 ? meds : ['See notes'],
          fullText: form.medications,
        })
      }
    }

    // ADA Accommodations
    const adaForms = forms.filter((f: any) => f.adaAccommodations && f.adaAccommodations !== '')
    const adaDetails: any[] = adaForms.map((form: any) => ({
      name: `${form.participant?.firstName} ${form.participant?.lastName}`,
      group: form.participant?.groupRegistration?.groupName || form.participant?.groupRegistration?.parishName || 'Individual',
      groupLeaderEmail: form.participant?.groupRegistration?.groupLeaderEmail,
      accommodations: form.adaAccommodations,
    }))

    return NextResponse.json({
      summary: {
        foodAllergiesCount,
        dietaryRestrictionsCount,
        medicalConditionsCount,
        medicationsCount,
        adaCount: adaForms.length,
      },
      foodAllergies: {
        total: foodAllergies.length,
        severe: foodAllergies.filter((f: any) => f.severity === 'SEVERE').length,
        details: foodAllergies.sort((a, b) => a.severity === 'SEVERE' ? -1 : 1),
      },
      dietaryRestrictions: {
        total: dietaryRestrictions.length,
        counts: dietaryCounts,
        details: dietaryRestrictions,
      },
      medicalConditions: {
        total: medicalConditions.length,
        counts: medicalCounts,
        details: medicalConditions,
      },
      medications: {
        total: criticalMedications.length,
        counts: medicationCounts,
        details: criticalMedications,
      },
      ada: {
        total: adaDetails.length,
        details: adaDetails,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
