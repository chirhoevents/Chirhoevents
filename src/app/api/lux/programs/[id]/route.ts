import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { loadProgramForEditor, programIsOpen, updateProgram, validateProgramInput } from '@/lib/lux/program-server'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params

  const program = await loadProgramForEditor(ctx.organizationId, id)
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  const registered = await prisma.luxProgramRegistration.count({ where: { programId: id, cancelledAt: null } })
  return NextResponse.json({ program: { ...program, isOpen: programIsOpen(program), registered } })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const exists = await prisma.luxProgram.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

  const parsed = validateProgramInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const result = await updateProgram(ctx.organizationId, id, parsed.value)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}

/** DELETE: only a program nobody has registered for */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const program = await prisma.luxProgram.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true } })
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  const registrations = await prisma.luxProgramRegistration.count({ where: { programId: id } })
  if (registrations > 0) {
    return NextResponse.json({ error: 'Families have registered for this program. Close or archive it instead.' }, { status: 400 })
  }
  await prisma.luxProgram.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
