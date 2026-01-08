import { redirect } from 'next/navigation'

export default function GroupLeaderLoginRedirect() {
  redirect('/sign-in?portal=group-leader')
}
