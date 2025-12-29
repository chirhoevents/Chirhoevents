import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = await params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    const groupRegs = await prisma.groupRegistration.findMany({
      where: eventFilter,
      include: { participants: true },
    })

    const individualRegs = await prisma.individualRegistration.findMany({
      where: eventFilter,
    })

    let onCampus = 0, offCampus = 0, dayPass = 0

    // Count from groups
    for (const group of groupRegs) {
      const count = group.participants.length
      if (group.housingType === 'on_campus') onCampus += count
      else if (group.housingType === 'off_campus') offCampus += count
      else if (group.housingType === 'day_pass') dayPass += count
    }

    // Count from individuals
    for (const ind of individualRegs) {
      if (ind.housingType === 'on_campus') onCampus++
      else if (ind.housingType === 'off_campus') offCampus++
      else if (ind.housingType === 'day_pass') dayPass++
    }

    const total = onCampus + offCampus + dayPass

    if (isPreview) {
      return NextResponse.json({ onCampus, offCampus, dayPass, total })
    }

    // On-campus details by type
    const onCampusDetails: any = {
      youth_u18: { total: 0, male: 0, female: 0 },
      youth_o18: { total: 0, male: 0, female: 0 },
      chaperones: { total: 0, male: 0, female: 0 },
    }

    for (const group of groupRegs.filter((g: any) => g.housingType === 'on_campus')) {
      for (const p of group.participants) {
        const type = p.participantType === 'chaperone' ? 'chaperones' : p.participantType
        if (onCampusDetails[type]) {
          onCampusDetails[type].total++
          if (p.gender === 'male') onCampusDetails[type].male++
          if (p.gender === 'female') onCampusDetails[type].female++
        }
      }
    }

    // Room types from individuals
    const roomTypes: any = { single: 0, double: 0, triple: 0, quad: 0 }
    for (const ind of individualRegs.filter((i: any) => i.housingType === 'on_campus')) {
      if (ind.roomType && roomTypes[ind.roomType] !== undefined) {
        roomTypes[ind.roomType]++
      }
    }

    // Special accommodations (only from individual registrations - participants don't have this field)
    const adaCount = individualRegs.filter(
      (ind: any) => ind.adaAccommodations && ind.adaAccommodations !== ''
    ).length

    return NextResponse.json({
      onCampus,
      offCampus,
      dayPass,
      total,
      onCampusDetails,
      roomTypes,
      specialAccommodations: { ada: adaCount },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
