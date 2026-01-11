import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put, del } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const accessCode = formData.get('accessCode') as string

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Verify vendor exists
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { accessCode },
      select: { id: true, logoUrl: true, status: true },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'approved') {
      return NextResponse.json({ error: 'Vendor not approved' }, { status: 403 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Delete old logo if exists
    if (vendor.logoUrl) {
      try {
        await del(vendor.logoUrl)
      } catch (e) {
        console.error('Failed to delete old logo:', e)
      }
    }

    // Upload new logo
    const timestamp = Date.now()
    const filename = `vendor-logos/${vendor.id}-${timestamp}.${file.type.split('/')[1]}`

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    })

    // Update vendor with new logo URL
    await prisma.vendorRegistration.update({
      where: { id: vendor.id },
      data: { logoUrl: blob.url },
    })

    return NextResponse.json({ logoUrl: blob.url })
  } catch (error) {
    console.error('Error uploading vendor logo:', error)
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessCode = searchParams.get('code')

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Verify vendor exists
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { accessCode },
      select: { id: true, logoUrl: true },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.logoUrl) {
      try {
        await del(vendor.logoUrl)
      } catch (e) {
        console.error('Failed to delete logo:', e)
      }

      await prisma.vendorRegistration.update({
        where: { id: vendor.id },
        data: { logoUrl: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor logo:', error)
    return NextResponse.json(
      { error: 'Failed to delete logo' },
      { status: 500 }
    )
  }
}
