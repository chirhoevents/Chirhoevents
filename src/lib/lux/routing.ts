/**
 * Which dashboard an org staff member lands on after signing in.
 *
 *   - Org without Lux: the Events portal, as before.
 *   - Lux-only org (Chapel/Parish plans): always Lux.
 *   - Org with both: whichever one this person used last (Events the first time).
 *
 * Master admins, coordinators and group leaders aren't affected (null): they
 * keep their existing role-based routing.
 */

export type DashboardKey = 'events' | 'lux'

// Org roles that can use the Lux dashboard. Event-volunteer roles (SALVE /
// Rapha / Poros coordinators) and group leaders never see Lux or its
// families' documents.
export const LUX_STAFF_ROLES = ['org_admin', 'event_manager', 'finance_manager', 'staff'] as const

export function isLuxStaffRole(role: string): boolean {
  return (LUX_STAFF_ROLES as readonly string[]).includes(role)
}

export function resolveLandingDashboard(input: {
  role: string
  modules: { lux: boolean; events: boolean }
  lastDashboard?: string | null
}): DashboardKey | null {
  if (!isLuxStaffRole(input.role)) return null
  if (!input.modules.lux) return 'events'
  if (!input.modules.events) return 'lux'
  return input.lastDashboard === 'lux' ? 'lux' : 'events'
}
