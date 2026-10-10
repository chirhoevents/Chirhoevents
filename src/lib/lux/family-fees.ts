/**
 * Faith formation fees for one family checkout.
 *
 * Each program charges a per-child tuition plus any extra per-child fees
 * (books, retreat, sacrament fee). The parish can set:
 *   - a sibling discount: an amount or percent off for each additional child
 *     (optionally a different amount from the third child on), applied to
 *     tuition and to whichever extra fees are marked as discountable;
 *   - a family maximum per term.
 * Programs can opt out of either. Children already registered this term
 * count as earlier siblings, and what the family already owes this term
 * counts toward the maximum, so registering kids on different days comes
 * out the same as registering them together.
 *
 * Everything is computed in cents.
 */

export type DiscountType = 'none' | 'amount' | 'percent'

export interface FeeRules {
  siblingDiscount: { type: DiscountType; value: number; thirdPlusValue: number | null }
  familyCap: number | null
}

export const DEFAULT_FEE_RULES: FeeRules = {
  siblingDiscount: { type: 'none', value: 0, thirdPlusValue: null },
  familyCap: null,
}

export function parseFeeRules(raw: unknown): FeeRules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const sd = (r.siblingDiscount && typeof r.siblingDiscount === 'object' ? r.siblingDiscount : {}) as Record<string, unknown>
  const type: DiscountType = sd.type === 'amount' || sd.type === 'percent' ? sd.type : 'none'
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
  const value = num(sd.value) ?? 0
  return {
    siblingDiscount: {
      type,
      value: type === 'percent' ? Math.min(100, value) : value,
      thirdPlusValue: num(sd.thirdPlusValue) === null ? null : type === 'percent' ? Math.min(100, num(sd.thirdPlusValue)!) : num(sd.thirdPlusValue),
    },
    familyCap: num(r.familyCap) === null || num(r.familyCap) === 0 ? null : num(r.familyCap),
  }
}

export interface FeeItem {
  name: string
  amount: number
  siblingDiscount: boolean
}

export interface FeeLineInput {
  key: string
  // Same child in two programs counts as one sibling
  childKey: string
  tuition: number
  feeItems: FeeItem[]
  siblingDiscountApplies: boolean
  countsTowardFamilyCap: boolean
}

export interface FeeLineResult {
  key: string
  childKey: string
  base: number
  siblingDiscount: number
  capAdjustment: number
  total: number
}

export interface FamilyFeesResult {
  lines: FeeLineResult[]
  subtotal: number
  siblingDiscount: number
  familyCapAdjustment: number
  total: number
}

const cents = (dollars: number) => Math.round(dollars * 100)
const dollars = (c: number) => c / 100

/** Split `amountCents` across `weights` proportionally, remainder to the largest */
function allocate(amountCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (amountCents <= 0 || totalWeight <= 0) return weights.map(() => 0)
  const shares = weights.map(w => Math.floor((amountCents * w) / totalWeight))
  let remainder = amountCents - shares.reduce((s, x) => s + x, 0)
  const order = weights.map((w, i) => i).sort((a, b) => weights[b] - weights[a])
  for (let i = 0; remainder > 0; i = (i + 1) % order.length, remainder--) shares[order[i]]++
  return shares
}

