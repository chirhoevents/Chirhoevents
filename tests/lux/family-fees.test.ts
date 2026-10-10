/**
 * Faith formation fee math: per-child tuition + extra fees, sibling discount
 * (amount / percent, third-child rule), family maximum, earlier siblings.
 *
 * Run: npx tsx tests/lux/family-fees.test.ts
 */

import { check, section, finish } from './helpers'
import { calculateFamilyFees, parseFeeRules, describeFeeRules, type FeeLineInput } from '../../src/lib/lux/family-fees'

const line = (key: string, childKey: string, tuition: number, extra: Partial<FeeLineInput> = {}): FeeLineInput => ({
  key, childKey, tuition, feeItems: [], siblingDiscountApplies: true, countsTowardFamilyCap: true, ...extra,
})
const amountRules = (value: number, third: number | null = null, cap: number | null = null) =>
  parseFeeRules({ siblingDiscount: { type: 'amount', value, thirdPlusValue: third }, familyCap: cap })

section('No discount')
{
  const r = calculateFamilyFees({ lines: [line('a', 'A', 100), line('b', 'B', 100)], rules: parseFeeRules({}) })
  check('two children at $100 = $200', r.total === 200 && r.siblingDiscount === 0)
}

section('Sibling discount')
{
  const r = calculateFamilyFees({ lines: [line('a', 'A', 100), line('b', 'B', 100), line('c', 'C', 100)], rules: amountRules(25) })
  check('$25 off each additional child: 100 + 75 + 75 = 250', r.total === 250 && r.siblingDiscount === 50, r)
  const r2 = calculateFamilyFees({ lines: [line('a', 'A', 100), line('b', 'B', 100), line('c', 'C', 100)], rules: amountRules(25, 50) })
  check('different amount from the third child: 100 + 75 + 50 = 225', r2.total === 225, r2)
  const r3 = calculateFamilyFees({
    lines: [line('a', 'A', 100), line('b', 'B', 150)],
    rules: parseFeeRules({ siblingDiscount: { type: 'percent', value: 10 } }),
  })
  check('10% off: the most expensive child pays full (150 + 90 = 240)', r3.total === 240 && r3.lines.find(l => l.key === 'b')!.siblingDiscount === 0, r3)
  const r4 = calculateFamilyFees({ lines: [line('a', 'A', 20), line('b', 'B', 10)], rules: amountRules(25) })
  check('discount never goes below zero', r4.total === 20 && r4.lines.find(l => l.key === 'b')!.total === 0, r4)
}

section('Extra fees (books)')
{
  const books = [{ name: 'Books', amount: 30, siblingDiscount: false }]
  const r = calculateFamilyFees({
    lines: [line('a', 'A', 100, { feeItems: books }), line('b', 'B', 100, { feeItems: books })],
    rules: parseFeeRules({ siblingDiscount: { type: 'percent', value: 50 } }),
  })
  check('books are charged per child and not discounted: 130 + (50 + 30) = 210', r.total === 210 && r.subtotal === 260, r)
  const discountedBooks = [{ name: 'Books', amount: 30, siblingDiscount: true }]
  const r2 = calculateFamilyFees({
    lines: [line('a', 'A', 100, { feeItems: discountedBooks }), line('b', 'B', 100, { feeItems: discountedBooks })],
    rules: parseFeeRules({ siblingDiscount: { type: 'percent', value: 50 } }),
  })
  check('books marked discountable get the discount too: 130 + 65 = 195', r2.total === 195, r2)
}

section('Programs that opt out')
{
  const r = calculateFamilyFees({
    lines: [line('a', 'A', 100), line('b', 'B', 200, { siblingDiscountApplies: false })],
    rules: amountRules(25),
  })
  check('a program without the sibling discount: B isn’t discounted and doesn’t count as a sibling', r.total === 300, r)
}

section('Same child in two programs')
{
  const r = calculateFamilyFees({ lines: [line('a1', 'A', 100), line('a2', 'A', 50), line('b', 'B', 100)], rules: amountRules(25) })
  check('one child in two programs counts once: A pays 150, B gets $25 off', r.total === 225 && r.siblingDiscount === 25, r)
}

section('Earlier siblings this year')
{
  const r = calculateFamilyFees({ lines: [line('b', 'B', 100)], rules: amountRules(25), priorDiscountedChildren: 1 })
  check('second child registered later still gets the discount', r.total === 75, r)
  const r2 = calculateFamilyFees({ lines: [line('c', 'C', 100)], rules: amountRules(25, 50), priorDiscountedChildren: 2 })
  check('third child registered later gets the third-child amount', r2.total === 50, r2)
}

section('Family maximum')
{
  const r = calculateFamilyFees({ lines: [line('a', 'A', 100), line('b', 'B', 100), line('c', 'C', 100)], rules: amountRules(0, null, 250) })
  check('three at $100 capped at $250', r.total === 250 && r.familyCapAdjustment === 50, r)
  const r2 = calculateFamilyFees({ lines: [line('c', 'C', 100)], rules: amountRules(0, null, 250), priorChargesTowardCap: 200 })
  check('cap counts what the family already owes this year: only $50 more', r2.total === 50, r2)
  const r3 = calculateFamilyFees({ lines: [line('c', 'C', 100)], rules: amountRules(0, null, 250), priorChargesTowardCap: 300 })
  check('already over the cap: nothing more', r3.total === 0, r3)
  const r4 = calculateFamilyFees({
    lines: [line('a', 'A', 100), line('b', 'B', 100), line('r', 'C', 40, { countsTowardFamilyCap: false })],
    rules: amountRules(0, null, 150),
  })
  check('a program outside the cap is charged in full on top (150 + 40)', r4.total === 190, r4)
  const r5 = calculateFamilyFees({ lines: [line('a', 'A', 100), line('b', 'B', 100), line('c', 'C', 100)], rules: amountRules(25, null, 220) })
  check('discount first, then the cap (250 → 220)', r5.total === 220 && r5.siblingDiscount === 50 && r5.familyCapAdjustment === 30, r5)
}

section('Rounding')
{
  const r = calculateFamilyFees({ lines: [line('a', 'A', 33.33), line('b', 'B', 33.33), line('c', 'C', 33.33)], rules: amountRules(0, null, 50) })
  check('cap split in cents adds up exactly', r.total === 50 && Math.round(r.lines.reduce((s, l) => s + l.total, 0) * 100) === 5000, r)
  const r2 = calculateFamilyFees({ lines: [line('a', 'A', 0.1), line('b', 'B', 0.2)], rules: parseFeeRules({}) })
  check('no floating point drift (0.10 + 0.20 = 0.30)', r2.total === 0.3)
}

section('Parsing and description')
{
  const rules = parseFeeRules({ siblingDiscount: { type: 'percent', value: 150 }, familyCap: 0 })
  check('percent capped at 100, a $0 cap means no cap', rules.siblingDiscount.value === 100 && rules.familyCap === null)
  check('garbage becomes no discount', parseFeeRules('nope').siblingDiscount.type === 'none')
  check('plain-English summary', describeFeeRules(amountRules(25, 50, 300)) ===
    '$25 off the second child, $50 off each child after that; no family pays more than $300 per year', describeFeeRules(amountRules(25, 50, 300)))
}

finish()
