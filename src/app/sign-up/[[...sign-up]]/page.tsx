'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Building2, Users, Stethoscope, Shield, ClipboardCheck } from 'lucide-react'

function SignUpContent() {
  const searchParams = useSearchParams()
  const portal = searchParams.get('portal')

  // Determine redirect URL based on portal type
  const redirectUrl = {
    'org-admin': '/dashboard/admin',
    'group-leader': '/dashboard/group-leader',
    'rapha': '/dashboard/admin/rapha',
    'salve': '/dashboard/admin/salve',
    'master-admin': '/dashboard/master-admin',
  }[portal || ''] || '/dashboard/admin'

  // Get portal-specific header content
  const getPortalInfo = () => {
    switch (portal) {
      case 'org-admin':
        return {
          icon: Building2,
          title: 'Create Admin Account',
          subtitle: 'Set up your organization on ChiRho Events',
        }
      case 'group-leader':
        return {
          icon: Users,
          title: 'Create Group Leader Account',
          subtitle: 'Start managing your group registration',
        }
      case 'rapha':
        return {
          icon: Stethoscope,
          title: 'Create Rapha Account',
          subtitle: 'Get access to medical information portal',
        }
      case 'salve':
        return {
          icon: ClipboardCheck,
          title: 'Create SALVE Account',
          subtitle: 'Get access to check-in portal',
        }
      case 'master-admin':
        return {
          icon: Shield,
          title: 'Master Admin Account',
          subtitle: 'ChiRho platform administration',
        }
      default:
        return {
          icon: null,
          title: 'Create Account',
          subtitle: 'Join ChiRho Events and manage your group',
        }
    }
  }

  const portalInfo = getPortalInfo()
  const IconComponent = portalInfo.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          {IconComponent && (
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconComponent className="h-8 w-8 text-[#E8DCC8]" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">{portalInfo.title}</h1>
          <p className="text-[#E8DCC8]">{portalInfo.subtitle}</p>
        </div>
        <SignUp
          forceRedirectUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-white border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#F5F1E8]",
              formButtonPrimary: "bg-[#9C8466] hover:bg-[#8B7355] text-[#1E3A5F]",
              formFieldInput: "border-[#D1D5DB] focus:border-[#9C8466] focus:ring-[#9C8466]",
              footerActionLink: "text-[#9C8466] hover:text-[#8B7355]"
            }
          }}
        />

        {/* Portal-specific notes */}
        {portal === 'group-leader' && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              <strong>Note:</strong> You&apos;ll need your group access code after signing up.
              Check your registration confirmation email.
            </p>
          </div>
        )}

        {(portal === 'rapha' || portal === 'salve') && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Staff accounts:</strong> Your role and portal access will be configured
              by your organization administrator after sign up.
            </p>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-[#E8DCC8]">
          <p>
            Already have an account?{' '}
            <a
              href={portal ? `/sign-in?portal=${portal}` : '/sign-in'}
              className="text-white hover:underline font-semibold"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}
