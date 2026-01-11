import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Decode JWT payload to extract user ID when cookies aren't available
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

// Helper to get clerk user ID from auth or JWT token
async function getClerkUserId(request: NextRequest): Promise<string | null> {
  // Try to get userId from Clerk's auth (works when cookies are established)
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

  // Fallback: try to get userId from Authorization header (JWT token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
      return payload.sub
    }
  }

  return null
}

// List all emails (master admin)
export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserId(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'received' or 'sent'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    if (type === 'received') {
      // Fetch received/inbound emails
      const where: Record<string, unknown> = {}

      if (search) {
        where.OR = [
          { fromAddress: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [emails, total] = await Promise.all([
        prisma.receivedEmail.findMany({
          where,
          include: {
            inboundTicket: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.receivedEmail.count({ where }),
      ])

      // Get counts
      const [totalReceived, processedCount, unprocessedCount] = await Promise.all([
        prisma.receivedEmail.count(),
        prisma.receivedEmail.count({ where: { processed: true } }),
        prisma.receivedEmail.count({ where: { processed: false } }),
      ])

      return NextResponse.json({
        emails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        counts: {
          total: totalReceived,
          processed: processedCount,
          unprocessed: unprocessedCount,
        },
      })
    } else {
      // Fetch sent/outbound emails
      const where: Record<string, unknown> = {}

      if (search) {
        where.OR = [
          { recipientEmail: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { recipientName: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [emails, total] = await Promise.all([
        prisma.emailLog.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.emailLog.count({ where }),
      ])

      // Get counts by status
      const statusCounts = await prisma.emailLog.groupBy({
        by: ['sentStatus'],
        _count: { sentStatus: true },
      })

      type StatusCountType = typeof statusCounts[0]

      const counts = {
        total: 0,
        sent: 0,
        failed: 0,
        bounced: 0,
      }

      statusCounts.forEach((c: StatusCountType) => {
        counts[c.sentStatus as keyof typeof counts] = c._count.sentStatus
        counts.total += c._count.sentStatus
      })

      return NextResponse.json({
        emails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        counts,
      })
    }
  } catch (error) {
    console.error('List emails error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}
