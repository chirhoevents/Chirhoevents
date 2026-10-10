import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, BookOpen, FileText, Receipt, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { fullSessionFor, getFamilySessionFromCookies } from '@/lib/lux/family-session'
import { familyDocuments } from '@/lib/lux/family-documents'
import { parseLuxSettings } from '@/lib/lux/settings'
import { formatMoney, gradeLabel } from '@/lib/lux/format'
import LuxPublicShell from '@/components/lux/public/LuxPublicShell'
import FamilyLinkRequest from '@/components/lux/public/FamilyLinkRequest'
import DocumentUploadList from '@/components/lux/public/DocumentUploadList'
import FamilyDetailsForm from '@/components/lux/public/FamilyDetailsForm'
import FamilySignOut from '@/components/lux/public/FamilySignOut'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ orgSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await findLuxOrgBySlug(orgSlug)
  return { title: org ? `Your family – ${org.name}` : 'Not found', robots: { index: false } }
}

const ORDER_STATUS: Record<string, { text: string; className: string }> = {
  paid: { text: 'Paid', className: 'text-green-700' },
  waived: { text: 'Fees waived', className: 'text-green-700' },
  office_pending: { text: 'Pay at the parish office', className: 'text-amber-700' },
  pending_payment: { text: 'Payment not finished', className: 'text-amber-700' },
  assistance_requested: { text: 'Fee assistance under review', className: 'text-[#9C8466]' },
}

/**
 * A family's page: their details, children and registrations, documents to
 * upload, and anything still owed. Reached from an emailed sign-in link.
 */
