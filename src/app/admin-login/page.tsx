import { redirect } from 'next/navigation'

export default function AdminLoginRedirect() {
  redirect('/sign-in?portal=org-admin')
}
