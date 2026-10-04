import { prisma } from '@/lib/prisma'
import { generateWaitlistInvitationEmail } from '@/lib/email-templates'
import type { HousingType } from '@/lib/option-capacity'

const housingLabel = (h: HousingType | null): string | null =>
  h === 'on_campus'
    ? 'On-Campus'
    : h === 'off_campus'
    ? 'Off-Campus'
    : h === 'day_pass'
    ? 'Day Pass'
    : null

/**
 * Build the "A spot is available" email. Used when an admin first invites a
 * waitlist entry and when they resend that invitation later, so both copies
 * read the same. Feeds BOTH what was reserved (offered) and what the person
 * originally requested — the template shows a comparison when they differ
 * (counter-offer case) so the invitee isn't surprised at the registration form.
 */
export async function buildWaitlistInvitationEmailHtml({
  entry,
  eventName,
  organizationName,
  supportEmail,
  registrationUrl,
  expiresIn,
  offered,
}: {
  entry: {
    name: string
    partySize: number
    registrationType: string | null
    youthCount: number | null
    chaperoneCount: number | null
    priestCount: number | null
    preferredHousingType: string | null
    preferredDayPassOptionId: string | null
  }
  eventName: string
  organizationName: string
  supportEmail: string
  registrationUrl: string
  expiresIn: string
  offered: {
    partySize: number
    youth: number | null
    chaperones: number | null
    priests: number | null
    housingType: HousingType | null
    dayPassOptionId: string | null
  }
}): Promise<string> {
  // Resolve day-pass option names for the email copy (offered + requested).
  const dayPassIdsToLookup = Array.from(
    new Set(
      [offered.dayPassOptionId, entry.preferredDayPassOptionId].filter(
        (v): v is string => !!v
      )
    )
  )
  const dayPassNameById = new Map<string, string>()
  if (dayPassIdsToLookup.length > 0) {
    const dpOptions = await prisma.dayPassOption.findMany({
      where: { id: { in: dayPassIdsToLookup } },
      select: { id: true, name: true },
    })
    for (const dp of dpOptions) dayPassNameById.set(dp.id, dp.name)
  }

  // If admin used the counter-offer path the reserved values differ from
  // preferred — surface that in the email.
  const isCounterOffer =
    offered.partySize !== entry.partySize ||
    offered.youth !== entry.youthCount ||
    offered.chaperones !== entry.chaperoneCount ||
    offered.priests !== entry.priestCount ||
    (offered.housingType ?? null) !==
      ((entry.preferredHousingType as HousingType | null) ?? null) ||
    (offered.dayPassOptionId ?? null) !== (entry.preferredDayPassOptionId ?? null)

  const isGroup = entry.registrationType === 'group'

  return generateWaitlistInvitationEmail({
    name: entry.name,
    eventName,
    partySize: entry.partySize,
    organizationName,
    supportEmail,
    registrationUrl,
    expiresIn,
    offeredPartySize: offered.partySize,
    offeredYouth: isGroup ? offered.youth : null,
    offeredChaperones: isGroup ? offered.chaperones : null,
    offeredPriests: isGroup ? offered.priests : null,
    offeredHousingLabel: housingLabel(offered.housingType),
    offeredDayPassName: offered.dayPassOptionId
      ? dayPassNameById.get(offered.dayPassOptionId) ?? null
      : null,
    requestedPartySize: entry.partySize,
    requestedHousingLabel: housingLabel(
      (entry.preferredHousingType as HousingType | null) ?? null
    ),
    requestedDayPassName: entry.preferredDayPassOptionId
      ? dayPassNameById.get(entry.preferredDayPassOptionId) ?? null
      : null,
    isCounterOffer,
  })
}
