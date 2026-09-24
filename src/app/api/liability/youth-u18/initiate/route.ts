import { NextRequest, NextResponse } from 'next/server'
import { POROS_FROM } from '@/lib/poros-email'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { checkGroupParticipantCapacity, GROUP_CAPACITY_FULL_MESSAGE } from '@/lib/group-participant-capacity'

const resend = new Resend(process.env.RESEND_API_KEY!)

function maskEmail(email: string | null): string {
  if (!email) return '(none on file)'
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`
}

function toDateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      access_code,
      first_name,
      last_name,
      preferred_name,
      date_of_birth,
      age,
      gender,
      t_shirt_size,
      parent_email,
      confirm_duplicate,
      duplicate_action,
      existing_form_id,
    } = body

    // Validate required fields
    if (!access_code || !first_name || !last_name || !date_of_birth || !age || !gender || !t_shirt_size || !parent_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate age is between 12-17
    if (age < 12 || age > 17) {
      return NextResponse.json(
        { error: 'Age must be between 12 and 17 for Youth Under 18 forms' },
        { status: 400 }
      )
    }

    // Generate parent token (expires in 7 days)
    const parentToken = randomUUID()
    const parentTokenExpiresAt = new Date()
    parentTokenExpiresAt.setDate(parentTokenExpiresAt.getDate() + 7)

    let liabilityForm
    let eventName: string
    let eventStartDate: Date | null = null
    let contactEmail: string
    let replyToAddr: string = 'support@chirhoevents.com'

    // Check if this is an individual registration code (starts with "IND-")
    if (access_code.startsWith('IND-')) {
      // Find individual registration by confirmation code
      const individualRegistration = await prisma.individualRegistration.findUnique({
        where: { confirmationCode: access_code },
        include: {
          event: { include: { settings: true } },
          organization: true,
          liabilityForms: true,
        },
      })

      if (!individualRegistration) {
        return NextResponse.json(
          { error: 'Invalid access code' },
          { status: 404 }
        )
      }

      eventName = individualRegistration.event.name
      eventStartDate = individualRegistration.event.startDate
      contactEmail = individualRegistration.email
      replyToAddr = resolveReplyTo(individualRegistration.event.settings, individualRegistration.organization)

      // Check if a liability form already exists for this individual
      const existingForm = individualRegistration.liabilityForms[0]

      if (existingForm) {
        // Update the existing form with new data and parent token
        liabilityForm = await prisma.liabilityForm.update({
          where: { id: existingForm.id },
          data: {
            participantType: 'youth_u18',
            participantFirstName: first_name,
            participantLastName: last_name,
            participantPreferredName: preferred_name || null,
            participantAge: age,
            participantGender: gender,
            dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
            tShirtSize: t_shirt_size,
            parentEmail: parent_email,
            parentToken: parentToken,
            parentTokenExpiresAt: parentTokenExpiresAt,
          },
        })
      } else {
        // Create new liability form for individual
        liabilityForm = await prisma.liabilityForm.create({
          data: {
            organizationId: individualRegistration.organizationId,
            eventId: individualRegistration.eventId,
            individualRegistrationId: individualRegistration.id,
            formType: 'youth_u18',
            participantType: 'youth_u18',
            participantFirstName: first_name,
            participantLastName: last_name,
            participantPreferredName: preferred_name || null,
            participantAge: age,
            participantGender: gender,
            dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
            participantEmail: individualRegistration.email,
            tShirtSize: t_shirt_size,
            parentEmail: parent_email,
            parentToken: parentToken,
            parentTokenExpiresAt: parentTokenExpiresAt,
            signatureData: {},
            completed: false,
          },
        })
      }
    } else {
      // Original group registration flow
      const groupRegistration = await prisma.groupRegistration.findUnique({
        where: { accessCode: access_code },
        include: {
          event: { include: { settings: true } },
          organization: true,
        },
      })

      if (!groupRegistration) {
        return NextResponse.json(
          { error: 'Invalid access code' },
          { status: 404 }
        )
      }

      eventName = groupRegistration.event.name
      eventStartDate = groupRegistration.event.startDate
      contactEmail = groupRegistration.groupLeaderEmail
      replyToAddr = resolveReplyTo(groupRegistration.event.settings, groupRegistration.organization)

      // Group registrations have no per-participant ID to key off at this step, so the
      // same teen resubmitting (e.g. to fix a typo'd parent email) used to always create
      // a brand-new LiabilityForm row instead of updating theirs — leaving duplicates.
      // Look for existing entries by name — across every form type, since a teen who
      // started the u18 form may have finished on the 18+ form instead — and, unless
      // the caller has already confirmed how to proceed, ask before creating another.
      const sameNameForms = await prisma.liabilityForm.findMany({
        where: {
          groupRegistrationId: groupRegistration.id,
          participantFirstName: { equals: first_name.trim(), mode: 'insensitive' },
          participantLastName: { equals: last_name.trim(), mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Same name AND same date of birth is the same person, full stop — "different
      // person" is only a plausible answer when the birthdays differ. Without this,
      // a teen who clicked "different person" (e.g. because they were switching which
      // parent to send it to) piled up a fresh pending row on every retry.
      const submittedDob = toDateKey(date_of_birth)
      const sameDob = (form: { dateOfBirth: Date | null }) =>
        submittedDob !== null && toDateKey(form.dateOfBirth) === submittedDob
      const pendingU18 = sameNameForms.filter(
        (f) => f.formType === 'youth_u18' && !f.completed && !f.participantId
      )
      const completedSamePerson = sameNameForms.find((f) => f.completed && sameDob(f))
      const pendingSamePerson = pendingU18.find(sameDob)

      if (completedSamePerson) {
        return NextResponse.json(
          { error: 'A completed and signed form already exists for this person in this group. Contact your group leader or the event organizer if it needs to be corrected.' },
          { status: 400 }
        )
      }

      if (!confirm_duplicate) {
        const possibleDuplicate = pendingSamePerson ?? sameNameForms[0]

        if (possibleDuplicate) {
          return NextResponse.json({
            duplicate_found: true,
            existing_form: {
              id: possibleDuplicate.id,
              completed: possibleDuplicate.completed,
              same_person: Boolean(pendingSamePerson),
              parent_email_masked: maskEmail(possibleDuplicate.parentEmail),
              created_at: possibleDuplicate.createdAt,
            },
          })
        }
      }

      // A "new" choice against a same-birthday pending form is really an update.
      const updateTargetId =
        pendingSamePerson?.id ??
        (confirm_duplicate && duplicate_action === 'update' ? existing_form_id : null)

      if (updateTargetId) {
        const existingForm = await prisma.liabilityForm.findFirst({
          where: { id: updateTargetId, groupRegistrationId: groupRegistration.id },
        })

        if (!existingForm) {
          return NextResponse.json({ error: 'Existing form not found' }, { status: 404 })
        }

        // A completed, signed form is a legal document — don't let a resubmission
        // silently reopen it. The frontend only offers "update" for incomplete ones,
        // but guard here too in case of a stale confirmation.
        if (existingForm.completed) {
          return NextResponse.json(
            { error: 'That form has already been completed and signed. Contact the event organizer if it needs to be corrected.' },
            { status: 400 }
          )
        }

        // Any other pending, unsigned u18 rows for this same person are leftovers
        // from earlier restarts — clear them so they stop showing as "Waiting on
        // Parent" and stop holding group capacity.
        const staleIds = pendingU18
          .filter((f) => f.id !== existingForm.id && (sameDob(f) || f.dateOfBirth === null))
          .map((f) => f.id)
        if (staleIds.length > 0) {
          await prisma.liabilityForm.deleteMany({
            where: { id: { in: staleIds }, completed: false, participantId: null },
          })
        }

        liabilityForm = await prisma.liabilityForm.update({
          where: { id: existingForm.id },
          data: {
            participantType: 'youth_u18',
            participantFirstName: first_name,
            participantLastName: last_name,
            participantPreferredName: preferred_name || null,
            participantAge: age,
            participantGender: gender,
            dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
            tShirtSize: t_shirt_size,
            parentEmail: parent_email,
            parentToken: parentToken,
            parentTokenExpiresAt: parentTokenExpiresAt,
          },
        })
      } else {
        // Claiming a brand-new slot (as opposed to updating a pending form above) —
        // enforce the group's registered participant cap here, not just at signing,
        // since a pending-parent-verification form already ties up a spot.
        const capacity = await checkGroupParticipantCapacity(groupRegistration.id)
        if (!capacity.hasCapacity) {
          return NextResponse.json(
            { error: GROUP_CAPACITY_FULL_MESSAGE },
            { status: 409 }
          )
        }

        // Create new liability form record for group participant
        liabilityForm = await prisma.liabilityForm.create({
          data: {
            organizationId: groupRegistration.organizationId,
            eventId: groupRegistration.eventId,
            groupRegistrationId: groupRegistration.id,
            formType: 'youth_u18',
            participantType: 'youth_u18',
            participantFirstName: first_name,
            participantLastName: last_name,
            participantPreferredName: preferred_name || null,
            participantAge: age,
            participantGender: gender,
            dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
            participantEmail: null,
            tShirtSize: t_shirt_size,
            parentEmail: parent_email,
            parentToken: parentToken,
            parentTokenExpiresAt: parentTokenExpiresAt,
            signatureData: {},
            completed: false,
          },
        })
      }
    }

    // Send email to parent
    const parentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/poros/parent/${parentToken}`
    const deadlineText = eventStartDate
      ? `before ${eventStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
      : 'before the event'
    const preheader = `${first_name} can't attend ${eventName} until you complete this form.`

    let emailSent = true
    try {
    await resend.emails.send({
      from: POROS_FROM,
      reply_to: replyToAddr,
      to: parent_email,
      subject: `ACTION REQUIRED: Complete ${first_name} ${last_name}'s liability form for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <!-- Preheader text shown in inbox preview, hidden in the email body -->
          <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #ffffff;">
            ${preheader}
          </div>

          <!-- ChiRho Events Logo Header -->
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="background-color: #B91C1C; padding: 12px 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
              ⚠️ ACTION REQUIRED — REGISTRATION IS NOT COMPLETE
            </p>
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F; margin-top: 0;">Complete ${first_name}'s Liability Form</h1>

            <p>Hi,</p>

            <p>
              <strong>${first_name} ${last_name}</strong> has started registration for <strong>${eventName}</strong>,
              but <strong>they cannot attend until you complete and sign this liability form ${deadlineText}</strong>.
              No one else can do this step for you — as their parent/guardian, only you can complete it.
            </p>

            <p>This form includes:</p>
            <ul>
              <li>Medical information</li>
              <li>Emergency contacts</li>
              <li>Insurance information</li>
              <li>Consent sections</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${parentLink}" style="display: inline-block; padding: 15px 30px; background-color: #B91C1C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Complete Form Now (Takes ~5 Minutes)
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${parentLink}" style="color: #1E3A5F;">${parentLink}</a>
            </p>

            <div style="background-color: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                This link expires in 7 days. If it expires before you complete the form, contact ${contactEmail} for a new one.
              </p>
            </div>

            <p style="font-size: 14px; color: #666;">
              If you didn't expect this email, please contact ${contactEmail}.
            </p>

            <p>Pax Christi,<br><strong>ChiRho Events Team</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })
    } catch (emailErr) {
      emailSent = false
      console.error('[Youth U18 Initiate] Failed to send parent email:', emailErr)
    }

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      message: emailSent ? 'Email sent to parent successfully' : 'Form created but email failed to send — share the link manually',
      parent_link: parentLink,
      form_id: liabilityForm.id,
    })
  } catch (error) {
    console.error('Youth U18 initiate error:', error)
    return NextResponse.json(
      { error: 'Failed to process form. Please try again.' },
      { status: 500 }
    )
  }
}
