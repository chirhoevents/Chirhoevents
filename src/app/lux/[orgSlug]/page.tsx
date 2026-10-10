import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, CalendarHeart, ArrowRight, UserRound, Megaphone, Clock, Languages, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { loadOpenPrograms } from '@/lib/lux/family-registration'
import { fullSessionFor, getFamilySessionFromCookies } from '@/lib/lux/family-session'
import { getSimpleEventStatus, parseSimpleEventConfig } from '@/lib/lux/simple-event'
import { parseLuxSettings, accentHover } from '@/lib/lux/settings'
import { formatEventDate, formatMoney, formatTimeRange, gradeLabel } from '@/lib/lux/format'
import { dict, type LuxLang } from '@/lib/lux/i18n'
import { getLuxLang } from '@/lib/lux/i18n-server'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import FamilyLinkRequest from '@/components/lux/public/FamilyLinkRequest'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ program?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await findLuxOrgBySlug(orgSlug)
  return { title: org ? `${org.name} – Registration` : 'Not found' }
}

function gradeRange(grades: string[] | null, lang: LuxLang): string {
  if (!grades || grades.length === 0) return dict(lang).parish.allAges
  if (grades.length === 1) return gradeLabel(grades[0], lang)
  return `${gradeLabel(grades[0], lang)} – ${gradeLabel(grades[grades.length - 1], lang)}`
}

