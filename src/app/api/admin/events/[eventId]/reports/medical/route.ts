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

    // Get liability forms with medical info
    const forms = await prisma.liabilityForm.findMany({
      where: {
        participant: {
          groupRegistration: eventFilter,
        },
      },
    })

    const allergiesCount = forms.filter(f => f.allergies && f.allergies !== '').length
    const dietaryCount = forms.filter(f => f.dietaryRestrictions && f.dietaryRestrictions !== '').length
    const medicalCount = forms.filter(f => f.medicalConditions && f.medicalConditions !== '').length

    if (isPreview) {
      return NextResponse.json({ allergiesCount, dietaryCount, medicalCount })
    }

    // Parse allergies (severe ones - simplified detection)
    const severeAllergies: Record<string, number> = {}
    const severeKeywords = ['peanut', 'nut', 'shellfish', 'bee', 'wasp', 'epipen']

    for (const form of forms) {
      if (form.allergies) {
        const lower = form.allergies.toLowerCase()
        if (severeKeywords.some(keyword => lower.includes(keyword))) {
          // Simplified - just count peanuts, nuts, shellfish
          if (lower.includes('peanut')) severeAllergies['peanuts'] = (severeAllergies['peanuts'] || 0) + 1
          if (lower.includes('nut') && !lower.includes('peanut')) severeAllergies['tree_nuts'] = (severeAllergies['tree_nuts'] || 0) + 1
          if (lower.includes('shellfish')) severeAllergies['shellfish'] = (severeAllergies['shellfish'] || 0) + 1
        }
      }
    }

    // Parse dietary restrictions
    const dietary: Record<string, number> = {}
    const dietaryKeywords = ['vegetarian', 'vegan', 'gluten', 'lactose']
    for (const form of forms) {
      if (form.dietaryRestrictions) {
        const lower = form.dietaryRestrictions.toLowerCase()
        if (lower.includes('vegetarian')) dietary['vegetarian'] = (dietary['vegetarian'] || 0) + 1
        if (lower.includes('vegan')) dietary['vegan'] = (dietary['vegan'] || 0) + 1
        if (lower.includes('gluten')) dietary['gluten_free'] = (dietary['gluten_free'] || 0) + 1
        if (lower.includes('lactose')) dietary['lactose_intolerant'] = (dietary['lactose_intolerant'] || 0) + 1
      }
    }

    // Parse medical conditions
    const medical: Record<string, number> = {}
    const medicalKeywords = ['asthma', 'diabetes', 'seizure', 'adhd', 'epilepsy']
    for (const form of forms) {
      if (form.medicalConditions) {
        const lower = form.medicalConditions.toLowerCase()
        if (lower.includes('asthma')) medical['asthma'] = (medical['asthma'] || 0) + 1
        if (lower.includes('diabetes')) medical['diabetes'] = (medical['diabetes'] || 0) + 1
        if (lower.includes('seizure') || lower.includes('epilepsy')) medical['seizure_disorder'] = (medical['seizure_disorder'] || 0) + 1
        if (lower.includes('adhd')) medical['adhd'] = (medical['adhd'] || 0) + 1
      }
    }

    // Medications
    const medications: Record<string, number> = {}
    for (const form of forms) {
      if (form.medications) {
        const lower = form.medications.toLowerCase()
        if (lower.includes('epipen')) medications['epipen'] = (medications['epipen'] || 0) + 1
        if (lower.includes('inhaler')) medications['inhaler'] = (medications['inhaler'] || 0) + 1
        if (lower.includes('insulin')) medications['insulin'] = (medications['insulin'] || 0) + 1
      }
    }

    // ADA
    const adaForms = forms.filter(f => f.adaAccommodations && f.adaAccommodations !== '')
    const adaTotal = adaForms.length
    const adaTypes: Record<string, number> = {}
    for (const form of adaForms) {
      const lower = (form.adaAccommodations || '').toLowerCase()
      if (lower.includes('wheelchair')) adaTypes['wheelchair'] = (adaTypes['wheelchair'] || 0) + 1
      if (lower.includes('hearing')) adaTypes['hearing'] = (adaTypes['hearing'] || 0) + 1
      if (lower.includes('visual')) adaTypes['visual'] = (adaTypes['visual'] || 0) + 1
    }

    return NextResponse.json({
      allergiesCount,
      dietaryCount,
      medicalCount,
      allergies: {
        severe: Object.entries(severeAllergies).map(([type, count]) => ({ type, count })),
      },
      dietary,
      medical,
      medications,
      ada: { total: adaTotal, types: adaTypes },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
