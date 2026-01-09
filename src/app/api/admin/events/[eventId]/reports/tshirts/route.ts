import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = await params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'

    // Get all participants from group registrations
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: {
          eventId,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tShirtSize: true,
        participantType: true,
        groupRegistration: {
          select: {
            groupName: true,
            parishName: true,
          },
        },
      },
    })

    // Get individual registrations
    const individualRegs = await prisma.individualRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tShirtSize: true,
        age: true,
      },
    })

    // Count by size
    const sizeCounts: Record<string, { total: number; youth: number; adult: number; details: any[] }> = {}

    // Process group participants
    for (const p of participants) {
      if (!p.tShirtSize) continue

      if (!sizeCounts[p.tShirtSize]) {
        sizeCounts[p.tShirtSize] = { total: 0, youth: 0, adult: 0, details: [] }
      }

      sizeCounts[p.tShirtSize].total++

      const isYouth = p.participantType === 'youth_u18' || p.participantType === 'youth_o18'
      if (isYouth) {
        sizeCounts[p.tShirtSize].youth++
      } else {
        sizeCounts[p.tShirtSize].adult++
      }

      if (!isPreview) {
        sizeCounts[p.tShirtSize].details.push({
          name: `${p.firstName} ${p.lastName}`,
          group: p.groupRegistration?.groupName || p.groupRegistration?.parishName || 'Unknown',
          type: p.participantType,
        })
      }
    }

    // Process individual registrations
    for (const ind of individualRegs) {
      if (!ind.tShirtSize) continue

      if (!sizeCounts[ind.tShirtSize]) {
        sizeCounts[ind.tShirtSize] = { total: 0, youth: 0, adult: 0, details: [] }
      }

      sizeCounts[ind.tShirtSize].total++

      const isYouth = ind.age && ind.age < 18
      if (isYouth) {
        sizeCounts[ind.tShirtSize].youth++
      } else {
        sizeCounts[ind.tShirtSize].adult++
      }

      if (!isPreview) {
        sizeCounts[ind.tShirtSize].details.push({
          name: `${ind.firstName} ${ind.lastName}`,
          group: 'Individual',
          type: isYouth ? 'youth' : 'adult',
        })
      }
    }

    // Calculate totals
    const totalShirts = Object.values(sizeCounts).reduce((sum: number, s: any) => sum + s.total, 0)
    const totalYouth = Object.values(sizeCounts).reduce((sum: number, s: any) => sum + s.youth, 0)
    const totalAdult = Object.values(sizeCounts).reduce((sum: number, s: any) => sum + s.adult, 0)
    const missingCount = participants.filter((p: any) => !p.tShirtSize).length +
                        individualRegs.filter((i: any) => !i.tShirtSize).length

    if (isPreview) {
      return NextResponse.json({
        totalShirts,
        totalYouth,
        totalAdult,
        missingCount,
        uniqueSizes: Object.keys(sizeCounts).length,
      })
    }

    // Sort sizes in logical order
    const sizeOrder = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'A2XL', 'A3XL', 'A4XL']
    const sortedSizes = Object.entries(sizeCounts).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a[0])
      const bIndex = sizeOrder.indexOf(b[0])
      if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return NextResponse.json({
      totalShirts,
      totalYouth,
      totalAdult,
      missingCount,
      sizeCounts: Object.fromEntries(sortedSizes),
      summary: sortedSizes.map(([size, data]) => ({
        size,
        total: data.total,
        youth: data.youth,
        adult: data.adult,
        details: data.details,
      })),
    })
  } catch (error) {
    console.error('Error generating t-shirt report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
