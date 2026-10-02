import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const baseClient = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient

/**
 * The plain client, without the cancelled-registration filter below. Use it
 * only where cancelled registrations must be seen: the admin "Cancelled"
 * tab, a single registration's detail view, cancel / hard-delete.
 */
export const prismaIncludingCancelled = baseClient

// True if `cancelledAt` appears anywhere in the where tree — the caller is
// filtering on cancellation itself, so leave the query alone.
function mentionsCancelledAt(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(mentionsCancelledAt)
  for (const [key, child] of Object.entries(value)) {
    if (key === 'cancelledAt') return true
    if (mentionsCancelledAt(child)) return true
  }
  return false
}

function withFilter<A extends { where?: unknown }>(args: A, filter: object): A {
  if (mentionsCancelledAt(args.where)) return args
  return { ...args, where: args.where ? { AND: [args.where, filter] } : filter }
}

const ACTIVE_REGISTRATION = { cancelledAt: null }
const ACTIVE_PARTICIPANT = { groupRegistration: { cancelledAt: null } }
const ACTIVE_LIABILITY_FORM = {
  AND: [
    { OR: [{ groupRegistrationId: null }, { groupRegistration: { cancelledAt: null } }] },
    { OR: [{ individualRegistrationId: null }, { individualRegistration: { cancelledAt: null } }] },
  ],
}

/**
 * Cancelled registrations (cancelledAt set) are soft-deleted: they keep
 * their payments / forms for the record but must not show up in rosters,
 * counts, housing, check-in, reports or emails. Rather than repeat
 * `cancelledAt: null` in every route, list and count queries on
 * registrations, participants and liability forms skip cancelled rows
 * unless the query mentions `cancelledAt` itself, or goes through
 * prismaIncludingCancelled.
 *
 * findUnique / findFirst are untouched so a cancelled registration can
 * still be opened directly (detail page, payments, group-leader login).
 * Nested includes (`include: { participants: true }`) are not filtered.
 */
export const prisma = baseClient.$extends({
  query: {
    groupRegistration: {
      findMany: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION)),
      count: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION)),
      aggregate: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION)),
      groupBy: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION) as any),
    },
    individualRegistration: {
      findMany: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION)),
      count: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION)),
      aggregate: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION)),
      groupBy: ({ args, query }) => query(withFilter(args, ACTIVE_REGISTRATION) as any),
    },
    participant: {
      findMany: ({ args, query }) => query(withFilter(args, ACTIVE_PARTICIPANT)),
      count: ({ args, query }) => query(withFilter(args, ACTIVE_PARTICIPANT)),
      aggregate: ({ args, query }) => query(withFilter(args, ACTIVE_PARTICIPANT)),
      groupBy: ({ args, query }) => query(withFilter(args, ACTIVE_PARTICIPANT) as any),
    },
    liabilityForm: {
      findMany: ({ args, query }) => query(withFilter(args, ACTIVE_LIABILITY_FORM)),
      count: ({ args, query }) => query(withFilter(args, ACTIVE_LIABILITY_FORM)),
      aggregate: ({ args, query }) => query(withFilter(args, ACTIVE_LIABILITY_FORM)),
      groupBy: ({ args, query }) => query(withFilter(args, ACTIVE_LIABILITY_FORM) as any),
    },
  },
})

/** The `tx` client handed to `prisma.$transaction(async (tx) => ...)`. */
export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
