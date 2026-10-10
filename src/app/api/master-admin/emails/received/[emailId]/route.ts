import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { verifyClerkSessionToken } from '@/lib/jwt-auth-helper'

// Helper to get clerk user ID from auth or JWT token
async function getClerkUserId(request: NextRequest): Promise<string | null> {
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const verifiedUserId = await verifyClerkSessionToken(token)
    if (verifiedUserId) {
      return verifiedUserId
    }
  }

  return null
}

// Get a single received email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params
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

    const email = await prisma.receivedEmail.findUnique({
      where: { id: emailId },
      include: {
        inboundTicket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            priority: true,
            category: true,
          },
        },
      },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    return NextResponse.json({ email })
  } catch (error) {
    console.error('Get received email error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    )
  }
}

// Delete a received email
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params
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

    const email = await prisma.receivedEmail.findUnique({
      where: { id: emailId },
      include: { inboundTicket: { select: { id: true } } },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Nullify the ticket's receivedEmailId if one exists, so the ticket stays intact
    if (email.inboundTicket) {
      await prisma.inboundSupportTicket.update({
        where: { id: email.inboundTicket.id },
        data: { receivedEmailId: null },
      })
    }

    await prisma.receivedEmail.delete({ where: { id: emailId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete received email error:', error)
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    )
  }
}
