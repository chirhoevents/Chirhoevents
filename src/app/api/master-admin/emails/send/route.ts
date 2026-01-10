import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getMasterAdminTemplateById, masterAdminEmailTemplates } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

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

interface SendEmailRequest {
  templateId: string
  recipientEmail: string
  recipientName?: string
  subject: string
  // Template data
  customMessage?: string
  eventName?: string
  eventDate?: string
  eventLocation?: string
  eventDescription?: string
  ctaUrl?: string
  ctaText?: string
  senderName?: string
}

/**
 * GET - Fetch available templates for master admin
 */
export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserId(request)

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Master admin access required' },
        { status: 403 }
      )
    }

    // Return available templates (without the generateHtml function)
    const templates = masterAdminEmailTemplates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      defaultSubject: t.defaultSubject,
    }))

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST - Send an email from master admin
 */
export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserId(request)

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Master admin access required' },
        { status: 403 }
      )
    }

    const body: SendEmailRequest = await request.json()
    const {
      templateId,
      recipientEmail,
      recipientName,
      subject,
      customMessage,
      eventName,
      eventDate,
      eventLocation,
      eventDescription,
      ctaUrl,
      ctaText,
      senderName,
    } = body

    // Validate required fields
    if (!recipientEmail || !subject) {
      return NextResponse.json(
        { error: 'Recipient email and subject are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Get template
    const template = getMasterAdminTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 400 }
      )
    }

    // Generate HTML content
    const htmlContent = template.generateHtml({
      recipientName,
      customMessage,
      eventName,
      eventDate,
      eventLocation,
      eventDescription,
      ctaUrl,
      ctaText,
      senderName: senderName || `${user.firstName} ${user.lastName}`,
    })

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
    })

    if (error) {
      console.error('Resend error:', error)

      // Log failed email
      await prisma.emailLog.create({
        data: {
          organizationId: user.organizationId || 'master-admin',
          recipientEmail,
          recipientName: recipientName || null,
          emailType: `master_admin_${templateId}`,
          subject,
          htmlContent,
          sentStatus: 'failed',
          errorMessage: error.message,
          metadata: {
            sentByUserId: user.id,
            sentByUserName: `${user.firstName} ${user.lastName}`,
            templateId,
            masterAdminEmail: true,
          },
        },
      })

      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      )
    }

    // Log successful email
    await prisma.emailLog.create({
      data: {
        organizationId: user.organizationId || 'master-admin',
        recipientEmail,
        recipientName: recipientName || null,
        emailType: `master_admin_${templateId}`,
        subject,
        htmlContent,
        sentStatus: 'sent',
        metadata: {
          resendId: data?.id,
          sentByUserId: user.id,
          sentByUserName: `${user.firstName} ${user.lastName}`,
          templateId,
          masterAdminEmail: true,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      emailId: data?.id,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
