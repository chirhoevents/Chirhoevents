import { Resend as ResendClient } from 'resend'
import type { CreateEmailOptions, CreateEmailRequestOptions, CreateEmailResponse } from 'resend'
import { recordOutboundEmail } from '@/lib/outbound-email-log'

/**
 * Drop-in replacement for the Resend SDK client that keeps a copy of every
 * email it sends in OutboundEmail, so master admins can look up and resend
 * anything ChiRho sent. Import this instead of `resend` directly.
 *
 * `emails.send()` delegates to `emails.create()` in the SDK, so wrapping
 * `create` covers both.
 */
export class Resend extends ResendClient {
  constructor(key?: string) {
    super(key)
    const emails = this.emails
    const create = emails.create.bind(emails)
    emails.create = async (
      payload: CreateEmailOptions,
      options?: CreateEmailRequestOptions
    ): Promise<CreateEmailResponse> => {
      let response: CreateEmailResponse
      try {
        response = await create(payload, options)
      } catch (thrown) {
        await recordOutboundEmail(payload, { thrown })
        throw thrown
      }
      await recordOutboundEmail(payload, { response })
      return response
    }
  }
}
