import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateWeeklyDigestEmail, generateWeeklyDigestSubject } from '@/lib/weekly-digest'
import { buildOrganizationDigest, getDigestSettings } from '@/lib/weekly-digest-data'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Secret key to verify cron requests
const CRON_SECRET = process.env.CRON_SECRET

interface OrgUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

/**
 * GET /api/cron/weekly-digest
 * Triggers weekly digest emails for all organizations with digest enabled.
 * Should be called by a cron job (e.g., Vercel Cron, external scheduler)
 *
 * Headers required:
 * - Authorization: Bearer <CRON_SECRET>
 *
 * Query params:
 * - orgId: (optional) Send digest for a specific organization only
 * - test: (optional) If "true", only fetches data without sending emails
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const specificOrgId = searchParams.get('orgId')
    const isTest = searchParams.get('test') === 'true'

    const organizations = await prisma.organization.findMany({
      where: {
        ...(specificOrgId ? { id: specificOrgId } : {}),
        status: 'active',
      },
      include: {
        users: {
          where: {
            role: { in: ['org_admin', 'master_admin', 'event_manager'] },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const results: { orgId: string; orgName: string; status: string; recipients: number; error?: string }[] = []

    for (const org of organizations) {
      try {
        const digestSettings = getDigestSettings(org.customFieldsEnabled as Record<string, any>)

        if (!digestSettings.enabled && !specificOrgId) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            status: 'skipped',
            recipients: 0,
          })
          continue
        }

        const recipients = digestSettings.recipients.length > 0
          ? digestSettings.recipients
          : org.users.map((u: OrgUser) => u.email)

        if (recipients.length === 0) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            status: 'no_recipients',
            recipients: 0,
          })
          continue
        }

        const digestData = await buildOrganizationDigest(
          org.id,
          org.name,
          org.users[0]?.firstName || 'Admin'
        )

        if (isTest) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            status: 'test_success',
            recipients: recipients.length,
          })
          continue
        }

        const subject = generateWeeklyDigestSubject(org.name, digestData.dateRange)

        for (const recipientEmail of recipients) {
          const recipientUser = org.users.find((u: OrgUser) => u.email === recipientEmail)
          const personalizedDigest = {
            ...digestData,
            recipientName: recipientUser?.firstName || 'Admin',
          }

          const personalizedHtml = generateWeeklyDigestEmail(personalizedDigest)

          try {
            await resend.emails.send({
              from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
              to: recipientEmail,
              subject,
              html: personalizedHtml,
            })

            await logEmail({
              organizationId: org.id,
              recipientEmail,
              recipientName: recipientUser?.firstName ?? undefined,
              emailType: 'weekly_digest',
              subject,
              htmlContent: personalizedHtml,
            })
          } catch (emailError) {
            console.error(`Failed to send digest to ${recipientEmail}:`, emailError)
            await logEmailFailure(
              {
                organizationId: org.id,
                recipientEmail,
                recipientName: recipientUser?.firstName ?? undefined,
                emailType: 'weekly_digest',
                subject,
                htmlContent: personalizedHtml,
              },
              emailError instanceof Error ? emailError.message : 'Unknown error'
            )
          }
        }

        results.push({
          orgId: org.id,
          orgName: org.name,
          status: 'sent',
          recipients: recipients.length,
        })
      } catch (orgError) {
        console.error(`Error processing org ${org.id}:`, orgError)
        results.push({
          orgId: org.id,
          orgName: org.name,
          status: 'error',
          recipients: 0,
          error: orgError instanceof Error ? orgError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    })
  } catch (error) {
    console.error('Weekly digest cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/weekly-digest
 * Manual trigger to send digest to a specific organization or test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, testMode } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    const url = new URL(request.url)
    url.searchParams.set('orgId', organizationId)
    if (testMode) {
      url.searchParams.set('test', 'true')
    }

    const newRequest = new NextRequest(url, {
      headers: request.headers,
    })

    return GET(newRequest)
  } catch (error) {
    console.error('POST weekly-digest error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
