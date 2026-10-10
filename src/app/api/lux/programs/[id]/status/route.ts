import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'

type Params = { params: Promise<{ id: string }> }

/** POST /api/lux/programs/[id]/status  { status: 'open' | 'closed' | 'archived' | 'draft' } */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const { status } = await request.json().catch(() => ({}))
  if (!['open', 'closed', 'archived', 'draft'].includes(status)) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
  }

  const program = await prisma.luxProgram.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, tuitionPerChild: true, feeItems: true, onlinePaymentEnabled: true, payAtOfficeEnabled: true },
  })
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

  if (status === 'draft') {
    const registrations = await prisma.luxProgramRegistration.count({ where: { programId: id } })
    if (registrations > 0) return NextResponse.json({ error: 'Families have already registered; close the program instead.' }, { status: 400 })
  }

  if (status === 'open') {
    const hasFees = Number(program.tuitionPerChild) > 0 ||
      (Array.isArray(program.feeItems) ? (program.feeItems as Array<{ amount: number }>) : []).some(i => Number(i.amount) > 0)
    if (hasFees && program.onlinePaymentEnabled && !program.payAtOfficeEnabled) {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { stripeAccountId: true, stripeChargesEnabled: true },
      })
      if (!org?.stripeAccountId || !org.stripeChargesEnabled) {
        return NextResponse.json({
          error: 'Online payments need Stripe connected first (Settings → Integrations). Or turn on "Pay at the parish office" for this program.',
        }, { status: 400 })
      }
    }
  }

  await prisma.luxProgram.update({ where: { id }, data: { status } })
  return NextResponse.json({ success: true })
}
