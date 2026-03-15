/**
 * Simple test runner for org-isolation tests.
 * Uses no external test framework — runs with tsx directly.
 */

export interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

export interface TestSuite {
  name: string
  results: TestResult[]
  passed: number
  failed: number
  duration: number
}

let currentSuite: TestSuite | null = null
const allSuites: TestSuite[] = []

export function describe(name: string, fn: () => void | Promise<void>): void {
  currentSuite = { name, results: [], passed: 0, failed: 0, duration: 0 }
  allSuites.push(currentSuite)
  const start = Date.now()
  Promise.resolve(fn()).then(() => {
    if (currentSuite) currentSuite.duration = Date.now() - start
  })
}

export async function it(name: string, fn: () => void | Promise<void>): Promise<void> {
  const suite = currentSuite
  if (!suite) throw new Error('it() called outside describe()')
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    suite.results.push({ name, passed: true, duration })
    suite.passed++
    process.stdout.write(`  ✅ ${name}\n`)
  } catch (err: any) {
    const duration = Date.now() - start
    const error = err?.message || String(err)
    suite.results.push({ name, passed: false, error, duration })
    suite.failed++
    process.stdout.write(`  ❌ ${name}\n     ${error}\n`)
  }
}

export function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`)
    },
    toBeFalsy: () => {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`)
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`)
    },
    not: {
      toBe: (expected: any) => {
        if (actual === expected) throw new Error(`Expected not ${JSON.stringify(expected)}, got same`)
      },
      toContain: (expected: any) => {
        if (typeof actual === 'string' && actual.includes(expected)) {
          throw new Error(`Expected string not to contain "${expected}", but it did: ${actual}`)
        }
        if (Array.isArray(actual) && actual.includes(expected)) {
          throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`)
        }
      },
    },
    toContain: (expected: any) => {
      if (typeof actual === 'string' && !actual.includes(expected)) {
        throw new Error(`Expected string to contain "${expected}", got: ${actual}`)
      }
      if (Array.isArray(actual) && !actual.includes(expected)) {
        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`)
      }
    },
    toBeGreaterThan: (n: number) => {
      if (actual <= n) throw new Error(`Expected ${actual} > ${n}`)
    },
    toBeLessThan: (n: number) => {
      if (actual >= n) throw new Error(`Expected ${actual} < ${n}`)
    },
  }
}

export function printSummary(): void {
  let totalPassed = 0
  let totalFailed = 0

  console.log('\n' + '═'.repeat(60))
  console.log('TEST SUMMARY')
  console.log('═'.repeat(60))

  for (const suite of allSuites) {
    const status = suite.failed === 0 ? '✅' : '❌'
    console.log(`\n${status} ${suite.name} (${suite.passed}/${suite.passed + suite.failed})`)
    totalPassed += suite.passed
    totalFailed += suite.failed
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`Total: ${totalPassed + totalFailed} tests | ✅ ${totalPassed} passed | ❌ ${totalFailed} failed`)
  console.log('═'.repeat(60) + '\n')

  if (totalFailed > 0) process.exit(1)
}
