/**
 * Clerk session token verification
 *
 * The auth fallbacks in src/lib/jwt-auth-helper.ts used to base64-decode a
 * bearer token and trust its `sub` without checking the signature, so anyone
 * could act as any user whose Clerk ID they knew. This checks that only
 * tokens signed by Clerk's key are accepted now.
 *
 * Signs tokens with a throwaway RSA key and hands its public half to Clerk's
 * verifier through CLERK_JWT_KEY, so no network or Clerk account is needed.
 *
 * Run: npx tsx tests/security/verify-clerk-token.test.ts
 */

import { generateKeyPairSync, createSign } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const { privateKey: attackerKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
process.env.CLERK_JWT_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString()
delete process.env.CLERK_SECRET_KEY

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url')

function sign(payload: Record<string, unknown>, key = privateKey, alg = 'RS256'): string {
  const header = b64url(JSON.stringify({ alg, typ: 'JWT', kid: 'test' }))
  const body = b64url(JSON.stringify(payload))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${body}`)
  return `${header}.${body}.${b64url(signer.sign(key))}`
}

const now = Math.floor(Date.now() / 1000)
const session = { sub: 'user_victim', sid: 'sess_123', iat: now, nbf: now - 5, exp: now + 60, iss: 'https://clerk.example.com' }

let failures = 0
function check(name: string, ok: boolean) {
  if (ok) console.log(`    ✅ ${name}`)
  else { console.error(`    ❌ ${name}`); failures++ }
}

async function main() {
  const { verifyClerkSessionToken } = await import('../../src/lib/jwt-auth-helper')

  console.log('\n  Clerk session token verification')

  check('accepts a token signed by Clerk', (await verifyClerkSessionToken(sign(session))) === 'user_victim')

  const unsigned = `${b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${b64url(JSON.stringify(session))}.`
  check('rejects an unsigned token', (await verifyClerkSessionToken(unsigned)) === null)

  const garbageSig = sign(session).replace(/\.[^.]+$/, '.' + b64url('not-a-signature'))
  check('rejects a token with a made-up signature', (await verifyClerkSessionToken(garbageSig)) === null)

  check('rejects a token signed with someone else\'s key', (await verifyClerkSessionToken(sign(session, attackerKey))) === null)

  const [h, , s] = sign(session).split('.')
  const swapped = `${h}.${b64url(JSON.stringify({ ...session, sub: 'user_master_admin' }))}.${s}`
  check('rejects a genuine token whose user ID was swapped', (await verifyClerkSessionToken(swapped)) === null)

  check('rejects a token expired well past the clock-skew allowance',
    (await verifyClerkSessionToken(sign({ ...session, iat: now - 3600, nbf: now - 3600, exp: now - 1800 }))) === null)

  check('accepts a token expired within the clock-skew allowance',
    (await verifyClerkSessionToken(sign({ ...session, exp: now - 30 }))) === 'user_victim')

  const { sid: _sid, ...noSession } = session
  check('rejects a Clerk-signed token that is not a session token (no sid)', (await verifyClerkSessionToken(sign(noSession))) === null)

  check('rejects junk', (await verifyClerkSessionToken('not.a.jwt')) === null)

  // No route may decode a token without verifying it again
  console.log('\n  No unverified token decoding left in src/')
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) {
        const src = fs.readFileSync(full, 'utf-8')
        if (/decodeJwtPayload|Buffer\.from\(parts\[1\]/.test(src)) offenders.push(path.relative(process.cwd(), full))
      }
    }
  }
  walk(path.resolve(__dirname, '../../src'))
  check(`no hand-rolled JWT decoding${offenders.length ? ` (found in ${offenders.join(', ')})` : ''}`, offenders.length === 0)

  const authUtils = fs.readFileSync(path.resolve(__dirname, '../../src/lib/auth-utils.ts'), 'utf-8')
  check('getCurrentUser prefers the verified Clerk session over the override', /sessionUserId \?\? overrideUserId/.test(authUtils))

  console.log(failures ? `\n  ${failures} check(s) failed\n` : '\n  All checks passed\n')
  process.exit(failures ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
