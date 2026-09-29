import { redirect } from 'next/navigation'

// Check-in only happens in the dedicated SALVE portal. This route used to host
// a second check-in screen inside the admin dashboard; it now forwards to the
// portal so old links and bookmarks keep working.
export default async function SalveCheckInRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>
  searchParams: Promise<{ groupId?: string }>
}) {
  const { eventId } = await params
  const { groupId } = await searchParams
  redirect(`/portal/salve/${eventId}${groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''}`)
}
