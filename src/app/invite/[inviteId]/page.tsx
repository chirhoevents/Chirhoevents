'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth, SignUp, SignIn, useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Building2, Mail, User, ShieldCheck, Crown } from 'lucide-react'

interface InviteDetails {
  firstName: string
  lastName: string
  email: string
  organizationName: string
  role: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { user } = useUser()
  const inviteId = params.inviteId as string

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/invites/accept?inviteId=${inviteId}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invitation')
          return
        }

        setInviteDetails(data.invite)
      } catch (err) {
        console.error('Error fetching invite:', err)
        setError('Failed to load invitation')
      } finally {
        setIsLoading(false)
      }
    }

    if (inviteId) {
      fetchInvite()
    }
  }, [inviteId])

  // Accept invite when signed in
  useEffect(() => {
    async function acceptInvite() {
      if (!isSignedIn || !authLoaded || !inviteDetails || accepted || isAccepting) return

      setIsAccepting(true)
      try {
        const response = await fetch('/api/invites/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to accept invitation')
          return
        }

        setAccepted(true)
        // Redirect to homepage after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } catch (err) {
        console.error('Error accepting invite:', err)
        setError('Failed to accept invitation')
      } finally {
        setIsAccepting(false)
      }
    }

    acceptInvite()
  }, [isSignedIn, authLoaded, inviteDetails, accepted, isAccepting, inviteId, router])

  if (isLoading || !authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => router.push('/')}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Welcome!</CardTitle>
            <CardDescription>
              Your account has been linked to {inviteDetails?.organizationName}.
              Redirecting to homepage...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#1E3A5F]" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isAccepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F] mb-4" />
            <p className="text-gray-600">Setting up your account...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOrgAdmin = inviteDetails?.role === 'org_admin'

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      org_admin: 'Organization Administrator',
      event_manager: 'Event Manager',
      finance_manager: 'Finance Manager',
      poros_coordinator: 'Poros Coordinator',
      salve_coordinator: 'SALVE Coordinator',
      rapha_coordinator: 'Rapha Coordinator',
      staff: 'Staff / Viewer',
    }
    return roleNames[role] || role
  }

  // Show invite details and sign up form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F] py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Invite Details Card */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-2">
            {isOrgAdmin ? (
              <>
                <div className="mx-auto mb-3 p-3 bg-[#F5F1E8] rounded-full w-fit">
                  <Crown className="h-8 w-8 text-[#9C8466]" />
                </div>
                <CardTitle className="text-[#1E3A5F]">Welcome to ChiRho Events!</CardTitle>
                <CardDescription>
                  Your organization <strong>{inviteDetails?.organizationName}</strong> has been set up.
                  Create your account to start managing events!
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-[#1E3A5F]">You&apos;ve Been Invited!</CardTitle>
                <CardDescription>
                  Join {inviteDetails?.organizationName} on ChiRho Events
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="h-5 w-5 text-[#9C8466]" />
              <div>
                <p className="text-xs text-gray-500">Organization</p>
                <p className="font-medium text-[#1E3A5F]">{inviteDetails?.organizationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-[#9C8466]" />
              <div>
                <p className="text-xs text-gray-500">Your Name</p>
                <p className="font-medium text-[#1E3A5F]">
                  {inviteDetails?.firstName} {inviteDetails?.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-[#9C8466]" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-[#1E3A5F]">{inviteDetails?.email}</p>
              </div>
            </div>
            {inviteDetails?.role && (
              <div className="flex items-center gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                <ShieldCheck className="h-5 w-5 text-[#9C8466]" />
                <div>
                  <p className="text-xs text-gray-500">Your Role</p>
                  <p className="font-medium text-[#1E3A5F]">{getRoleDisplayName(inviteDetails.role)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auth Form - Sign Up or Sign In */}
        {!isSignedIn && (
          <div className="bg-white rounded-lg shadow-xl p-4">
            {/* Auth Mode Toggle */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => setAuthMode('signup')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  authMode === 'signup'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => setAuthMode('signin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  authMode === 'signin'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sign In
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 mb-4">
              {authMode === 'signup'
                ? 'Create your account to get started'
                : 'Already have an account? Sign in below'}
            </p>

            {authMode === 'signup' ? (
              <SignUp
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'shadow-none',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton:
                      'bg-white border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#F5F1E8]',
                    formButtonPrimary: 'bg-[#9C8466] hover:bg-[#8B7355] text-white',
                    formFieldInput:
                      'border-[#D1D5DB] focus:border-[#9C8466] focus:ring-[#9C8466]',
                    footerActionLink: 'text-[#9C8466] hover:text-[#8B7355]',
                  },
                }}
                initialValues={{
                  emailAddress: inviteDetails?.email,
                }}
                forceRedirectUrl={`/invite/${inviteId}`}
                fallbackRedirectUrl={`/invite/${inviteId}`}
              />
            ) : (
              <SignIn
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'shadow-none',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton:
                      'bg-white border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#F5F1E8]',
                    formButtonPrimary: 'bg-[#9C8466] hover:bg-[#8B7355] text-white',
                    formFieldInput:
                      'border-[#D1D5DB] focus:border-[#9C8466] focus:ring-[#9C8466]',
                    footerActionLink: 'text-[#9C8466] hover:text-[#8B7355]',
                  },
                }}
                forceRedirectUrl={`/invite/${inviteId}`}
                fallbackRedirectUrl={`/invite/${inviteId}`}
              />
            )}
          </div>
        )}

        {/* Already signed in but not accepted yet */}
        {isSignedIn && !accepted && (
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="py-6 text-center">
              <p className="text-gray-600 mb-4">
                Signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
              </p>
              <Button
                onClick={() => {
                  setIsAccepting(true)
                }}
                className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
              >
                Accept Invitation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
