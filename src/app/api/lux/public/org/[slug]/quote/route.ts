import { NextRequest, NextResponse } from 'next/server'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { parseLuxSettings } from '@/lib/lux/settings'
import { fullSessionFor, getFamilySession } from '@/lib/lux/family-session'
import { loadOpenPrograms, quoteFamily } from '@/lib/lux/family-registration'

type Params = { params: Promise<{ slug: string }> }

/**
 * POST /api/lux/public/org/[slug]/quote
 * { children: [{ key, childId?, firstName, lastName, programId }] }
 *
 * Prices a family's registration before they submit. Siblings already
 * registered this term only count for a signed-in family (otherwise this
 * would reveal who's on file); the final price is worked out again on submit.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const org = await findLuxOrgBySlug(slug)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const children = (Array.isArray(body.children) ? body.children : [])
    .filter((c: any) => typeof c?.programId === 'string' && typeof c?.firstName === 'string')
    .slice(0, 12)
    .map((c: any, i: number) => ({
      key: String(c.key ?? i).slice(0, 40),
      firstName: String(c.firstName).slice(0, 100),
      lastName: String(c.lastName ?? '').slice(0, 100),
      programId: c.programId,
      existingChildId: typeof c.childId === 'string' ? c.childId : null,
    }))

  const session = fullSessionFor(await getFamilySession(request), org.id)
  const programs = await loadOpenPrograms(org.id, [...new Set(children.map((c: { programId: string }) => c.programId))] as string[])
  const quote = await quoteFamily({
    programs,
    children: session ? children : children.map((c: Record<string, unknown>) => ({ ...c, existingChildId: null })),
    householdId: session?.householdId ?? null,
    rules: parseLuxSettings(org.luxSettings).feeRules,
  })
  return NextResponse.json({ quote })
}
