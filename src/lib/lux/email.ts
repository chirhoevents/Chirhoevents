/**
 * Lux emails: confirmations, receipts, reminders and family links for
 * parishes using Lux. They're sent as Lux (lux@chirhoevents.com by default)
 * with the parish's name in the From line, and replies go to the parish.
 * Account, billing and support emails keep coming from ChiRho Events.
 */

import { Resend } from '@/lib/resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { escapeHtml, formatEventDate, formatMoney, formatTimeRange } from '@/lib/lux/format'
import { absoluteAssetUrl, getLuxBrand } from '@/lib/lux/brand'

const resend = new Resend(process.env.RESEND_API_KEY!)

export const LUX_FROM_EMAIL = process.env.RESEND_LUX_FROM_EMAIL || 'lux@chirhoevents.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

export function appUrl(path = ''): string {
  return `${APP_URL}${path}`
}

/** "St. Mary's Parish via Lux <lux@chirhoevents.com>" */
export function luxFrom(organizationName: string): string {
  const name = organizationName.replace(/["<>\r\n]/g, '').trim().slice(0, 60)
  return name ? `"${name} via Lux" <${LUX_FROM_EMAIL}>` : `Lux <${LUX_FROM_EMAIL}>`
}

export interface SendLuxEmailOptions {
  organizationId: string
  organizationName: string
  to: string
  subject: string
  html: string
  replyTo?: string | null
  emailType: string
  recipientName?: string
  eventId?: string
  registrationId?: string
  registrationType?: 'individual' | 'lux_order'
  metadata?: Record<string, unknown>
  // Family-link emails contain a sign-in link; don't keep a readable copy of
  // it in the organization's email history
  redactFromLog?: boolean
}

export async function sendLuxEmail(options: SendLuxEmailOptions): Promise<boolean> {
  const logoUrl = absoluteAssetUrl((await getLuxBrand()).logo)
  options = { ...options, html: options.html.split('__LUX_LOGO_URL__').join(escapeHtml(logoUrl)) }
  const log = {
    organizationId: options.organizationId,
    eventId: options.eventId,
    registrationId: options.registrationId,
    registrationType: options.registrationType,
    recipientEmail: options.to,
    recipientName: options.recipientName,
    emailType: options.emailType,
    subject: options.subject,
    htmlContent: options.redactFromLog ? '<p>(Contains a private sign-in link; not stored.)</p>' : options.html,
  }
  try {
    const response = await resend.emails.send({
      from: luxFrom(options.organizationName),
      to: options.to,
      reply_to: options.replyTo || undefined,
      subject: options.subject,
      html: options.html,
    })
    if (response.error) throw new Error(response.error.message)
    await logEmail({ ...log, metadata: options.metadata })
    return true
  } catch (error) {
    console.error(`[Lux email] ${options.emailType} to ${options.to} failed:`, error)
    await logEmailFailure(log, error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

// Replaced with the current Lux logo's absolute URL when the email is sent
const LUX_LOGO_TOKEN = '__LUX_LOGO_URL__'

export type EmailLang = 'en' | 'es'
const L = (lang: EmailLang | undefined, en: string, es: string) => (lang === 'es' ? es : en)
const date = (d: Date, lang?: EmailLang) => formatEventDate(d, {}, lang === 'es' ? 'es' : 'en')

export function luxEmailLayout(content: string, options: { organizationName: string; preheader?: string; lang?: EmailLang }): string {
  const org = escapeHtml(options.organizationName)
  const es = options.lang === 'es'
  return `<!DOCTYPE html>
<html lang="${es ? 'es' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${org}</title>
  <style>
    body { margin: 0; padding: 0; background: #F5F1E8; }
    body, td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; }
    h1 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 600; color: #1E3A5F; margin: 0 0 16px 0; }
    h2 { font-size: 18px; font-weight: 600; color: #1E3A5F; margin: 24px 0 8px 0; }
    p { margin: 0 0 14px 0; }
    a { color: #8A6D2F; }
    @media screen and (max-width: 600px) { .container { width: 100% !important; } .content { padding: 24px 18px !important; } }
  </style>
</head>
<body>
  ${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;">
    <tr><td align="center" style="padding:24px 8px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E8E2D4;">
        <tr><td style="padding:24px 32px;border-bottom:3px solid #C8A24A;background:#FFFDF8;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <img src="${LUX_LOGO_TOKEN}" alt="Lux" height="40" style="height:40px;width:auto;display:block;border:0;" />
            </td>
            <td align="right" style="font-size:14px;color:#6B5B3E;font-weight:600;">${org}</td>
          </tr></table>
        </td></tr>
        <tr><td class="content" style="padding:32px;">${content}</td></tr>
        <tr><td style="padding:20px 32px;background:#FAF8F3;border-top:1px solid #E8E2D4;font-size:13px;color:#6B6B6B;text-align:center;">
          <p style="margin:0 0 6px 0;">${es ? `Enviado por Lux en nombre de <strong>${org}</strong>. ¿Preguntas? Solo responda a este correo.` : `Sent by Lux on behalf of <strong>${org}</strong>. Questions? Just reply to this email.`}</p>
          <p style="margin:0;font-size:12px;color:#9A9A9A;">${es ? 'Lux es parte de ChiRho Events.' : 'Lux is part of ChiRho Events.'}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;">${escapeHtml(label)}</a></p>`
}

function infoBox(html: string, tone: 'info' | 'warn' | 'success' = 'info'): string {
  const colors = { info: ['#F5F1E8', '#C8A24A'], warn: ['#FFF7E6', '#E0A030'], success: ['#EEF7EE', '#4A9A5B'] }[tone]
  return `<div style="background:${colors[0]};border-left:4px solid ${colors[1]};padding:14px 16px;border-radius:6px;margin:18px 0;">${html}</div>`
}

function table(rows: Array<[string, string]>, totalRow?: [string, string]): string {
  const body = rows
    .map(([a, b]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EEE;">${a}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #EEE;white-space:nowrap;">${b}</td></tr>`)
    .join('')
  const total = totalRow
    ? `<tr><td style="padding:10px 0;font-weight:700;">${totalRow[0]}</td><td align="right" style="padding:10px 0;font-weight:700;">${totalRow[1]}</td></tr>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 4px 0;">${body}${total}</table>`
}

function paragraphs(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// ---------------------------------------------------------------------------
// Simple events
// ---------------------------------------------------------------------------

export function simpleEventConfirmationEmail(data: {
  organizationName: string
  firstName: string
  confirmationCode: string
  event: {
    name: string
    startDate: Date
    endDate: Date
    startTime: string | null
    endTime: string | null
    locationName: string | null
    locationAddress: string | null
    slug: string
  }
  lines: Array<{ name: string; quantity: number; unitPrice: number; amount: number }>
  total: number
  payment: 'paid' | 'free' | 'office'
  receiptUrl?: string | null
  officeInstructions?: string
  confirmationMessage?: string
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const e = data.event
  const sameDay = e.startDate.toISOString().slice(0, 10) === e.endDate.toISOString().slice(0, 10)
  const when = sameDay
    ? `${date(e.startDate, lang)}${formatTimeRange(e.startTime, e.endTime) ? `, ${formatTimeRange(e.startTime, e.endTime)}` : ''}`
    : `${date(e.startDate, lang)} – ${date(e.endDate, lang)}`
  const where = [e.locationName, e.locationAddress].filter(Boolean).map(escapeHtml).join('<br>')

  const ticketRows = data.lines.map(l => [
    `${escapeHtml(l.name)} × ${l.quantity}`,
    l.unitPrice > 0 ? formatMoney(l.amount) : L(lang, 'Free', 'Gratis'),
  ] as [string, string])

  const receipt = data.receiptUrl ? ` <a href="${escapeHtml(data.receiptUrl)}">${L(lang, 'View your card receipt', 'Ver el recibo de su tarjeta')}</a>.` : ''
  const paymentBlock =
    data.payment === 'paid'
      ? infoBox(`<strong>${L(lang, 'Paid in full.', 'Pagado por completo.')}</strong> ${L(lang, 'Thank you!', '¡Gracias!')}${receipt}`, 'success')
      : data.payment === 'office'
        ? infoBox(`<strong>${L(lang, 'Amount due', 'Saldo a pagar')}: ${formatMoney(data.total)}.</strong> ${L(lang, 'Please pay at the parish office.', 'Pague en la oficina parroquial, por favor.')}${data.officeInstructions ? `<br>${escapeHtml(data.officeInstructions)}` : ''}`, 'warn')
        : ''

  const html = luxEmailLayout(
    `<h1>${L(lang, 'You\'re registered!', '¡Ya está inscrito!')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.firstName)},</p>
    <p>${L(lang, `Thank you for registering for <strong>${escapeHtml(e.name)}</strong>. Here are your details.`, `Gracias por inscribirse en <strong>${escapeHtml(e.name)}</strong>. Estos son sus datos.`)}</p>
    ${table([
      [`<strong>${L(lang, 'When', 'Cuándo')}</strong>`, escapeHtml(when)],
      ...(where ? [[`<strong>${L(lang, 'Where', 'Dónde')}</strong>`, where] as [string, string]] : []),
      [`<strong>${L(lang, 'Confirmation #', 'Confirmación n.º')}</strong>`, escapeHtml(data.confirmationCode)],
    ])}
    <h2>${L(lang, 'Tickets', 'Boletos')}</h2>
    ${table(ticketRows, data.total > 0 ? [L(lang, 'Total', 'Total'), formatMoney(data.total)] : undefined)}
    ${paymentBlock}
    ${data.confirmationMessage ? paragraphs(data.confirmationMessage) : ''}
    ${button(appUrl(`/events/${e.slug}`), L(lang, 'View event details', 'Ver los detalles del evento'))}
    <p>${L(lang, 'We look forward to seeing you!', '¡Esperamos verle pronto!')}</p>`,
    { organizationName: data.organizationName, preheader: L(lang, `You're registered for ${e.name}`, `Ya está inscrito en ${e.name}`), lang }
  )
  return { subject: L(lang, `You're registered: ${e.name}`, `Inscripción confirmada: ${e.name}`), html }
}

// ---------------------------------------------------------------------------
// Faith formation
// ---------------------------------------------------------------------------

export function programOrderEmail(data: {
  organizationName: string
  guardianFirstName: string
  confirmationCode: string
  children: Array<{ childName: string; programName: string; amount: number; session?: string | null }>
  breakdown: { subtotal: number; siblingDiscount: number; familyCapAdjustment: number; total: number }
  amountDue: number
  state: 'paid' | 'free' | 'office' | 'assistance_requested' | 'card_pending'
  receiptUrl?: string | null
  officeInstructions?: string
  documentsNeeded: Array<{ childName: string; label: string }>
  familyUrl: string
  payUrl?: string
  confirmationMessages?: string[]
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const rows: Array<[string, string]> = data.children.map(c => [
    `<strong>${escapeHtml(c.childName)}</strong><br><span style="color:#6B6B6B;font-size:14px;">${escapeHtml(c.programName)}${c.session ? ` · ${escapeHtml(c.session)}` : ''}</span>`,
    formatMoney(c.amount),
  ])
  if (data.breakdown.siblingDiscount > 0) rows.push([L(lang, 'Sibling discount (included above)', 'Descuento por hermanos (incluido arriba)'), `−${formatMoney(data.breakdown.siblingDiscount)}`])
  if (data.breakdown.familyCapAdjustment > 0) rows.push([L(lang, 'Family maximum applied', 'Máximo por familia aplicado'), `−${formatMoney(data.breakdown.familyCapAdjustment)}`])

  const receipt = data.receiptUrl ? ` <a href="${escapeHtml(data.receiptUrl)}">${L(lang, 'View your card receipt', 'Ver el recibo de su tarjeta')}</a>.` : ''
  let paymentBlock = ''
  if (data.state === 'paid') {
    paymentBlock = infoBox(`<strong>${L(lang, 'Paid in full.', 'Pagado por completo.')}</strong> ${L(lang, 'Thank you!', '¡Gracias!')}${receipt}`, 'success')
  } else if (data.state === 'office') {
    paymentBlock = infoBox(
      `<strong>${L(lang, 'Amount due', 'Saldo a pagar')}: ${formatMoney(data.amountDue)}.</strong> ${L(lang, 'Please pay at the parish office.', 'Pague en la oficina parroquial, por favor.')}` +
      (data.officeInstructions ? `<br>${escapeHtml(data.officeInstructions)}` : '') +
      (data.payUrl ? `<br>${L(lang, 'Prefer to pay by card?', '¿Prefiere pagar con tarjeta?')} <a href="${escapeHtml(data.payUrl)}">${L(lang, 'Pay online', 'Pagar en línea')}</a>.` : ''),
      'warn'
    )
  } else if (data.state === 'assistance_requested') {
    paymentBlock = infoBox(
      L(lang,
        '<strong>Fee assistance requested.</strong> You\'re registered. The parish will review your request privately and let you know what, if anything, is owed. Nothing is due right now.',
        '<strong>Solicitud de ayuda recibida.</strong> Ya están inscritos. La parroquia revisará su solicitud en privado y le avisará cuánto, si algo, debe pagar. No tiene que pagar nada por ahora.'),
      'info'
    )
  } else if (data.state === 'card_pending' && data.payUrl) {
    paymentBlock = infoBox(`<strong>${L(lang, 'Amount due', 'Saldo a pagar')}: ${formatMoney(data.amountDue)}.</strong> <a href="${escapeHtml(data.payUrl)}">${L(lang, 'Finish paying online', 'Terminar el pago en línea')}</a>.`, 'warn')
  }

  const docs = data.documentsNeeded.length
    ? `<h2>${L(lang, 'Documents still needed', 'Documentos que faltan')}</h2>
       <ul style="padding-left:20px;margin:8px 0 16px 0;">${data.documentsNeeded.map(d => `<li>${escapeHtml(d.label)} ${L(lang, 'for', 'de')} ${escapeHtml(d.childName)}</li>`).join('')}</ul>
       <p>${L(lang, 'You can upload them any time from your family page.', 'Puede subirlos cuando quiera desde la página de su familia.')}</p>`
    : ''

  const html = luxEmailLayout(
    `<h1>${L(lang, 'Registration received', 'Inscripción recibida')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.guardianFirstName)},</p>
    <p>${L(lang, `Thank you for registering with ${escapeHtml(data.organizationName)}. Here's what we received.`, `Gracias por inscribirse con ${escapeHtml(data.organizationName)}. Esto es lo que recibimos.`)}</p>
    ${table(rows, [L(lang, 'Total', 'Total'), formatMoney(data.breakdown.total)])}
    <p style="color:#6B6B6B;font-size:14px;">${L(lang, 'Confirmation #', 'Confirmación n.º')}${escapeHtml(data.confirmationCode)}</p>
    ${paymentBlock}
    ${docs}
    ${(data.confirmationMessages || []).filter(Boolean).map(paragraphs).join('')}
    ${button(data.familyUrl, L(lang, 'Open your family page', 'Abrir la página de su familia'))}
    <p style="color:#6B6B6B;font-size:14px;">${L(lang,
      'This link signs you in to your family page without a password. It works once and expires in 7 days; you can always request a new one from the parish registration page.',
      'Este enlace le permite entrar a la página de su familia sin contraseña. Funciona una sola vez y vence en 7 días; siempre puede pedir uno nuevo en la página de inscripción de la parroquia.')}</p>`,
    { organizationName: data.organizationName, preheader: L(lang, 'Your registration', 'Su inscripción'), lang }
  )
  return { subject: L(lang, `Registration received – ${data.organizationName}`, `Inscripción recibida – ${data.organizationName}`), html }
}

function linkLifetime(minutes: number, lang?: EmailLang): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return lang === 'es' ? `${days} día${days === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`
  }
  return lang === 'es' ? `${minutes} minutos` : `${minutes} minutes`
}

export function familyLinkEmail(data: {
  organizationName: string
  guardianFirstName: string
  link: string
  expiresMinutes: number
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const html = luxEmailLayout(
    `<h1>${L(lang, 'Your family page', 'La página de su familia')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.guardianFirstName)},</p>
    <p>${L(lang,
      `Use the button below to open your family page for ${escapeHtml(data.organizationName)}. From there you can update your information, register for this year, and upload any documents that are still needed.`,
      `Use el botón de abajo para abrir la página de su familia en ${escapeHtml(data.organizationName)}. Ahí puede actualizar su información, inscribirse para este año y subir los documentos que falten.`)}</p>
    ${button(data.link, L(lang, 'Open my family page', 'Abrir la página de mi familia'))}
    <p style="color:#6B6B6B;font-size:14px;">${L(lang,
      `This link works once and expires in ${linkLifetime(data.expiresMinutes, lang)}. If you didn't ask for it, you can ignore this email.`,
      `Este enlace funciona una sola vez y vence en ${linkLifetime(data.expiresMinutes, lang)}. Si usted no lo pidió, puede ignorar este correo.`)}</p>`,
    { organizationName: data.organizationName, preheader: L(lang, 'Your sign-in link', 'Su enlace para entrar'), lang }
  )
  return { subject: L(lang, `Your family page link – ${data.organizationName}`, `Enlace a la página de su familia – ${data.organizationName}`), html }
}

export function documentReminderEmail(data: {
  organizationName: string
  guardianFirstName: string
  items: Array<{ childName: string; programName: string; label: string; note?: string | null; needsResubmission?: boolean }>
  link: string
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const html = luxEmailLayout(
    `<h1>${L(lang, 'Documents still needed', 'Documentos que faltan')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.guardianFirstName)},</p>
    <p>${L(lang, `${escapeHtml(data.organizationName)} is still waiting on the following:`, `${escapeHtml(data.organizationName)} todavía espera lo siguiente:`)}</p>
    <ul style="padding-left:20px;margin:8px 0 16px 0;">${data.items.map(i =>
      `<li><strong>${escapeHtml(i.label)}</strong> ${L(lang, 'for', 'de')} ${escapeHtml(i.childName)} (${escapeHtml(i.programName)})${i.needsResubmission ? L(lang, ' – please upload a new copy', ' – suba una copia nueva, por favor') : ''}${i.note ? `<br><span style="color:#6B6B6B;font-size:14px;">${escapeHtml(i.note)}</span>` : ''}</li>`
    ).join('')}</ul>
    ${button(data.link, L(lang, 'Upload documents', 'Subir documentos'))}
    <p style="color:#6B6B6B;font-size:14px;">${L(lang,
      'This link signs you in to your family page without a password. It works once and expires in 7 days.',
      'Este enlace le permite entrar a la página de su familia sin contraseña. Funciona una sola vez y vence en 7 días.')}</p>`,
    { organizationName: data.organizationName, preheader: L(lang, 'A few documents are still needed', 'Todavía faltan algunos documentos'), lang }
  )
  return { subject: L(lang, `Documents needed – ${data.organizationName}`, `Documentos pendientes – ${data.organizationName}`), html }
}

export function paymentRecordedEmail(data: {
  organizationName: string
  firstName: string
  amount: number
  method: string
  description: string
  remaining: number
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const methods: Record<string, string> = { cash: 'efectivo', check: 'cheque', 'card at the office': 'tarjeta en la oficina', other: 'otro' }
  const method = lang === 'es' ? methods[data.method] ?? data.method : data.method
  const html = luxEmailLayout(
    `<h1>${L(lang, 'Payment received', 'Pago recibido')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.firstName)},</p>
    <p>${L(lang,
      `${escapeHtml(data.organizationName)} recorded your payment of <strong>${formatMoney(data.amount)}</strong> (${escapeHtml(method)}) for ${escapeHtml(data.description)}.`,
      `${escapeHtml(data.organizationName)} registró su pago de <strong>${formatMoney(data.amount)}</strong> (${escapeHtml(method)}) por ${escapeHtml(data.description)}.`)}</p>
    ${data.remaining > 0
      ? infoBox(`${L(lang, 'Remaining balance', 'Saldo pendiente')}: <strong>${formatMoney(data.remaining)}</strong>.`, 'warn')
      : infoBox(`<strong>${L(lang, 'You are paid in full.', 'Su pago está completo.')}</strong> ${L(lang, 'Thank you!', '¡Gracias!')}`, 'success')}`,
    { organizationName: data.organizationName, preheader: L(lang, `Payment of ${formatMoney(data.amount)} received`, `Pago de ${formatMoney(data.amount)} recibido`), lang }
  )
  return { subject: L(lang, `Payment received – ${data.organizationName}`, `Pago recibido – ${data.organizationName}`), html }
}

export function refundEmail(data: {
  organizationName: string
  firstName: string
  amount: number
  toCard: boolean
  description: string
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const how = data.toCard
    ? L(lang, 'It goes back to the card you paid with and usually shows up in 5–10 business days.', 'Se devuelve a la tarjeta con la que pagó y suele aparecer en 5 a 10 días hábiles.')
    : L(lang, 'The parish office will give it to you directly.', 'La oficina parroquial se lo entregará directamente.')
  const html = luxEmailLayout(
    `<h1>${L(lang, 'Refund', 'Reembolso')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.firstName)},</p>
    <p>${L(lang,
      `${escapeHtml(data.organizationName)} refunded <strong>${formatMoney(data.amount)}</strong> for ${escapeHtml(data.description)}.`,
      `${escapeHtml(data.organizationName)} le reembolsó <strong>${formatMoney(data.amount)}</strong> por ${escapeHtml(data.description)}.`)}</p>
    <p>${how}</p>`,
    { organizationName: data.organizationName, preheader: L(lang, `Refund of ${formatMoney(data.amount)}`, `Reembolso de ${formatMoney(data.amount)}`), lang }
  )
  return { subject: L(lang, `Refund – ${data.organizationName}`, `Reembolso – ${data.organizationName}`), html }
}

export function feeAssistanceDecisionEmail(data: {
  organizationName: string
  guardianFirstName: string
  decision: 'approved' | 'waived' | 'denied'
  amountDue: number
  payUrl: string
  officeInstructions?: string
  staffNote?: string | null
  lang?: EmailLang
}): { subject: string; html: string } {
  const { lang } = data
  const message =
    data.decision === 'waived'
      ? infoBox(L(lang, '<strong>Your fees have been waived.</strong> Nothing is owed. God bless your family!', '<strong>Se le condonó el costo.</strong> No debe nada. ¡Que Dios bendiga a su familia!'), 'success')
      : data.decision === 'approved'
        ? infoBox(L(lang, `<strong>Your fee assistance request was approved.</strong> The amount due is now ${formatMoney(data.amountDue)}.`, `<strong>Se aprobó su solicitud de ayuda.</strong> Ahora el saldo a pagar es ${formatMoney(data.amountDue)}.`), 'success')
        : infoBox(L(lang, `The parish reviewed your request. The amount due remains ${formatMoney(data.amountDue)}. Please reach out if you'd like to talk about it.`, `La parroquia revisó su solicitud. El saldo a pagar sigue siendo ${formatMoney(data.amountDue)}. Comuníquese con nosotros si desea hablarlo.`), 'info')
  const html = luxEmailLayout(
    `<h1>${L(lang, 'About your registration fees', 'Sobre el costo de su inscripción')}</h1>
    <p>${L(lang, 'Hi', 'Hola')} ${escapeHtml(data.guardianFirstName)},</p>
    ${message}
    ${data.staffNote ? paragraphs(data.staffNote) : ''}
    ${data.amountDue > 0
      ? `${button(data.payUrl, L(lang, `Pay ${formatMoney(data.amountDue)} online`, `Pagar ${formatMoney(data.amountDue)} en línea`))}${data.officeInstructions
          ? `<p style="color:#6B6B6B;font-size:14px;">${L(lang, 'Or pay at the parish office.', 'O pague en la oficina parroquial.')} ${escapeHtml(data.officeInstructions)}</p>`
          : `<p style="color:#6B6B6B;font-size:14px;">${L(lang, 'You can also pay at the parish office.', 'También puede pagar en la oficina parroquial.')}</p>`}`
      : ''}`,
    { organizationName: data.organizationName, preheader: L(lang, 'An update on your registration fees', 'Novedades sobre el costo de su inscripción'), lang }
  )
  return { subject: L(lang, `Your registration fees – ${data.organizationName}`, `El costo de su inscripción – ${data.organizationName}`), html }
}
