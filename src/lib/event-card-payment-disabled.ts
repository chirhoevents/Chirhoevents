// Per-event switch (EventSettings.cardPaymentDisabled) that turns off card
// payments entirely for a single event — e.g. "financial restrictions this
// year, checks only." Only affects events that turn it on.
//
// Kept generic (no mailing address baked in) since it's shared across every
// event that enables this flag — the actual payee/mailing address always
// comes from that event's own Check Payment Settings
// (EventSettings.checkPaymentPayableTo / checkPaymentAddress), which is
// already rendered alongside this message everywhere it appears.
export const CARD_PAYMENT_DISABLED_TITLE = 'How do I Pay?'

export const CARD_PAYMENT_DISABLED_MESSAGE =
  'Due to internal financial restructuring, we are temporarily only able to accept payments by check. We sincerely apologize for any inconvenience this may cause.'

export const CARD_PAYMENT_DISABLED_ERROR =
  'This event is not accepting card payments this year. Please process this as a check payment instead.'
