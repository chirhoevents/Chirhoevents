/**
 * Simple in-memory rate limiter for Next.js edge/serverless.
 * Works on a per-process basis (sufficient for most deployments).
 * For multi-instance deployments, replace with @upstash/ratelimit + Redis.
 *
 * Fix #14: Rate limiting implementation
 */

interface RateLimitConfig {
  limit: number      // max requests
  windowMs: number   // window size in ms
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store: key → { count, resetAt }
const store = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to avoid memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60_000)

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Start new window
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.limit - 1, resetAt }
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

// Preconfigured rate limit configs
export const RATE_LIMITS = {
  registration: { limit: 10, windowMs: 60_000 },   // 10 req/min
  payment: { limit: 5, windowMs: 60_000 },          // 5 req/min
  publicLookup: { limit: 30, windowMs: 60_000 },    // 30 req/min
  auth: { limit: 5, windowMs: 60_000 },             // 5 req/min
} satisfies Record<string, RateLimitConfig>