export function calculateFamilyFees(input: {
  lines: FeeLineInput[]
  rules: FeeRules
  // Distinct children already registered this term in discounted programs
  priorDiscountedChildren?: number
  // What this family already owes this term in programs under the maximum
  priorChargesTowardCap?: number
}): FamilyFeesResult {
  const { rules } = input
  const prior = Math.max(0, input.priorDiscountedChildren ?? 0)

  const work = input.lines.map(line => {
    const itemCents = line.feeItems.map(i => Math.max(0, cents(i.amount)))
    const tuitionCents = Math.max(0, cents(line.tuition))
    const base = tuitionCents + itemCents.reduce((s, c) => s + c, 0)
    const discountable = line.siblingDiscountApplies
      ? tuitionCents + line.feeItems.reduce((s, item, i) => s + (item.siblingDiscount ? itemCents[i] : 0), 0)
      : 0
    return { line, base, discountable, discount: 0, cap: 0 }
  })

  // --- Sibling discount, per child: the most expensive child pays full price
  if (rules.siblingDiscount.type !== 'none' && rules.siblingDiscount.value > 0) {
    const byChild = new Map<string, typeof work>()
    for (const w of work) {
      if (w.discountable <= 0) continue
      byChild.set(w.line.childKey, [...(byChild.get(w.line.childKey) || []), w])
    }
    const children = [...byChild.entries()]
      .map(([childKey, items]) => ({ childKey, items, discountable: items.reduce((s, w) => s + w.discountable, 0) }))
      .sort((a, b) => b.discountable - a.discountable || a.childKey.localeCompare(b.childKey))

    children.forEach((child, index) => {
      const position = prior + index // 0 = first child in the family this term
      if (position === 0) return
      const value = position >= 2 && rules.siblingDiscount.thirdPlusValue !== null
        ? rules.siblingDiscount.thirdPlusValue
        : rules.siblingDiscount.value
      const childDiscount = rules.siblingDiscount.type === 'percent'
        ? Math.round((child.discountable * Math.min(100, value)) / 100)
        : Math.min(cents(value), child.discountable)
      const shares = allocate(childDiscount, child.items.map(w => w.discountable))
      child.items.forEach((w, i) => { w.discount += shares[i] })
    })
  }

  // --- Family maximum
  if (rules.familyCap !== null) {
    const allowed = Math.max(0, cents(rules.familyCap) - cents(input.priorChargesTowardCap ?? 0))
    const capped = work.filter(w => w.line.countsTowardFamilyCap)
    const cappedTotal = capped.reduce((s, w) => s + (w.base - w.discount), 0)
    if (cappedTotal > allowed) {
      const shares = allocate(cappedTotal - allowed, capped.map(w => w.base - w.discount))
      capped.forEach((w, i) => { w.cap = shares[i] })
    }
  }

  const lines = work.map(w => ({
    key: w.line.key,
    childKey: w.line.childKey,
    base: dollars(w.base),
    siblingDiscount: dollars(w.discount),
    capAdjustment: dollars(w.cap),
    total: dollars(w.base - w.discount - w.cap),
  }))
  const sum = (f: (w: typeof work[number]) => number) => work.reduce((s, w) => s + f(w), 0)
  return {
    lines,
    subtotal: dollars(sum(w => w.base)),
    siblingDiscount: dollars(sum(w => w.discount)),
    familyCapAdjustment: dollars(sum(w => w.cap)),
    total: dollars(sum(w => w.base - w.discount - w.cap)),
  }
}

/** One-line description of the parish's rules, for staff and family pages */
export function describeFeeRules(rules: FeeRules, lang: 'en' | 'es' = 'en'): string {
  const parts: string[] = []
  const sd = rules.siblingDiscount
  const fmt = (v: number) => (sd.type === 'percent' ? `${v}%` : `$${v.toFixed(2).replace(/\.00$/, '')}`)
  const es = lang === 'es'
  if (sd.type !== 'none' && sd.value > 0) {
    parts.push(sd.thirdPlusValue !== null && sd.thirdPlusValue !== sd.value
      ? es
        ? `${fmt(sd.value)} de descuento para el segundo hijo y ${fmt(sd.thirdPlusValue)} para cada hijo después`
        : `${fmt(sd.value)} off the second child, ${fmt(sd.thirdPlusValue)} off each child after that`
      : es ? `${fmt(sd.value)} de descuento por cada hijo adicional` : `${fmt(sd.value)} off each additional child`)
  }
  if (rules.familyCap !== null) {
    const cap = `$${rules.familyCap.toFixed(2).replace(/\.00$/, '')}`
    parts.push(es ? `ninguna familia paga más de ${cap} al año` : `no family pays more than ${cap} per year`)
  }
  if (!parts.length) return es ? 'Sin descuento por hermanos ni máximo por familia' : 'No sibling discount or family maximum'
  return parts.join('; ')
}

/** The policy line for family pages, or '' when there's nothing to say */
export function feePolicyForFamilies(rules: FeeRules, lang: 'en' | 'es' = 'en'): string {
  const hasRules = (rules.siblingDiscount.type !== 'none' && rules.siblingDiscount.value > 0) || rules.familyCap !== null
  return hasRules ? describeFeeRules(rules, lang) : ''
}
