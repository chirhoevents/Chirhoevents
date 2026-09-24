/**
 * From address for Poros liability-form emails (parent requests, reminders,
 * completion confirmations, access codes).
 *
 * Kept separate from RESEND_FROM_EMAIL so liability mail is visibly distinct
 * from general event mail. Any address on the verified chirhoevents.com
 * Resend domain can send; Reply-To still routes replies to the organizer.
 */
export const POROS_FROM = `ChiRho Poros <${
  process.env.RESEND_POROS_FROM_EMAIL || 'poros@chirhoevents.com'
}>`
