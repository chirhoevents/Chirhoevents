import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Stethoscope, ClipboardCheck, ArrowRight, Monitor } from 'lucide-react'

export default async function StaffPortalPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?portal=staff')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      role: true,
      firstName: true,
      lastName: true,
    },
  })

  if (!user) {
    redirect('/sign-in?portal=staff')
  }

  // Check permissions based on role
  const hasRaphaAccess = [
    'master_admin',
    'org_admin',
    'rapha_coordinator',
    'rapha_user',
  ].includes(user.role)

  const hasSalveAccess = [
    'master_admin',
    'org_admin',
    'event_manager',
    'salve_coordinator',
    'salve_user',
  ].includes(user.role)

  // If user only has access to one portal, redirect directly
  if (hasRaphaAccess && !hasSalveAccess) {
    redirect('/dashboard/admin/rapha')
  }

  if (hasSalveAccess && !hasRaphaAccess) {
    redirect('/dashboard/admin/salve')
  }

  // If no access to either, show access denied
  if (!hasRaphaAccess && !hasSalveAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <div className="text-center bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access staff portals. Please contact your organization administrator.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#1E3A5F] text-white px-6 py-2 rounded-lg hover:bg-[#2A4A6F] transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  // User has access to both portals, show selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {user.firstName}!
          </h1>
          <p className="text-xl text-[#E8DCC8]">
            Select the portal you need to access
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Rapha Medical Portal */}
          {hasRaphaAccess && (
            <Link
              href="/dashboard/admin/rapha"
              className="bg-white rounded-lg shadow-lg p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition">
                  <Stethoscope className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">
                  Rapha Medical
                </h2>
                <p className="text-gray-600 mb-4">
                  Access participant medical information and manage health incidents
                </p>
                <div className="text-[#9C8466] font-semibold flex items-center justify-center gap-2">
                  Open Portal <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}

          {/* SALVE Check-In Portal */}
          {hasSalveAccess && (
            <Link
              href="/dashboard/admin/salve"
              className="bg-white rounded-lg shadow-lg p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-200 transition">
                  <ClipboardCheck className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">
                  SALVE Check-In
                </h2>
                <p className="text-gray-600 mb-4">
                  Check in participants, scan QR codes, and print welcome packets
                </p>
                <div className="text-[#9C8466] font-semibold flex items-center justify-center gap-2">
                  Open Portal <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Device tip */}
        <div className="mt-12 bg-white/10 border border-white/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Monitor className="h-6 w-6 text-[#E8DCC8] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">
                Using a Mobile Device?
              </h3>
              <p className="text-[#E8DCC8] text-sm">
                For the best experience, use a tablet or desktop computer.
                The portals are optimized for larger screens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
