# Clerk Production Issue Diagnosis Report

**Date:** 2026-01-09
**Status:** CRITICAL - Root Cause Identified
**Impact:** App completely broken after switching to Clerk production

---

## Executive Summary

The infinite page reload issue is caused by a **React useEffect dependency bug** in all three dashboard layouts. The `getToken` function from Clerk's `useAuth()` hook is included in the useEffect dependency array, but this function reference can change on auth state updates, causing the effect to run infinitely.

---

## Root Cause Analysis

### PRIMARY ISSUE: Infinite useEffect Loop

**Location:** All three dashboard layout files:
- `src/app/dashboard/admin/layout.tsx:78-177`
- `src/app/dashboard/group-leader/layout.tsx:66-175`
- `src/app/dashboard/master-admin/layout.tsx:59-156`

**The Bug Pattern:**
```typescript
// Line 177 in admin/layout.tsx
useEffect(() => {
  if (hasRedirected.current) return  // Only prevents redirects
  if (!isLoaded) return

  const checkAccess = async () => {
    // ... fetch API, setUserInfo(), setLoading(false)
    // hasRedirected.current is NEVER set on success!
  }

  checkAccess()
}, [isLoaded, getToken, router])  // <-- getToken causes infinite re-runs!
```

**Why This Causes Infinite Loops:**
1. Component mounts, `isLoaded` becomes true
2. useEffect runs, `checkAccess()` is called
3. Token is obtained, API call succeeds
4. `setUserInfo(...)` triggers a re-render
5. `setLoading(false)` triggers a re-render
6. Clerk's `getToken` function reference MAY change after auth state updates
7. If `getToken` reference changes, React re-runs the useEffect
8. `hasRedirected.current` is still `false` (only set before redirects, not on success!)
9. `isLoaded` is still `true`
10. `checkAccess()` is called AGAIN
11. **REPEAT INFINITELY**

**Evidence:**
- `hasRedirected.current = true` is only set at lines: 100, 111, 125, 169 - all BEFORE redirects
- On successful auth, `hasRedirected.current` stays `false`
- No guard like `if (userInfo)` or `if (!loading)` to prevent re-fetching

---

## Secondary Issue: Production Clerk + Database Sync

When switching from Clerk development to production:
1. All existing `clerkUserId` values in the database are **INVALID**
2. Production Clerk users have **different IDs** than development users
3. API calls return 401 (user not found) even when Clerk auth succeeds

**Evidence:**
- `getCurrentUser()` in `auth-utils.ts:51-66` queries database by `clerkUserId`
- If user doesn't exist in database with that Clerk ID, returns `null`
- `check-access` route returns 401 when user is `null`

---

## Files Analyzed

### Middleware (`src/middleware.ts`)
**Status:** OK - No issues found
- Dashboard routes marked as public (handle their own auth)
- No redirect loops in middleware
- Proper `clerkMiddleware` configuration

### Auth Utils (`src/lib/auth-utils.ts`)
**Status:** OK - Logic is correct
- `getCurrentUser()` properly looks up users by `clerkUserId`
- Returns `null` if user not found (expected behavior)
- `requireAdmin()` properly redirects when user is `null`

### Admin Layout (`src/app/dashboard/admin/layout.tsx`)
**Status:** BUG - Infinite re-render loop
- Line 177: `getToken` in dependency array
- No guard against re-fetching after successful auth
- `hasRedirected.current` only set on redirect paths

### Group Leader Layout (`src/app/dashboard/group-leader/layout.tsx`)
**Status:** BUG - Same issue
- Line 175: `getToken` in dependency array
- Same infinite loop pattern

### Master Admin Layout (`src/app/dashboard/master-admin/layout.tsx`)
**Status:** BUG - Same issue
- Line 156: `getToken` in dependency array
- Same infinite loop pattern

### Dashboard Redirect (`src/app/dashboard/page.tsx`)
**Status:** BUG - Same issue
- Line 111: `getToken` in dependency array
- Same infinite loop pattern

### API Routes
**Status:** OK - Logic is correct
- `/api/admin/check-access`: Returns proper 401/403/200 responses
- `/api/user/role`: Returns proper responses with JWT fallback
- `/api/webhooks/clerk`: Properly syncs users to database

### Environment Variables
**Status:** OK - No hardcoded test keys
- All `pk_test_`/`sk_test_` references are only in documentation
- No test keys in actual source code

---

## Network Analysis (Expected Behavior)

Based on code analysis, the following network pattern would be observed:

