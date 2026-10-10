import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { publicImageProblem, uploadPublicImage } from '@/lib/r2/upload-public-image'
import { clearLuxBrandCache, getLuxBrand } from '@/lib/lux/brand'
import { DEFAULT_LUX_BRAND, LUX_BRAND_SETTING_KEYS, type LuxBrand } from '@/lib/lux/brand-shared'

async function requireMasterAdmin(request: NextRequest) {
  const clerkUserId = await getClerkUserIdFromRequest(request)
  if (!clerkUserId) return null
  const user = await prisma.user.findFirst({ where: { clerkUserId }, select: { id: true, role: true } })
  return user?.role === 'master_admin' ? user : null
}

const SLOTS = Object.keys(LUX_BRAND_SETTING_KEYS) as Array<keyof LuxBrand>

/** GET: current Lux logos and the defaults */
export async function GET(request: NextRequest) {
  if (!(await requireMasterAdmin(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  clearLuxBrandCache()
  return NextResponse.json({ brand: await getLuxBrand(), defaults: DEFAULT_LUX_BRAND })
}

/** POST multipart { slot: logo | logoWhite | mark, file }: replace one Lux logo */
export async function POST(request: NextRequest) {
  const user = await requireMasterAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const form = await request.formData().catch(() => null)
  const slot = form?.get('slot') as keyof LuxBrand | null
  const file = form?.get('file') as File | null
  if (!slot || !SLOTS.includes(slot)) return NextResponse.json({ error: 'Unknown logo.' }, { status: 400 })
  const problem = publicImageProblem(file)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const url = await uploadPublicImage(Buffer.from(await file!.arrayBuffer()), `platform/lux/${slot}`, file!.name)
  await prisma.platformSetting.upsert({
    where: { settingKey: LUX_BRAND_SETTING_KEYS[slot] },
    update: { settingValue: url, updatedByUserId: user.id },
    create: { settingKey: LUX_BRAND_SETTING_KEYS[slot], settingValue: url, updatedByUserId: user.id },
  })
  clearLuxBrandCache()
  return NextResponse.json({ brand: await getLuxBrand() })
}

/** DELETE ?slot=: go back to the built-in logo */
export async function DELETE(request: NextRequest) {
  if (!(await requireMasterAdmin(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const slot = request.nextUrl.searchParams.get('slot') as keyof LuxBrand | null
  if (!slot || !SLOTS.includes(slot)) return NextResponse.json({ error: 'Unknown logo.' }, { status: 400 })
  await prisma.platformSetting.deleteMany({ where: { settingKey: LUX_BRAND_SETTING_KEYS[slot] } })
  clearLuxBrandCache()
  return NextResponse.json({ brand: await getLuxBrand() })
}
