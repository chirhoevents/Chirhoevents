import { randomBytes } from 'crypto'

export function slugify(text: string, maxLength = 60): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '') || 'item'
}

/** A slug with a short random suffix, for URLs that must be unique across all orgs */
export function uniqueSlug(text: string): string {
  return `${slugify(text, 50)}-${randomBytes(3).toString('hex')}`
}
