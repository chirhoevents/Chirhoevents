import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

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

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactName: true,
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Get invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// Update invoice (status, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

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

    const { invoiceId } = await params
    const body = await request.json()
    const { status, paidAt, notes } = body

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === 'paid' && !paidAt) {
        updateData.paidAt = new Date()
      }
    }

    if (paidAt) {
      updateData.paidAt = new Date(paidAt)
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    // If marking as paid and it's a setup fee, update the org's setupFeePaid flag
    if (status === 'paid' && invoice.invoiceType === 'setup_fee') {
      await prisma.organization.update({
        where: { id: invoice.organizationId },
        data: { setupFeePaid: true },
      })
    }

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: invoice.organizationId,
        userId: user.id,
        activityType: 'invoice_updated',
        description: `Updated invoice #${invoice.invoiceNumber} status to ${status}`,
      },
    })

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error('Update invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

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

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoiceNumber: true, organizationId: true, status: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete a paid invoice' },
        { status: 400 }
      )
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: invoice.organizationId,
        userId: user.id,
        activityType: 'invoice_deleted',
        description: `Deleted invoice #${invoice.invoiceNumber}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
