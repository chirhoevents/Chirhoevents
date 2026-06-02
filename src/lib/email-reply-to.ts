/**
 * Resolve the Reply-To address for a customer-facing email.
 *
 * The platform brand is the From address (notifications@chirhoevents.com), but
 * customer replies should reach the event organizer, not ChiRho support. The
 * lookup follows the same priority used elsewhere in the product
 * (e.g. the public "Need Help?" block, commit 531a638):
 *
 *   1. EventSettings.contactEmail set on the Edit Event page (per-event override)
 *   2. Organization.contactEmail (the org's admin contact)
 *   3. support@chirhoevents.com (last-resort fallback so a send never fails)
 */
export function resolveReplyTo(
  eventSettings: { contactEmail?: string | null } | null | undefined,
  organization: { contactEmail?: string | null } | null | undefined,
  fallback = 'support@chirhoevents.com'
): string {
  return (
    eventSettings?.contactEmail?.trim() ||
    organization?.contactEmail?.trim() ||
    fallback
  )
}
