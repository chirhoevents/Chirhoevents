import { redirect } from 'next/navigation'

export default function StaffLoginRedirect() {
  redirect('/sign-in?portal=staff')
}