export default async function FamilyPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await findLuxOrgBySlug(orgSlug)
  if (!org) notFound()

  const session = fullSessionFor(await getFamilySessionFromCookies(), org.id)
  if (!session) {
    return (
      <LuxPublicShell organizationName={org.name} logoUrl={org.logoUrl} parishSlug={orgSlug}>
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-[#E8E2D4] p-7">
          <h1 className="text-xl font-semibold text-[#1E3A5F]">Sign in to your family page</h1>
          <p className="text-sm text-gray-600 mt-2 mb-4">
            Enter the email you registered with. We’ll send you a link that signs you in, no password needed.
          </p>
          <FamilyLinkRequest slug={orgSlug} />
        </div>
      </LuxPublicShell>
    )
  }

  const household = await prisma.luxHousehold.findFirst({
    where: { id: session.householdId, organizationId: org.id },
    include: {
      children: { where: { archivedAt: null }, orderBy: { dateOfBirth: 'asc' } },
      registrations: {
        where: { cancelledAt: null, program: { status: { not: 'archived' } } },
        include: { program: { select: { name: true, term: true } } },
        orderBy: { createdAt: 'desc' },
      },
      orders: { where: { status: { not: 'cancelled' } }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!household) notFound()

  const documents = await familyDocuments(household.id)
  const settings = parseLuxSettings(org.luxSettings)
  const outstanding = documents.filter(d => d.required && ['missing', 'needs_resubmission'].includes(d.status)).length
  const owing = household.orders
    .map(o => ({ ...o, owed: Math.max(0, Number(o.amountDue) - Number(o.amountPaid)) }))
    .filter(o => o.owed > 0 && ['office_pending', 'pending_payment'].includes(o.status))

  return (
    <LuxPublicShell organizationName={org.name} logoUrl={org.logoUrl} parishSlug={orgSlug}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>
              Welcome, {household.guardian1FirstName}
            </h1>
            <p className="text-gray-600 mt-1">
              {outstanding > 0
                ? `${outstanding} document${outstanding === 1 ? ' is' : 's are'} still needed.`
                : owing.length > 0 ? 'You have a balance to pay.' : 'You’re all set. Thank you!'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/lux/${orgSlug}/register`} className="inline-flex items-center gap-1 rounded-lg bg-[#C8A24A] hover:bg-[#B8923A] px-4 py-2 text-white text-sm font-medium">
              Register for this year <ArrowRight className="h-4 w-4" />
            </Link>
            <FamilySignOut slug={orgSlug} />
          </div>
        </div>

        {owing.length > 0 && (
          <section className="bg-white rounded-2xl border border-amber-200 p-6">
            <h2 className="flex items-center gap-2 font-semibold text-[#1E3A5F] mb-3"><Receipt className="h-5 w-5 text-[#C8A24A]" /> Balance due</h2>
            <div className="space-y-3">
              {owing.map(o => (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[#FAF8F3] p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{formatMoney(o.owed)} · Confirmation #{o.confirmationCode}</p>
                    <p className={ORDER_STATUS[o.status]?.className}>{ORDER_STATUS[o.status]?.text}</p>
                    {o.status === 'office_pending' && settings.officePaymentInstructions && (
                      <p className="text-gray-600 mt-1">{settings.officePaymentInstructions}</p>
                    )}
                  </div>
                  {org.paymentsReady && (
                    <Link href={`/lux/${orgSlug}/pay/${o.id}?t=${o.payToken}`} className="shrink-0 rounded-lg bg-[#1E3A5F] px-4 py-2 text-white text-center">
                      Pay online
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-[#E8E2D4] p-6">
          <h2 className="flex items-center gap-2 font-semibold text-[#1E3A5F] mb-1"><FileText className="h-5 w-5 text-[#C8A24A]" /> Documents</h2>
          <p className="text-sm text-gray-600 mb-3">
            Upload a photo or scan. Only parish staff can see these files.
          </p>
          <DocumentUploadList items={documents} />
        </section>

        <section className="bg-white rounded-2xl border border-[#E8E2D4] p-6">
          <h2 className="flex items-center gap-2 font-semibold text-[#1E3A5F] mb-3"><BookOpen className="h-5 w-5 text-[#C8A24A]" /> Your children</h2>
          {household.children.length === 0 ? (
            <p className="text-sm text-gray-500">No children registered yet.</p>
          ) : (
            <div className="space-y-3">
              {household.children.map(c => {
                const regs = household.registrations.filter(r => r.childId === c.id)
                return (
                  <div key={c.id} className="rounded-lg bg-[#FAF8F3] p-3 text-sm">
                    <p className="font-medium text-gray-900">{c.firstName} {c.lastName}{c.grade ? <span className="font-normal text-gray-500"> · {gradeLabel(c.grade)}</span> : null}</p>
                    {regs.length === 0 ? (
                      <p className="text-gray-500">Not registered for a current program.</p>
                    ) : regs.map(r => (
                      <p key={r.id} className="text-gray-700">
                        {r.program.name} <span className="text-gray-500">({r.program.term})</span>
                        {r.status === 'pending_payment' && <span className="text-amber-700"> · waiting on payment</span>}
                      </p>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-[#E8E2D4] p-6">
          <h2 className="flex items-center gap-2 font-semibold text-[#1E3A5F] mb-3"><Users className="h-5 w-5 text-[#C8A24A]" /> Our information</h2>
          <FamilyDetailsForm
            initial={{
              guardian1FirstName: household.guardian1FirstName, guardian1LastName: household.guardian1LastName,
              email: household.email, phone: household.phone, street: household.street ?? '', city: household.city ?? '',
              state: household.state ?? '', zip: household.zip ?? '',
              guardian2FirstName: household.guardian2FirstName ?? '', guardian2LastName: household.guardian2LastName ?? '',
              guardian2Email: household.guardian2Email ?? '', guardian2Phone: household.guardian2Phone ?? '',
              emergencyContactName: household.emergencyContactName ?? '', emergencyContactPhone: household.emergencyContactPhone ?? '',
            }}
            kids={household.children.map(c => ({
              id: c.id, firstName: c.firstName, lastName: c.lastName, grade: c.grade ?? '',
              allergies: c.allergies ?? '', medicalNotes: c.medicalNotes ?? '', school: c.school ?? '',
            }))}
          />
        </section>

        {household.orders.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#E8E2D4] p-6">
            <h2 className="font-semibold text-[#1E3A5F] mb-3">Registrations</h2>
            <div className="divide-y divide-[#F0EBDF] text-sm">
              {household.orders.map(o => (
                <div key={o.id} className="flex justify-between gap-3 py-2">
                  <span>#{o.confirmationCode} · {o.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-right">
                    {formatMoney(Number(o.amountDue))}
                    <span className={`block text-xs ${ORDER_STATUS[o.status]?.className ?? 'text-gray-500'}`}>
                      {Number(o.amountDue) === 0 && o.status === 'paid' ? 'No fee' : ORDER_STATUS[o.status]?.text ?? o.status}
                    </span>
                  </span>
                </div>
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