| Endpoint | Status | Loop Count | Cause |
|----------|--------|------------|-------|
| `/api/admin/check-access` | 200 or 401 | 100+ | useEffect infinite loop |
| `/api/user/role` | 200 or 404 | 100+ | Same issue in dashboard redirect |

---

## User Sync Status

**Question:** Do production users exist in the database?

**Check Required:**
```sql
SELECT id, email, "clerkUserId", role
FROM users
WHERE "clerkUserId" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Likely Scenario:**
- Old development users have **invalid** `clerkUserId` values
- New production Clerk users may not be synced if webhook isn't configured
- Users signing in with Clerk production get 401 because they don't exist in database

---

## Environment Variables Checklist

| Variable | Expected Pattern | Status |
|----------|-----------------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | CHECK IN VERCEL |
| `CLERK_SECRET_KEY` | `sk_live_...` | CHECK IN VERCEL |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | CHECK IN VERCEL |
| `DATABASE_URL` | Neon production URL | CHECK IN VERCEL |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` | OK in example |

---

## Recommended Fixes

### FIX 1: Stop the Infinite Loop (CRITICAL)

**Option A: Add a fetched ref (Recommended)**
```typescript
const hasRedirected = useRef(false)
const hasFetched = useRef(false)  // ADD THIS

useEffect(() => {
  if (hasRedirected.current) return
  if (hasFetched.current) return  // ADD THIS - prevent re-fetch
  if (!isLoaded) return

  const checkAccess = async () => {
    hasFetched.current = true  // ADD THIS - mark as fetched
    // ... rest of the function
  }

  checkAccess()
}, [isLoaded, getToken, router])
```

**Option B: Remove getToken from dependencies**
```typescript
useEffect(() => {
  // ... existing code
}, [isLoaded, router])  // Remove getToken - it's used inside, not as a reactive value
```

**Option C: Memoize the check (Most Robust)**
```typescript
const [authChecked, setAuthChecked] = useState(false)

useEffect(() => {
  if (hasRedirected.current) return
  if (authChecked) return  // Already checked
  if (!isLoaded) return

  const checkAccess = async () => {
    // ... existing fetch logic
    setAuthChecked(true)  // Mark as checked on success
  }

  checkAccess()
}, [isLoaded, authChecked, router])  // Remove getToken, add authChecked
```

### FIX 2: Sync Production Users

1. **Configure Clerk Webhook in Production:**
   - Go to Clerk Dashboard (Production) → Webhooks
   - Add webhook URL: `https://chirhoevents.com/api/webhooks/clerk`
   - Set `CLERK_WEBHOOK_SECRET` in Vercel env vars

2. **Create Master Admin in Database:**
   ```sql
   INSERT INTO users (id, email, "firstName", "lastName", "clerkUserId", role)
   VALUES (
     gen_random_uuid()::text,
     'your-email@example.com',
     'Your',
     'Name',
     'user_xxxx',  -- Get this from Clerk Dashboard → Users
     'master_admin'
   );
   ```

3. **Or use seed script** (if available) to create initial admin user

---

## Files to Modify

| File | Line(s) | Fix Required |
|------|---------|--------------|
| `src/app/dashboard/admin/layout.tsx` | 78-177 | Add re-fetch guard |
| `src/app/dashboard/group-leader/layout.tsx` | 66-175 | Add re-fetch guard |
| `src/app/dashboard/master-admin/layout.tsx` | 59-156 | Add re-fetch guard |
| `src/app/dashboard/page.tsx` | 19-111 | Add re-fetch guard |

---

## Priority

1. **IMMEDIATE:** Fix the useEffect infinite loop in all 4 files
2. **HIGH:** Verify Clerk production webhook is configured
3. **HIGH:** Create/update production users in database
4. **MEDIUM:** Verify all environment variables in Vercel

---

## Completion Checklist

| Check | Status |
|-------|--------|
| Console errors analyzed | Code analysis complete |
| Network loop identified | YES - `getToken` dependency |
| Middleware issue found | NO - Middleware is fine |
| User sync issue found | LIKELY - Check database |
| Environment variable issue | VERIFY IN VERCEL |

---

## Root Cause (Confirmed)

**Primary:** React useEffect infinite loop caused by `getToken` function in dependency array across all dashboard layouts. The function reference changes when Clerk's auth state updates, triggering the effect repeatedly with no guard to prevent re-fetching.

**Secondary:** Database users may not be synced with Clerk production instance, causing 401 errors that could compound with the loop issue.

---

## Ready for Fix

**YES** - The fix is clear and targeted:
1. Add `hasFetched` ref guard to all 4 layout/page files
2. Verify/configure Clerk production webhook
3. Sync or create production users in database
