/**
 * Minimal test runner (no external dependencies).
 * Uses Node.js assert module for assertions.
 */

import assert from 'assert'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

interface SuiteResult {
  suiteName: string
  total: number
  passed: number
  failed: number
  results: TestResult[]
}

let currentSuite: SuiteResult | null = null
const allSuites: SuiteResult[] = []

export function describe(suiteName: string, fn: () => void | Promise<void>): void {
  currentSuite = {
    suiteName,
    total: 0,
    passed: 0,
    failed: 0,
    results: [],
  }
  allSuites.push(currentSuite)
  // fn() is called synchronously — async tests need to be tracked differently
  fn()
}

export async function it(testName: string, fn: () => void | Promise<void>): Promise<void> {
  if (!currentSuite) throw new Error('it() called outside describe()')
  const suite = currentSuite
  suite.total++

  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    suite.passed++
    suite.results.push({ name: testName, passed: true, duration })
    process.stdout.write(`  ✓ ${testName}\n`)
  } catch (err: unknown) {
    const duration = Date.now() - start
    suite.failed++
    const errorMsg = err instanceof Error ? err.message : String(err)
    suite.results.push({ name: testName, passed: false, error: errorMsg, duration })
    process.stdout.write(`  ✗ ${testName}\n    → ${errorMsg}\n`)
  }
}

export function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(value, expected, `Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`)
    },
    toEqual(expected: unknown) {
      assert.deepStrictEqual(value, expected)
    },
    toBeTruthy() {
      assert.ok(value, `Expected ${JSON.stringify(value)} to be truthy`)
    },
    toBeFalsy() {
      assert.ok(!value, `Expected ${JSON.stringify(value)} to be falsy`)
    },
    toBeNull() {
      assert.strictEqual(value, null, `Expected value to be null, got ${JSON.stringify(value)}`)
    },
    toBeUndefined() {
      assert.strictEqual(value, undefined, `Expected value to be undefined, got ${JSON.stringify(value)}`)
    },
    not: {
      toBe(expected: unknown) {
        assert.notStrictEqual(value, expected, `Expected ${JSON.stringify(value)} NOT to be ${JSON.stringify(expected)}`)
      },
      toBeNull() {
        assert.notStrictEqual(value, null, `Expected value NOT to be null`)
      },
      toBeUndefined() {
        assert.notStrictEqual(value, undefined, `Expected value NOT to be undefined`)
      },
      toContain(substr: unknown) {
        if (typeof value === 'string' && typeof substr === 'string') {
          assert.ok(!value.includes(substr), `Expected "${value}" NOT to contain "${substr}"`)
        } else if (Array.isArray(value)) {
          assert.ok(!value.includes(substr), `Expected array NOT to contain ${JSON.stringify(substr)}`)
        } else {
          throw new Error(`not.toContain() called on non-string/non-array: ${typeof value}`)
        }
      },
    },
    toContain(substr: unknown) {
      if (typeof value === 'string' && typeof substr === 'string') {
        assert.ok(value.includes(substr), `Expected "${value}" to contain "${substr}"`)
      } else if (Array.isArray(value)) {
        assert.ok(value.includes(substr), `Expected array to contain ${JSON.stringify(substr)}`)
      } else {
        throw new Error(`toContain() called on non-string/non-array: ${typeof value}`)
      }
    },
    toThrow() {
      if (typeof value !== 'function') throw new Error('toThrow() requires a function')
      assert.throws(value as () => void)
    },
    toBeGreaterThan(n: number) {
      assert.ok((value as number) > n, `Expected ${value} to be greater than ${n}`)
    },
    toBeLessThanOrEqual(n: number) {
      assert.ok((value as number) <= n, `Expected ${value} to be <= ${n}`)
    },
    toBeInstanceOf(cls: unknown) {
      assert.ok(value instanceof (cls as new (...args: unknown[]) => unknown), `Expected value to be instance of ${(cls as { name?: string }).name}`)
    },
  }
}

export function printSummary(): void {
  console.log('\n' + '='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))

  let totalPassed = 0
  let totalFailed = 0

  for (const suite of allSuites) {
    const icon = suite.failed === 0 ? '✓' : '✗'
    console.log(`\n${icon} ${suite.suiteName}: ${suite.passed}/${suite.total} passed`)
    for (const r of suite.results) {
      if (!r.passed) {
        console.log(`    ✗ ${r.name}`)
        console.log(`      Error: ${r.error}`)
      }
    }
    totalPassed += suite.passed
    totalFailed += suite.failed
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`)
  console.log('='.repeat(60))

  if (totalFailed > 0) {
    process.exit(1)
  }
}
