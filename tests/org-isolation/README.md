# Organization Isolation Tests

This directory contains tests verifying that ChiRho Events properly isolates
organizations from each other — especially around payments, group registration,
the group leader portal, and reporting.

## Test Files

| File | Tests |
|------|-------|
| `01-data-model.test.ts` | Schema-level checks — confirms `organizationId` presence on all critical tables |
| `02-auth-layer.test.ts` | Unit tests for `verifyEventAccess`, `verifyAdminAccess`, `canAccessOrganization` |
| `03-payment-isolation.test.ts` | Stripe account routing — confirms each payment goes to the correct org's account |
| `04-api-endpoint-isolation.test.ts` | Integration-style tests for admin API routes (cross-org access attempts) |
| `05-group-leader-isolation.test.ts` | Group leader portal isolation — leaders can only see their own data |
| `06-debug-endpoint-vulnerability.test.ts` | **Critical**: Verifies the debug payments endpoint vulnerability |
| `helpers/mock-factories.ts` | Factory functions for creating test orgs, events, registrations, users |

## Running the Tests

These tests require a test database. Set the `DATABASE_URL` environment variable
to a test PostgreSQL instance before running.

```bash
# Set up test environment
cp .env.local.example .env.test
# Edit .env.test with test database credentials

# Run all isolation tests
npx tsx tests/org-isolation/run-all.ts

# Run a specific test file
npx tsx tests/org-isolation/01-data-model.test.ts
```

## Test Architecture

Tests use a **real Prisma client** against a test database to ensure actual
database isolation is verified (not just mocked). Each test file:

1. Seeds two test organizations (Org A and Org B) with events and registrations
2. Attempts cross-org access patterns
3. Verifies that cross-org access is properly blocked
4. Cleans up test data

## Critical Test: Debug Endpoint Vulnerability

`06-debug-endpoint-vulnerability.test.ts` documents the currently-unfixed
vulnerability in `/api/admin/debug/payments/[registrationId]`. The test
demonstrates that:

1. A group leader (non-admin) can call this endpoint
2. They receive payment data for registrations belonging to other organizations
3. Access codes (which appear in confirmation emails) are sufficient to look up cross-org payment data

This test is expected to **FAIL** (proving the vulnerability) until the
endpoint is fixed to add admin role and org membership checks.
