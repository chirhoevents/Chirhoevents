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
  recipientEmail?: string
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
  // Broadcast options
  broadcastToAllOrgs?: boolean
}

/**
 * GET - Fetch available templates and organizations for master admin
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

    // Get all organizations with their admin users for broadcast feature
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        users: {
          where: {
            role: 'org_admin',
            email: { not: null },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ templates, organizations })
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
      broadcastToAllOrgs,
    } = body

    // Validate required fields
    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!broadcastToAllOrgs && !recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }

    // Validate email format for single recipient
    if (recipientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(recipientEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address format' },
          { status: 400 }
        )
      }
    }

    // Get template
    const template = getMasterAdminTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 400 }
      )
    }

    // Get a default organization ID for logging (use first org or user's org)
    let defaultOrgId = user.organizationId
    if (!defaultOrgId) {
      const firstOrg = await prisma.organization.findFirst({
        select: { id: true },
      })
      defaultOrgId = firstOrg?.id || null
    }

    const senderFullName = senderName || `${user.firstName} ${user.lastName}`

    // Handle broadcast to all organizations
    if (broadcastToAllOrgs) {
      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          users: {
            where: {
              role: 'org_admin',
              email: { not: null },
            },
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
      }

      for (const org of organizations) {
        for (const admin of org.users) {
          if (!admin.email) continue

          try {
            const htmlContent = template.generateHtml({
              recipientName: admin.firstName || undefined,
              customMessage,
              eventName,
              eventDate,
              eventLocation,
              eventDescription,
              ctaUrl,
              ctaText,
              senderName: senderFullName,
            })

            const { error } = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
              to: admin.email,
              subject: subject,
              html: htmlContent,
            })

            if (error) {
              results.failed++
              results.errors.push(`${admin.email}: ${error.message}`)
            } else {
              results.sent++

              // Log successful email
              if (defaultOrgId) {
                await prisma.emailLog.create({
                  data: {
                    organizationId: org.id,
                    recipientEmail: admin.email,
                    recipientName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || null,
                    emailType: `master_admin_broadcast_${templateId}`,
                    subject,
                    htmlContent,
                    sentStatus: 'sent',
                    metadata: {
                      sentByUserId: user.id,
                      sentByUserName: senderFullName,
                      templateId,
                      masterAdminEmail: true,
                      broadcast: true,
                    },
                  },
                })
              }
            }
          } catch (err) {
            results.failed++
            results.errors.push(`${admin.email}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Broadcast complete: ${results.sent} sent, ${results.failed} failed`,
        results,
      })
    }

    // Single recipient email
    const htmlContent = template.generateHtml({
      recipientName,
      customMessage,
      eventName,
      eventDate,
      eventLocation,
      eventDescription,
      ctaUrl,
      ctaText,
      senderName: senderFullName,
    })

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: recipientEmail!,
      subject: subject,
      html: htmlContent,
    })

    if (error) {
      console.error('Resend error:', error)

      // Log failed email if we have an org ID
      if (defaultOrgId) {
        await prisma.emailLog.create({
          data: {
            organizationId: defaultOrgId,
            recipientEmail: recipientEmail!,
            recipientName: recipientName || null,
            emailType: `master_admin_${templateId}`,
            subject,
            htmlContent,
            sentStatus: 'failed',
            errorMessage: error.message,
            metadata: {
              sentByUserId: user.id,
              sentByUserName: senderFullName,
              templateId,
              masterAdminEmail: true,
            },
          },
        })
      }

      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      )
    }

    // Log successful email if we have an org ID
    if (defaultOrgId) {
      try {
        await prisma.emailLog.create({
          data: {
            organizationId: defaultOrgId,
            recipientEmail: recipientEmail!,
            recipientName: recipientName || null,
            emailType: `master_admin_${templateId}`,
            subject,
            htmlContent,
            sentStatus: 'sent',
            metadata: {
              resendId: data?.id,
              sentByUserId: user.id,
              sentByUserName: senderFullName,
              templateId,
              masterAdminEmail: true,
            },
          },
        })
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log email:', logError)
      }
    }

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
