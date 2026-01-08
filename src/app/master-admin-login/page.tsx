import { redirect } from 'next/navigation'

export default function MasterAdminLoginRedirect() {
  redirect('/sign-in?portal=master-admin')
}
