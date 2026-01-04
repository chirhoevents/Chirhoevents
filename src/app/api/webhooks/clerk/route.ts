import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('❌ Missing CLERK_WEBHOOK_SECRET environment variable')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Get the headers
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('❌ Missing svix headers')
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      )
    }

    // Get the body
    const body = await request.text()

    // Verify the webhook
    const wh = new Webhook(webhookSecret)
    let event: ClerkWebhookEvent

    try {
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent
    } catch (err) {
      console.error('❌ Webhook verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    const eventType = event.type
    console.log('📬 Clerk webhook received:', eventType)

    // Handle user.created event
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = event.data
      const email = email_addresses?.[0]?.email_address || ''

      console.log('👤 New user signed up:', email)

      // Check if user already exists (shouldn't happen, but just in case)
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: id },
      })

      if (existingUser) {
        console.log('⚠️ User already exists in database')
        return NextResponse.json({ received: true })
      }

      // Create user in database
      // By default, new users are group_leader role
      // Admin roles must be assigned manually
      await prisma.user.create({
        data: {
          clerkUserId: id,
          email: email,
          firstName: first_name || '',
          lastName: last_name || '',
          role: 'group_leader', // Default role - admin must be assigned manually
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      console.log('✅ User created in database:', email)
    }

    // Handle user.updated event
    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = event.data
      const email = email_addresses?.[0]?.email_address || ''

      console.log('🔄 User updated:', email)

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: id },
      })

      if (!existingUser) {
        // User doesn't exist in our database, create them
        console.log('⚠️ User not found in database, creating...')
        await prisma.user.create({
          data: {
            clerkUserId: id,
            email: email,
            firstName: first_name || '',
            lastName: last_name || '',
            role: 'group_leader',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
        console.log('✅ User created in database')
      } else {
        // Update existing user
        await prisma.user.update({
          where: { clerkUserId: id },
          data: {
            email: email,
            firstName: first_name || '',
            lastName: last_name || '',
            updatedAt: new Date(),
          },
        })
        console.log('✅ User updated in database')
      }
    }

    // Handle user.deleted event
    if (eventType === 'user.deleted') {
      const { id } = event.data

      console.log('🗑️ User deleted from Clerk:', id)

      // Check if user exists before trying to delete
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: id },
      })

      if (existingUser) {
        await prisma.user.delete({
          where: { clerkUserId: id },
        })
        console.log('✅ User deleted from database')
      } else {
        console.log('⚠️ User not found in database, nothing to delete')
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Clerk webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
