import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, CalendarHeart, ArrowRight, UserRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { loadOpenPrograms } from '@/lib/lux/family-registration'
import { fullSessionFor, getFamilySessionFromCookies } from '@/lib/lux/family-session'
import { getSimpleEventStatus } from '@/lib/lux/simple-event'
import { formatEventDate, formatMoney, formatTimeRange, gradeLabel } from '@/lib/lux/format'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import FamilyLinkRequest from '@/components/lux/public/FamilyLinkRequest'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ program?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await findLuxOrgBySlug(orgSlug)
  return { title: org ? `Register – ${org.name}` : 'Not found' }
}

function gradeRange(grades: string[] | null): string {
  if (!grades || grades.length === 0) return 'All ages'
  if (grades.length === 1) return gradeLabel(grades[0])
  return `${gradeLabel(grades[0])} – ${gradeLabel(grades[grades.length - 1])}`
}

/** A parish's public Lux page: its open programs and upcoming events */
export default async function ParishLuxPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { program: highlight } = await searchParams
  const org = await findLuxOrgBySlug(orgSlug)
  if (!org) notFound()

  const [programs, events, session] = await Promise.all([
    loadOpenPrograms(org.id),
    prisma.event.findMany({
      where: { organizationId: org.id, mode: 'simple', isPublished: true, archivedAt: null, endDate: { gte: new Date(Date.now() - 86400000) } },
      orderBy: { startDate: 'asc' },
      select: {
        id: true, name: true, slug: true, description: true, startDate: true, endDate: true, startTime: true, endTime: true,
        timezone: true, locationName: true, status: true, isPublished: true, registrationOpenDate: true, registrationCloseDate: true,
        capacityRemaining: true,
      },
    }),
    getFamilySessionFromCookies(),
  ])
  const signedIn = fullSessionFor(session, org.id)
  const household = signedIn
    ? await prisma.luxHousehold.findUnique({ where: { id: signedIn.householdId }, select: { guardian1FirstName: true } })
    : null
  const upcoming = events.map(e => ({ ...e, liveStatus: getSimpleEventStatus(e) })).filter(e => e.liveStatus !== 'ended' && e.liveStatus !== 'draft')
  const ordered = highlight ? [...programs].sort((a, b) => (a.slug === highlight ? -1 : b.slug === highlight ? 1 : 0)) : programs

  return (
    <LuxPublicShell organizationName={org.name} logoUrl={org.logoUrl} parishSlug={null}>
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>Welcome to {org.name}</h1>
          <p className="text-gray-600 mt-3">Register your family for faith formation and the sacraments, and sign up for parish events.</p>
        </div>

        {household ? (
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E8E2D4] p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-[#1E3A5F]"><UserRound className="inline h-5 w-5 text-[#C8A24A] mr-1" /> Welcome back, {household.guardian1FirstName}!</p>
            <Link href={`/lux/${orgSlug}/family`} className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] px-4 py-2 text-white text-sm">Open your family page <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : programs.length > 0 && (
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E8E2D4] p-5">
            <p className="font-medium text-[#1E3A5F]">Registered with us before?</p>
            <p className="text-sm text-gray-600 mb-3">We’ll email you a link to your family page. Your information will be filled in, and you can upload documents or register for this year.</p>
            <FamilyLinkRequest slug={orgSlug} compact />
          </div>
        )}

        <section>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[#1E3A5F] mb-4"><BookOpen className="h-6 w-6 text-[#C8A24A]" /> Faith formation &amp; sacraments</h2>
          {ordered.length === 0 ? (
            <p className="text-gray-600 bg-white rounded-xl border border-[#E8E2D4] p-6">Registration isn’t open right now. Please check back soon or contact the parish office.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ordered.map(p => {
                  const fees = (p.feeItemsList || []).filter(f => Number(f.amount) > 0)
                  return (
                    <div key={p.id} className={`bg-white rounded-2xl border p-5 flex flex-col ${p.slug === highlight ? 'border-[#C8A24A] shadow-md' : 'border-[#E8E2D4]'}`}>
                      <p className="text-xs uppercase tracking-wide text-[#9C8466]">{p.term} · {gradeRange(p.gradesList)}</p>
                      <h3 className="text-lg font-semibold text-[#1E3A5F] mt-1">{p.name}</h3>
                      {p.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line flex-1">{p.description}</p>}
                      <p className="text-sm text-gray-800 mt-3">
                        {Number(p.tuitionPerChild) > 0 ? `${formatMoney(Number(p.tuitionPerChild))} per child` : 'No tuition'}
                        {fees.length > 0 && <span className="text-gray-500"> + {fees.map(f => `${f.name} ${formatMoney(Number(f.amount))}`).join(', ')}</span>}
                      </p>
                      {p.spotsLeft !== null && p.spotsLeft <= 10 && (
                        <p className="text-sm text-amber-700 mt-1">{p.spotsLeft === 0 ? 'Full' : `Only ${p.spotsLeft} spot${p.spotsLeft === 1 ? '' : 's'} left`}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-6">
                <Link href={`/lux/${orgSlug}/register${highlight ? `?program=${highlight}` : ''}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C8A24A] hover:bg-[#B8923A] px-8 py-3.5 text-white font-semibold text-lg shadow-sm">
                  Register my children <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-sm text-gray-500 mt-2">One form for all your children, even in different programs.</p>
              </div>
            </>
          )}
        </section>

        {upcoming.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#1E3A5F] mb-4"><CalendarHeart className="h-6 w-6 text-[#C8A24A]" /> Upcoming events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map(e => (
                <Link key={e.id} href={`/events/${e.slug}`} className="bg-white rounded-2xl border border-[#E8E2D4] p-5 hover:shadow-md hover:border-[#C8A24A] transition-all">
                  <p className="text-xs uppercase tracking-wide text-[#9C8466]">{formatEventDate(e.startDate)}{formatTimeRange(e.startTime, e.endTime) ? ` · ${formatTimeRange(e.startTime, e.endTime)}` : ''}</p>
                  <h3 className="text-lg font-semibold text-[#1E3A5F] mt-1">{e.name}</h3>
                  {e.locationName && <p className="text-sm text-gray-600">{e.locationName}</p>}
                  <p className="text-sm mt-3 font-medium text-[#1E3A5F]">
                    {e.liveStatus === 'open' ? 'Register →' : e.liveStatus === 'full' ? 'Full' : e.liveStatus === 'not_yet_open' ? 'Opens soon' : 'Registration closed'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(org.contactEmail || org.contactPhone) && (
          <p className="text-center text-sm text-gray-500">
            Questions? Contact the parish office{org.contactEmail && <> at <a className="underline" href={`mailto:${org.contactEmail}`}>{org.contactEmail}</a></>}{org.contactPhone && <> or {org.contactPhone}</>}.
          </p>
        )}
      </div>
    </LuxPublicShell>
  )
}
