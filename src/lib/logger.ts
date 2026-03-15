/**
 * Structured logger for ChiRho Events.
 * Fix #15: Replace ad-hoc console.log with structured logging.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ organizationId, eventId, userId }, 'Registration created')
 *   logger.error({ organizationId, error }, 'Stripe checkout failed')
 *
 * PII policy:
 *   - info/warn/error: use IDs only (organizationId, userId, registrationId)
 *   - debug: may include names/emails (never logged in production)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = {
  organizationId?: string
  eventId?: string
  userId?: string
  registrationId?: string
  [key: string]: unknown
}

const IS_DEBUG = process.env.LOG_LEVEL === 'debug'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function log(level: LogLevel, context: LogContext, message: string): void {
  // Skip debug logs in production unless explicitly enabled
  if (level === 'debug' && IS_PRODUCTION && !IS_DEBUG) return

  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...context,
  }

  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  debug: (context: LogContext, message: string) => log('debug', context, message),
  info: (context: LogContext, message: string) => log('info', context, message),
  warn: (context: LogContext, message: string) => log('warn', context, message),
  error: (context: LogContext, message: string) => log('error', context, message),
}
