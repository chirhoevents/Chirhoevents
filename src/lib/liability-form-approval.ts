// Youth-under-18 liability forms never go through an admin approve/deny step —
// the parent's signature (tracked separately as "waiting on parent") is the
// only sign-off they need. Their `formStatus` still defaults to 'pending' in
// the database since nothing ever advances it, so any "needs admin review"
// count must exclude them explicitly or it double-counts completed forms as
// outstanding work.
export function liabilityFormNeedsApproval(
  participantType: string | null | undefined,
  participantAge: number | null | undefined
): boolean {
  if (participantType === 'youth' || participantType === 'youth_u18') return false
  if (participantAge !== null && participantAge !== undefined && participantAge < 18) return false
  return true
}
