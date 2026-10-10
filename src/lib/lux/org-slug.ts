import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/lux/slug'
import { randomBytes } from 'crypto'

const RESERVED = new Set(['registered', 'pay', 'api', 'new', 'admin', 'family', 'lux', 'link-expired'])

/**
 * The parish's public Lux page lives at /lux/<publicSlug>. Give the org one
 * based on its name the first time Lux needs it; staff can change it in
 * Lux settings.
 */
export async function ensureOrgPublicSlug(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, publicSlug: true },
  })
  if (!org) throw new Error('Organization not found')
  if (org.publicSlug) return org.publicSlug

  const named = slugify(org.name, 60)
  const base = named.length >= 3 && !RESERVED.has(named) ? named : `parish-${named}`.slice(0, 60)
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 55)}-${randomBytes(2).toString('hex')}`
    try {
      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: { publicSlug: candidate },
        select: { publicSlug: true },
      })
      return updated.publicSlug!
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error
    }
  }
  throw new Error('Could not create a public page address')
}

/** Validate a staff-chosen public page address */
export function validatePublicSlug(value: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(value)) {
    return 'Use 3-60 lowercase letters, numbers and dashes (no dash at the start or end).'
  }
  if (RESERVED.has(value)) return 'That address is reserved. Please choose another.'
  return null
}
