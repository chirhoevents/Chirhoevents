import { NextRequest, NextResponse } from 'next/server'
import { requireLuxStaff } from '@/lib/lux/access'
import { loadOrderForStaff } from '@/lib/lux/orders-staff'

type Params = { params: Promise<{ id: string }> }

/** GET /api/lux/orders/[id] — a faith formation order with its children, payments and fee assistance */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params
  const order = await loadOrderForStaff(ctx.organizationId, id)
  if (!order) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  return NextResponse.json({ order })
}
