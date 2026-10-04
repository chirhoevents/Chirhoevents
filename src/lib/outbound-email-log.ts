import type { CreateEmailOptions, CreateEmailResponse } from 'resend'
import { prisma } from '@/lib/prisma'

function toList(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean)
}

/**
 * Save a copy of an outgoing email to OutboundEmail. Never throws — a logging
 * failure must not turn a delivered email into an error for the caller.
 */
export async function recordOutboundEmail(
  payload: CreateEmailOptions,
  outcome: { response?: CreateEmailResponse; thrown?: unknown },
  options: { resentFromId?: string } = {}
): Promise<string | null> {
  try {
    const to = toList(payload.to)
    const cc = toList(payload.cc)
    const bcc = toList(payload.bcc)
    const replyTo = toList(payload.reply_to)
    const error = outcome.response?.error ?? null
    const failed = !!error || outcome.thrown !== undefined

    const row = await prisma.outboundEmail.create({
      data: {
        resendEmailId: outcome.response?.data?.id ?? null,
        fromAddress: payload.from,
        toAddresses: to,
        ccAddresses: cc,
        bccAddresses: bcc,
        recipients: [...to, ...cc, ...bcc].join(', ').toLowerCase(),
        replyTo: replyTo.length > 0 ? replyTo.join(', ') : null,
        subject: payload.subject || '(No subject)',
        htmlBody: typeof payload.html === 'string' ? payload.html : null,
        textBody: typeof payload.text === 'string' ? payload.text : null,
        attachmentNames: (payload.attachments ?? [])
          .map((a) => (typeof a.filename === 'string' ? a.filename : a.path ?? 'attachment'))
          .filter(Boolean),
        status: failed ? 'failed' : 'sent',
        errorMessage: error
          ? error.message
          : outcome.thrown !== undefined
          ? String(outcome.thrown instanceof Error ? outcome.thrown.message : outcome.thrown)
          : null,
        resentFromId: options.resentFromId ?? null,
      },
      select: { id: true },
    })
    return row.id
  } catch (logError) {
    console.error('[OutboundEmail] Failed to record outgoing email:', logError)
    return null
  }
}
