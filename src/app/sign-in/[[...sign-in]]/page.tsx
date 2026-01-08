'use client'

import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Building2, Users, Stethoscope, Shield } from 'lucide-react'

function SignInContent() {
  const searchParams = useSearchParams()
  const portal = searchParams.get('portal')

  // Determine redirect URL based on portal type
  // Staff portal redirects to /staff which then routes based on user role
  const redirectUrl = {
    'org-admin': '/dashboard/admin',
    'group-leader': '/dashboard/group-leader',
    'staff': '/staff',
    'master-admin': '/dashboard/master-admin',
  }[portal || ''] || '/dashboard/admin'

  // Get portal-specific header content
  const getPortalInfo = () => {
    switch (portal) {
      case 'org-admin':
        return {
          icon: Building2,
          title: 'Organization Admin Sign In',
          subtitle: 'Manage your events, registrations, and settings',
        }
      case 'group-leader':
        return {
          icon: Users,
          title: 'Group Leader Sign In',
          subtitle: 'Manage your group registration and participants',
        }
      case 'staff':
        return {
          icon: Stethoscope,
          title: 'Staff Portal Sign In',
          subtitle: 'Access Rapha Medical or SALVE Check-In portals',
        }
      case 'master-admin':
        return {
          icon: Shield,
          title: 'Master Admin Sign In',
          subtitle: 'ChiRho platform administration',
        }
      default:
        return {
          icon: null,
          title: 'Welcome Back',
          subtitle: 'Sign in to your ChiRho Events account',
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
        <SignIn
          afterSignInUrl={redirectUrl}
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
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
