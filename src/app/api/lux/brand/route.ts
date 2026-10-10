import { NextResponse } from 'next/server'
import { getLuxBrand } from '@/lib/lux/brand'

export const dynamic = 'force-dynamic'

/** GET /api/lux/brand — the current Lux logo URLs (public) */
export async function GET() {
  return NextResponse.json(await getLuxBrand(), { headers: { 'Cache-Control': 'public, max-age=60' } })
}