/** A parish's public Lux page: its open programs and upcoming events */
export default async function ParishLuxPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { program: highlight } = await searchParams
  const org = await findLuxOrgBySlug(orgSlug)
  if (!org) notFound()

  const [programs, events, session, lang] = await Promise.all([
    loadOpenPrograms(org.id),
    prisma.event.findMany({
      where: { organizationId: org.id, mode: 'simple', isPublished: true, archivedAt: null, endDate: { gte: new Date(Date.now() - 86400000) } },
      orderBy: { startDate: 'asc' },
      select: {
        id: true, name: true, slug: true, description: true, startDate: true, endDate: true, startTime: true, endTime: true,
        timezone: true, locationName: true, status: true, isPublished: true, registrationOpenDate: true, registrationCloseDate: true,
        capacityRemaining: true, luxConfig: true,
      },
    }),
    getFamilySessionFromCookies(),
    getLuxLang(),
  ])
  const t = dict(lang)
  const page = parseLuxSettings(org.luxSettings).page
  const accent = page.accentColor ?? '#C8A24A'
  const accentDark = accentHover(page.accentColor) ?? '#B8923A'
  const headline = (lang === 'es' && page.headlineEs) || page.headline || t.parish.welcome(org.name)
  const message = (lang === 'es' && page.messageEs) || page.message || t.parish.intro
  const announcement = (lang === 'es' && page.announcementEs) || page.announcement

  const signedIn = fullSessionFor(session, org.id)
  const household = signedIn
    ? await prisma.luxHousehold.findUnique({ where: { id: signedIn.householdId }, select: { guardian1FirstName: true } })
    : null
  const upcoming = events.map(e => ({ ...e, liveStatus: getSimpleEventStatus(e) })).filter(e => e.liveStatus !== 'ended' && e.liveStatus !== 'draft')
  const ordered = highlight ? [...programs].sort((a, b) => (a.slug === highlight ? -1 : b.slug === highlight ? 1 : 0)) : programs

  return (
    <LuxPublicShell organizationName={org.name} logoUrl={org.logoUrl} parishSlug={null} accentColor={page.accentColor}>
      <div className="space-y-10">
        {page.headerImageUrl ? (
          <div className="relative -mt-8 sm:-mt-10 -mx-4 sm:-mx-6 overflow-hidden sm:rounded-b-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded by the parish */}
            <img src={page.headerImageUrl} alt="" className="w-full h-56 sm:h-80 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 text-white max-w-3xl">
              <h1 className="text-3xl sm:text-5xl font-semibold drop-shadow" style={{ fontFamily: 'Georgia, serif' }}>{headline}</h1>
              <p className="mt-3 text-base sm:text-lg text-white/90 whitespace-pre-line drop-shadow">{message}</p>
            </div>
          </div>
        ) : (
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>{headline}</h1>
            <p className="text-gray-600 mt-3 whitespace-pre-line">{message}</p>
          </div>
        )}

        {announcement && (
          <div className="max-w-3xl mx-auto rounded-2xl border p-4 sm:p-5 flex gap-3 bg-white" style={{ borderColor: accent }}>
            <Megaphone className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
            <p className="text-gray-800 whitespace-pre-line">{announcement}</p>
          </div>
        )}

        {household ? (
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E8E2D4] p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-[#1E3A5F]"><UserRound className="inline h-5 w-5 mr-1" style={{ color: accent }} /> {t.parish.welcomeBack(household.guardian1FirstName)}</p>
            <Link href={`/lux/${orgSlug}/family`} className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] px-4 py-2 text-white text-sm">{t.parish.openFamilyPage} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : programs.length > 0 && (
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E8E2D4] p-5">
            <p className="font-medium text-[#1E3A5F]">{t.parish.registeredBefore}</p>
            <p className="text-sm text-gray-600 mb-3">{t.parish.registeredBeforeText}</p>
            <FamilyLinkRequest slug={orgSlug} compact lang={lang} />
          </div>
        )}

        <section>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[#1E3A5F] mb-4"><BookOpen className="h-6 w-6" style={{ color: accent }} /> {t.parish.programsHeading}</h2>
          {ordered.length === 0 ? (
            <p className="text-gray-600 bg-white rounded-xl border border-[#E8E2D4] p-6">{t.parish.notOpen}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ordered.map(p => {
                  const fees = (p.feeItemsList || []).filter(f => Number(f.amount) > 0)
                  const unit = p.perFamily ? t.parish.perFamily : p.audience === 'children' ? t.parish.perChild : t.parish.perPerson
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border p-5 flex flex-col" style={{ borderColor: p.slug === highlight ? accent : '#E8E2D4' }}>
                      <p className="text-xs uppercase tracking-wide text-[#9C8466]">
                        {p.term} · {p.audience === 'adults' ? t.parish.forAdults : p.audience === 'families' ? t.parish.forFamilies : gradeRange(p.gradesList, lang)}
                      </p>
                      <h3 className="text-lg font-semibold text-[#1E3A5F] mt-1">{p.name}</h3>
                      {p.language && t.parish.taughtIn[p.language] && (
                        <p className="mt-1.5"><span className="inline-flex items-center gap-1 rounded-full bg-[#F5F1E8] px-2.5 py-0.5 text-xs text-[#6B5B3E]"><Languages className="h-3.5 w-3.5" /> {t.parish.taughtIn[p.language]}</span></p>
                      )}
                      {p.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line flex-1">{p.description}</p>}
                      {p.sessionsList.length > 0 && (
                        <div className="mt-3 text-sm">
                          <p className="flex items-center gap-1 text-gray-500 text-xs uppercase tracking-wide"><Clock className="h-3.5 w-3.5" /> {t.parish.classTimes}</p>
                          <ul className="mt-1 space-y-0.5 text-gray-700">
                            {p.sessionsList.map(sess => (
                              <li key={sess.id}>
                                {sess.name}{sess.schedule ? <span className="text-gray-500"> · {sess.schedule}</span> : null}
                                {sess.grades && <span className="text-gray-500"> · {gradeRange(sess.grades, lang)}</span>}
                                {sess.spotsLeft === 0 && <span className="text-amber-700"> · {t.parish.full}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-sm text-gray-800 mt-3">
                        {Number(p.tuitionPerChild) > 0 ? `${formatMoney(Number(p.tuitionPerChild))} ${unit}` : t.parish.noTuition}
                        {fees.length > 0 && <span className="text-gray-500"> + {fees.map(f => `${f.name} ${formatMoney(Number(f.amount))}`).join(', ')}</span>}
                      </p>
                      {p.spotsLeft !== null && p.spotsLeft <= 10 && (
                        <p className="text-sm text-amber-700 mt-1">{p.spotsLeft === 0 ? t.parish.full : t.parish.spotsLeft(p.spotsLeft)}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-6">
                <Link href={`/lux/${orgSlug}/register${highlight ? `?program=${highlight}` : ''}`}
                  className="lux-accent-btn inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-white font-semibold text-lg shadow-sm"
                  style={{ backgroundColor: accent }}>
                  {t.parish.register} <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1"><Users className="h-4 w-4" /> {t.parish.registerHint}</p>
                <style>{`.lux-accent-btn:hover{background-color:${accentDark}!important}`}</style>
              </div>
            </>
          )}
        </section>

        {upcoming.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#1E3A5F] mb-4"><CalendarHeart className="h-6 w-6" style={{ color: accent }} /> {t.parish.eventsHeading}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map(e => {
                const language = parseSimpleEventConfig(e.luxConfig).language
                return (
                  <Link key={e.id} href={`/events/${e.slug}`} className="bg-white rounded-2xl border border-[#E8E2D4] p-5 hover:shadow-md transition-all">
                    <p className="text-xs uppercase tracking-wide text-[#9C8466]">{formatEventDate(e.startDate, {}, lang)}{formatTimeRange(e.startTime, e.endTime) ? ` · ${formatTimeRange(e.startTime, e.endTime)}` : ''}</p>
                    <h3 className="text-lg font-semibold text-[#1E3A5F] mt-1">{e.name}</h3>
                    {e.locationName && <p className="text-sm text-gray-600">{e.locationName}</p>}
                    {language && t.event.taughtIn[language] && <p className="text-xs text-[#6B5B3E] mt-1">{t.event.taughtIn[language]}</p>}
                    <p className="text-sm mt-3 font-medium text-[#1E3A5F]">
                      {e.liveStatus === 'open' ? t.parish.eventRegister : e.liveStatus === 'full' ? t.parish.eventFull : e.liveStatus === 'not_yet_open' ? t.parish.eventSoon : t.parish.eventClosed}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {(org.contactEmail || org.contactPhone) && (
          <p className="text-center text-sm text-gray-500">{t.common.contactOffice(org.contactEmail, org.contactPhone)}</p>
        )}
      </div>
    </LuxPublicShell>
  )
}
