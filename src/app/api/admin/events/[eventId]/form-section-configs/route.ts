import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess, verifyFormsEditAccess } from '@/lib/api-auth'
import { seedDefaultSectionConfigs } from '@/lib/seed-section-configs'
import { ParticipantType } from '@prisma/client'

// GET /api/admin/events/[eventId]/form-section-configs
// Returns all section configs grouped by participant_type.
// If no configs exist yet, seeds defaults first.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, effectiveOrgId } = await verifyFormsViewAccess(
      request,
      eventId,
      '[FormSectionConfigs GET]'
    )
    if (error) return error

    // Seed defaults if this event has never been configured
    const count = await prisma.liabilityFormSectionConfig.count({ where: { eventId } })
    if (count === 0) {
      await seedDefaultSectionConfigs(eventId, effectiveOrgId!)
    }

    const configs = await prisma.liabilityFormSectionConfig.findMany({
      where: { eventId },
      orderBy: [{ participantType: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        participantType: true,
        sectionKey: true,
        enabled: true,
        required: true,
        displayOrder: true,
        customLabel: true,
        customHelpText: true,
        updatedAt: true,
      },
    })

    // Group by participantType for easier consumption by the admin UI
    const grouped: Record<string, typeof configs> = {}
    for (const c of configs) {
      if (!grouped[c.participantType]) grouped[c.participantType] = []
      grouped[c.participantType].push(c)
    }

    return NextResponse.json({ configs: grouped })
  } catch (err) {
    console.error('[FormSectionConfigs GET] error:', err)
    return NextResponse.json({ error: 'Failed to fetch section configs' }, { status: 500 })
  }
}

interface SectionConfigUpdate {
  participant_type: string
  section_key: string
  enabled: boolean
  required: boolean
  display_order: number
  custom_label?: string | null
  custom_help_text?: string | null
}

// PUT /api/admin/events/[eventId]/form-section-configs
// Body: { updates: SectionConfigUpdate[] }
// Upserts each row; safe to send partial sets (only touched configs change).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, effectiveOrgId } = await verifyFormsEditAccess(
      request,
      eventId,
      '[FormSectionConfigs PUT]'
    )
    if (error) return error

    const body = await request.json()
    const updates: SectionConfigUpdate[] = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'updates must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate participant_type values
    const validTypes = new Set<string>(Object.values(ParticipantType))
    for (const u of updates) {
      if (!validTypes.has(u.participant_type)) {
        return NextResponse.json(
          { error: `Invalid participant_type: ${u.participant_type}` },
          { status: 400 }
        )
      }
    }

    const upserts = updates.map((u) =>
      prisma.liabilityFormSectionConfig.upsert({
        where: {
          uq_section_config: {
            eventId,
            participantType: u.participant_type as ParticipantType,
            sectionKey: u.section_key,
          },
        },
        create: {
          organizationId: effectiveOrgId!,
          eventId,
          participantType: u.participant_type as ParticipantType,
          sectionKey: u.section_key,
          enabled: u.enabled,
          required: u.required,
          displayOrder: u.display_order,
          customLabel: u.custom_label ?? null,
          customHelpText: u.custom_help_text ?? null,
        },
        update: {
          enabled: u.enabled,
          required: u.required,
          displayOrder: u.display_order,
          customLabel: u.custom_label ?? null,
          customHelpText: u.custom_help_text ?? null,
        },
        select: { id: true, participantType: true, sectionKey: true },
      })
    )

    const results = await prisma.$transaction(upserts)
    return NextResponse.json({ updated: results.length })
  } catch (err) {
    console.error('[FormSectionConfigs PUT] error:', err)
    return NextResponse.json({ error: 'Failed to update section configs' }, { status: 500 })
  }
}
