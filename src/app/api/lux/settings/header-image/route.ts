import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { mergeLuxSettings, parseLuxSettings } from '@/lib/lux/settings'
import { publicImageProblem, uploadPublicImage } from '@/lib/r2/upload-public-image'

/** POST multipart { file }: the photo across the top of the parish's Lux page */
export async function POST(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const form = await request.formData().catch(() => null)
  const file = form?.get('file') as File | null
  const problem = publicImageProblem(file)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const url = await uploadPublicImage(Buffer.from(await file!.arrayBuffer()), `${ctx.organizationId}/lux/page-header`, file!.name)
  const current = parseLuxSettings(ctx.organization.luxSettings).page
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { luxSettings: { ...mergeLuxSettings(ctx.organization.luxSettings, {}), page: { ...current, headerImageUrl: url } } as object },
  })
  return NextResponse.json({ headerImageUrl: url })
}

/** DELETE: remove the header photo */
export async function DELETE(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const current = parseLuxSettings(ctx.organization.luxSettings).page
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { luxSettings: { ...mergeLuxSettings(ctx.organization.luxSettings, {}), page: { ...current, headerImageUrl: null } } as object },
  })
  return NextResponse.json({ headerImageUrl: null })
}
