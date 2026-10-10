import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { resolveModuleAccess } from '@/lib/subscription-tiers'
import {
  getSimpleEventStatus, parseSimpleEventConfig, simpleEventCloseAt,
} from '@/lib/lux/simple-event'
import { formatEventDate, formatTimeRange, formatDateTime } from '@/lib/lux/format'
import SimpleEventRegistrationForm from '@/components/lux/public/SimpleEventRegistrationForm'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import { getLuxLang } from '@/lib/lux/i18n-server'
import { dict } from '@/lib/lux/i18n'
import { parseLuxSettings } from '@/lib/lux/settings'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Public page for a Lux simple event: details on the left, sign-up on the right */
export default async function SimpleEventPublicPage({ eventId, searchParams }: {
  eventId: string
  searchParams: { cancelled?: string; r?: string }
}) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      organization: {
        select: {
          name: true, logoUrl: true, publicSlug: true, stripeAccountId: true, stripeChargesEnabled: true,
          modulesEnabled: true, subscriptionTier: true, contactEmail: true, contactPhone: true, luxSettings: true,
        },
      },
      settings: { select: { contactName: true, contactEmail: true, contactPhone: true } },
      ticketOptions: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
      customRegistrationQuestions: { orderBy: { displayOrder: 'asc' } },
    },
  })

  const lang = await getLuxLang()
  const t = dict(lang)
  const accentColor = parseLuxSettings(event.organization.luxSettings).page.accentColor
  const config = parseSimpleEventConfig(event.luxConfig)
  const status = getSimpleEventStatus(event)
  const hasRapha = resolveModuleAccess(event.organization.modulesEnabled, event.organization.subscriptionTier).rapha
  const address = (event.locationAddress as { address?: string } | null)?.address
  const sameDay = event.startDate.toISOString().slice(0, 10) === event.endDate.toISOString().slice(0, 10)
  const timeRange = formatTimeRange(event.startTime, event.endTime)
  const cancelled = searchParams.cancelled === '1'
  const previousRegistrationId = cancelled && searchParams.r && UUID_RE.test(searchParams.r) ? searchParams.r : null
  const contactEmail = event.settings?.contactEmail || event.organization.contactEmail
  const contactPhone = event.settings?.contactPhone || event.organization.contactPhone

  const closedMessages: Record<string, string> = {
    not_yet_open: event.registrationOpenDate ? t.event.opens(formatDateTime(event.registrationOpenDate, event.timezone, lang)) : t.event.opensSoon,
    full: t.event.full,
    closed: t.event.closed,
    ended: t.event.ended,
  }

  return (
    <LuxPublicShell organizationName={event.organization.name} logoUrl={event.organization.logoUrl} parishSlug={event.organization.publicSlug} accentColor={accentColor}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <h1 className="text-3xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>{event.name}</h1>
          <div className="space-y-3 text-gray-700">
            <p className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[#C8A24A] mt-0.5 shrink-0" />
              <span>{sameDay ? formatEventDate(event.startDate, {}, lang) : `${formatEventDate(event.startDate, {}, lang)} – ${formatEventDate(event.endDate, {}, lang)}`}</span>
            </p>
            {timeRange && (
              <p className="flex items-start gap-3"><Clock className="h-5 w-5 text-[#C8A24A] mt-0.5 shrink-0" /><span>{timeRange}</span></p>
            )}
            {(event.locationName || address) && (
              <p className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#C8A24A] mt-0.5 shrink-0" />
                <span>{event.locationName}{event.locationName && address && <br />}{address && (
                  <a className="underline text-gray-600" target="_blank" rel="noreferrer"
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}>{address}</a>
                )}</span>
              </p>
            )}
            {event.capacityRemaining !== null && status === 'open' && event.capacityRemaining <= 20 && (
              <p className="flex items-start gap-3"><Users className="h-5 w-5 text-[#C8A24A] mt-0.5 shrink-0" />
                <span className="font-medium text-amber-700">{t.event.spotsLeft(event.capacityRemaining)}</span></p>
            )}
          </div>
          {config.language && t.event.taughtIn[config.language] && (
            <p className="inline-flex rounded-full bg-[#F5F1E8] px-3 py-1 text-sm text-[#6B5B3E]">{t.event.taughtIn[config.language]}</p>
          )}
          {event.description && <div className="text-gray-700 whitespace-pre-line leading-relaxed">{event.description}</div>}
          {status === 'open' && (
            <p className="text-sm text-gray-500">{t.event.closes(formatDateTime(simpleEventCloseAt(event), event.timezone, lang))}</p>
          )}
          {(contactEmail || contactPhone) && (
            <div className="rounded-lg bg-white border border-[#E8E2D4] p-4 text-sm">
              <p className="font-medium text-[#1E3A5F] mb-1">{t.common.questions}</p>
              {event.settings?.contactName && <p>{event.settings.contactName}</p>}
              {contactEmail && <p><a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>}
              {contactPhone && <p>{contactPhone}</p>}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-6">
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">{t.event.register}</h2>
            {cancelled && status === 'open' && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t.event.cancelled}
              </div>
            )}
            {status === 'open' ? (
              <SimpleEventRegistrationForm
                slug={event.slug}
                tickets={event.ticketOptions.map(t => ({
                  id: t.id, name: t.name, description: t.description, price: Number(t.price), remaining: t.remaining,
                }))}
                questions={event.customRegistrationQuestions.map(q => ({
                  id: q.id, questionText: q.questionText, questionType: q.questionType,
                  options: Array.isArray(q.options) ? (q.options as string[]) : [], required: q.required,
                }))}
                maxPerRegistration={config.maxPerRegistration}
                spotsLeft={event.capacityRemaining}
                phoneField={config.phoneField}
                addressField={config.addressField}
                waiver={config.waiver}
                medical={config.medical.enabled && hasRapha}
                onlinePayment={config.onlinePayment}
                officePayment={config.officePayment}
                paymentsReady={!!event.organization.stripeAccountId && event.organization.stripeChargesEnabled}
                previousRegistrationId={previousRegistrationId}
                lang={lang}
              />
            ) : (
              <p className="text-gray-700">{closedMessages[status] || t.event.notOpen}</p>
            )}
          </div>
        </div>
      </div>
    </LuxPublicShell>
  )
}
