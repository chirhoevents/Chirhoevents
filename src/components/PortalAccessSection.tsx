import Link from 'next/link'
import { FileText, Users, Building2 } from 'lucide-react'

interface PortalAccessSectionProps {
  /**
   * 'full' — prominent treatment for the marketing landing page.
   * 'compact' — small footer-style row for event registration pages,
   * tuned not to compete with the registration CTA.
   */
  variant?: 'full' | 'compact'
}

export function PortalAccessSection({ variant = 'full' }: PortalAccessSectionProps) {
  if (variant === 'compact') {
    return (
      <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
        <p className="text-center text-[11px] sm:text-sm text-[#6B7280] mb-2 sm:mb-3">
          Already registered? Find your portal:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Link
            href="/poros"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-sm font-medium text-[#1E3A5F] bg-white border border-[#D1D5DB] rounded-md hover:border-[#1E3A5F] hover:bg-[#F5F1E8] transition-colors"
          >
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            Liability Form
          </Link>
          <Link
            href="/sign-in?portal=group-leader"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-sm font-medium text-[#1E3A5F] bg-white border border-[#D1D5DB] rounded-md hover:border-[#1E3A5F] hover:bg-[#F5F1E8] transition-colors"
          >
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            Group Leader Log In
          </Link>
          <Link
            href="/sign-in?portal=org-admin"
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-[#6B7280] hover:text-[#1E3A5F] hover:underline transition-colors"
          >
            <Building2 className="h-3 w-3" />
            Organization Log In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-3">
        In the Right Place? Find Your Portal
      </h2>
      <p className="text-gray-600 mb-8 text-base sm:text-lg max-w-2xl mx-auto">
        Already registered for an event? Jump straight to your liability form
        or your group leader dashboard.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-6">
        <Link href="/poros" className="block group">
          <div className="bg-white border-2 border-gold rounded-lg p-6 sm:p-8 h-full flex flex-col items-center justify-center shadow-sm group-hover:shadow-lg group-hover:bg-gold-50 transition-all">
            <div className="bg-gold/15 group-hover:bg-gold/25 rounded-full p-4 mb-4 transition-colors">
              <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-gold-700" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-navy mb-1">
              Liability Form
            </h3>
            <p className="text-sm text-gray-600">
              Complete your POROS liability form
            </p>
          </div>
        </Link>
        <Link href="/sign-in?portal=group-leader" className="block group">
          <div className="bg-white border-2 border-navy rounded-lg p-6 sm:p-8 h-full flex flex-col items-center justify-center shadow-sm group-hover:shadow-lg group-hover:bg-navy-50 transition-all">
            <div className="bg-navy/10 group-hover:bg-navy/20 rounded-full p-4 mb-4 transition-colors">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-navy" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-navy mb-1">
              Group Leader Log In
            </h3>
            <p className="text-sm text-gray-600">
              Manage your group registration
            </p>
          </div>
        </Link>
      </div>
      <Link
        href="/sign-in?portal=org-admin"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-navy transition-colors underline-offset-4 hover:underline"
      >
        <Building2 className="h-4 w-4" />
        Organization Admin? Log in here
      </Link>
    </div>
  )
}
