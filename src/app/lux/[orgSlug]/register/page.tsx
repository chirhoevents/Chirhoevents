import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { loadOpenPrograms } from '@/lib/lux/family-registration'
import { fullSessionFor, getFamilySessionFromCookies } from '@/lib/lux/family-session'
import { parseLuxSettings } from '@/lib/lux/settings'
import { feePolicyForFamilies } from '@/lib/lux/family-fees'
import { publicProgram } from '@/lib/lux/public-programs'
import { getLuxLang } from '@/lib/lux/i18n-server'
import { dict } from '@/lib/lux/i18n'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import FamilyRegistrationWizard, { type PrefillChild, type PrefillHousehold } from '@/components/lux/public/FamilyRegistrationWizard'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ program?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await findLuxOrgBySlug(orgSlug)
  return { title: org ? `Register – ${org.name}` : 'Not found' }
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')

export default async function FamilyRegisterPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { program: preselect } = await searchParams
  const org = await findLuxOrgBySlug(orgSlug)
  if (!org) notFound()

  const [programs, session, lang] = await Promise.all([loadOpenPrograms(org.id), getFamilySessionFromCookies(), getLuxLang()])
  const t = dict(lang)
  const signedIn = fullSessionFor(session, org.id)
  const settings = parseLuxSettings(org.luxSettings)

  let household: PrefillHousehold | null = null
  let children: PrefillChild[] = []
  if (signedIn) {
    const h = await prisma.luxHousehold.findUnique({
      where: { id: signedIn.householdId },
      include: { children: { where: { archivedAt: null }, orderBy: { dateOfBirth: 'asc' } } },
    })
    if (h) {
      household = {
        guardian1FirstName: h.guardian1FirstName, guardian1LastName: h.guardian1LastName, guardian1Relationship: h.guardian1Relationship ?? '',
        email: h.email, phone: h.phone, street: h.street ?? '', city: h.city ?? '', state: h.state ?? '', zip: h.zip ?? '',
        guardian2FirstName: h.guardian2FirstName ?? '', guardian2LastName: h.guardian2LastName ?? '', guardian2Relationship: h.guardian2Relationship ?? '',
        guardian2Email: h.guardian2Email ?? '', guardian2Phone: h.guardian2Phone ?? '',
        emergencyContactName: h.emergencyContactName ?? '', emergencyContactPhone: h.emergencyContactPhone ?? '',
        registeredParishioner: h.registeredParishioner,
      }
      children = h.children.map(c => ({
        childId: c.id, firstName: c.firstName, lastName: c.lastName, dateOfBirth: day(c.dateOfBirth), gender: c.gender ?? '',
        grade: c.grade ?? '', school: c.school ?? '', baptized: c.baptized, baptismDate: day(c.baptismDate), baptismParish: c.baptismParish ?? '',
        baptismCity: c.baptismCity ?? '', baptizedAtThisParish: c.baptizedAtThisParish, firstCommunionDate: day(c.firstCommunionDate),
        firstCommunionParish: c.firstCommunionParish ?? '', allergies: c.allergies ?? '', medicalNotes: c.medicalNotes ?? '',
        isAdult: c.isAdult,
      }))
    }
  }

  return (
    <LuxPublicShell organizationName={org.name} logoUrl={org.logoUrl} parishSlug={org.publicSlug} accentColor={settings.page.accentColor}>
      {programs.length === 0 ? (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E8E2D4] p-8 text-center">
          <h1 className="text-xl font-semibold text-[#1E3A5F]">{t.wizard.noPrograms}</h1>
          <p className="text-gray-600 mt-2">{t.wizard.noProgramsText}</p>
        </div>
      ) : (
        <FamilyRegistrationWizard
          slug={orgSlug}
          organizationName={org.name}
          programs={programs.map(publicProgram)}
          preselectProgramSlug={preselect ?? null}
          paymentsReady={org.paymentsReady}
          feeRulesSummary={feePolicyForFamilies(settings.feeRules, lang)}
          officeInstructions={settings.officePaymentInstructions}
          household={household}
          knownChildren={children}
          lang={lang}
          accentColor={settings.page.accentColor}
        />
      )}
    </LuxPublicShell>
  )
}
